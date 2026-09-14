"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import BrandMark from "@/app/brand-mark";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (loggingIn) return;

    setLoggingIn(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.assign(new URL("/", window.location.origin));
    } catch {
      setMessage("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <main className="museum-auth-page">
      <section className="museum-auth-story">
        <BrandMark priority />
        <div className="museum-auth-copy">
          <p className="museum-kicker">나의 수집 공간</p>
          <h1>모아온 시간들이<br />하나의 전시가 됩니다.</h1>
          <p>당신의 수집을 가장 당신다운 방식으로 기록하고 감상하세요.</p>
        </div>
      </section>

      <section className="museum-auth-form-wrap">
        <form onSubmit={handleLogin} className="museum-auth-form">
          <h2>소장소 로그인</h2>
          <p className="museum-page-copy">나만의 디지털 박물관에 입장하세요.</p>

          <label className="museum-form-field">
            <span className="museum-form-label">이메일</span>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="museum-input"
              required
            />
          </label>

          <label className="museum-form-field">
            <span className="museum-form-label">비밀번호</span>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="museum-input"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loggingIn}
            className="museum-primary-button museum-full-button"
          >
            {loggingIn ? "로그인 중..." : "로그인"}
          </button>

          {message && <p className="museum-inline-error" role="status">{message}</p>}

          <Link href="/signup" className="museum-auth-link">
            계정이 없나요? <u>회원가입</u>
          </Link>
        </form>
      </section>
    </main>
  );
}
