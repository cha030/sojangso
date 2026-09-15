create table public.ai_rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (
    action in ('analyze-item', 'analyze-collection', 'research-item')
  ),
  created_at timestamptz not null default pg_catalog.clock_timestamp()
);

create index ai_rate_limit_events_user_action_created_at_idx
  on public.ai_rate_limit_events (user_id, action, created_at);

alter table public.ai_rate_limit_events enable row level security;

revoke all privileges on table public.ai_rate_limit_events
  from public, anon, authenticated;
revoke all privileges on sequence public.ai_rate_limit_events_id_seq
  from public, anon, authenticated;

create or replace function public.consume_ai_rate_limit(p_action text)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, auth
as $function$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_action_limit integer;
  v_action_count integer;
  v_action_oldest timestamptz;
  v_daily_count integer;
  v_daily_oldest timestamptz;
  v_retry_after_seconds integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  case p_action
    when 'analyze-item' then
      v_action_limit := 20;
    when 'analyze-collection' then
      v_action_limit := 10;
    when 'research-item' then
      v_action_limit := 10;
    else
      raise exception 'Unsupported AI rate-limit action.' using errcode = '22023';
  end case;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  delete from public.ai_rate_limit_events
  where user_id = v_user_id
    and created_at <= v_now - interval '24 hours';

  select pg_catalog.count(*)::integer, pg_catalog.min(created_at)
  into v_action_count, v_action_oldest
  from public.ai_rate_limit_events
  where user_id = v_user_id
    and action = p_action
    and created_at > v_now - interval '10 minutes';

  select pg_catalog.count(*)::integer, pg_catalog.min(created_at)
  into v_daily_count, v_daily_oldest
  from public.ai_rate_limit_events
  where user_id = v_user_id
    and created_at > v_now - interval '24 hours';

  if v_action_count >= v_action_limit then
    v_retry_after_seconds := greatest(
      v_retry_after_seconds,
      ceil(
        extract(
          epoch from (v_action_oldest + interval '10 minutes' - v_now)
        )
      )::integer
    );
  end if;

  if v_daily_count >= 100 then
    v_retry_after_seconds := greatest(
      v_retry_after_seconds,
      ceil(
        extract(
          epoch from (v_daily_oldest + interval '24 hours' - v_now)
        )
      )::integer
    );
  end if;

  if v_retry_after_seconds > 0 then
    return query select false, greatest(1, v_retry_after_seconds);
    return;
  end if;

  insert into public.ai_rate_limit_events (user_id, action, created_at)
  values (v_user_id, p_action, v_now);

  return query select true, 0;
end;
$function$;

revoke all privileges on function public.consume_ai_rate_limit(text)
  from public, anon;
grant execute on function public.consume_ai_rate_limit(text)
  to authenticated;
