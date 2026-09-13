import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "소장소 UI 디자인 시안",
  description: "소장소 디지털 박물관 UI 디자인 preview",
};

const artworkImages = [
  "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1594784054224-12dca5f05cc9?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1607453998774-d533f65dac99?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1560961911-ba7ef651a56c?auto=format&fit=crop&w=1200&q=85",
];

const previewLinks = [
  ["01", "로그인", "login"],
  ["02", "회원가입", "signup"],
  ["03", "내 컬렉션", "home"],
  ["04", "컬렉션 상세", "collection"],
  ["05", "수집물 상세", "item"],
  ["06", "수집물 수정", "edit"],
  ["07", "새 컬렉션", "new-collection"],
  ["08", "새 수집물", "new-item"],
] as const;

function artworkStyle(index: number): CSSProperties {
  return { backgroundImage: `url(${artworkImages[index % artworkImages.length]})` };
}

function MuseumHeader({ back }: { back?: boolean }) {
  return (
    <header className={styles.museumHeader}>
      <div className={styles.headerSide}>
        {back && (
          <button type="button" className={styles.textButton}>
            <span aria-hidden="true">←</span> 뒤로
          </button>
        )}
      </div>
      <div className={styles.headerBrand}>
        <span>SOJANGSO</span>
      </div>
      <div className={`${styles.headerSide} ${styles.headerSideEnd}`}>
        <button type="button" className={styles.textButton}>
          로그아웃
        </button>
      </div>
    </header>
  );
}

function PreviewSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.previewSection}>
      <div className={styles.previewCaption}>
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.roomFrame}>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  type = "text",
  note,
}: {
  label: string;
  value: string;
  type?: "text" | "password";
  note?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={type} defaultValue={value} aria-label={label} />
      {note && <small>{note}</small>}
    </label>
  );
}

function ExhibitionCard({
  number,
  title,
  category,
  count,
  goal,
  image,
}: {
  number: string;
  title: string;
  category: string;
  count: number;
  goal?: number;
  image: number;
}) {
  const progress = goal ? Math.round((count / goal) * 100) : null;

  return (
    <article className={styles.exhibitionCard}>
      <div
        className={styles.exhibitionImage}
        style={artworkStyle(image)}
        role="img"
        aria-label={`${title} 컬렉션 대표 이미지`}
      >
        <span>{number}</span>
      </div>
      <div className={styles.exhibitionInfo}>
        <p className={styles.overline}>{category}</p>
        <h3>{title}</h3>
        <div className={styles.cardMeta}>
          <span>{goal ? `${count} / ${goal}` : `${count}개 보유`}</span>
          {progress !== null && <strong>{progress}%</strong>}
        </div>
        {progress !== null && (
          <div className={styles.progressTrack}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}

function DetailLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailLabel}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function DesignPreviewPage() {
  return (
    <main className={styles.previewRoot}>
      <style>{`body > header { display: none; }`}</style>

      <aside className={styles.previewRail}>
        <div className={styles.railBrand}>
          <div>
            <strong>SOJANGSO</strong>
            <span>공간 디자인 시안</span>
          </div>
        </div>

        <div className={styles.railCopy}>
          <p>나의 수집이 전시가 되는 곳</p>
          <h1>나만의<br />디지털 박물관</h1>
        </div>

        <nav className={styles.previewNav} aria-label="시안 화면 바로가기">
          {previewLinks.map(([number, label, id]) => (
            <a key={id} href={`#${id}`}>
              <span>{number}</span>
              {label}
            </a>
          ))}
        </nav>

        <p className={styles.railNote}>DESIGN PREVIEW · 2026</p>
      </aside>

      <div className={styles.previewContent}>
        <header className={styles.previewHero}>
          <p className={styles.kicker}>소장소 공간 디자인 시안</p>
          <h1>모으는 시간부터<br />감상하는 순간까지.</h1>
          <p>
            수집물의 사진과 기록을 전시의 주인공으로 만드는 현대적인
            개인 박물관 인터페이스입니다.
          </p>
        </header>

        <section className={styles.systemSection}>
          <div className={styles.sectionHeading}>
            <span>00</span>
            <div>
              <h2>공통 디자인 시스템</h2>
              <p>Quiet gallery, warm archive, clear interaction.</p>
            </div>
          </div>

          <div className={styles.systemGrid}>
            <article>
              <p className={styles.systemLabel}>COLOR PALETTE</p>
              <div className={styles.swatches}>
                {[
                  ["Museum Ink", "#292620", styles.swatchInk],
                  ["Gallery Umber", "#4D483E", styles.swatchGreen],
                  ["Warm Light", "#C49659", styles.swatchBrass],
                  ["Museum Gray", "#777064", styles.swatchMuted],
                  ["Warm Wall", "#EBE3D6", styles.swatchCanvas],
                  ["Label Paper", "#FAF7F0", styles.swatchPaper],
                  ["Display Niche", "#EEE7DB", styles.swatchLabel],
                  ["Danger", "#9E4338", styles.swatchDanger],
                ].map(([name, value, className]) => (
                  <div key={name} className={styles.swatchItem}>
                    <span className={className} />
                    <div><strong>{name}</strong><small>{value}</small></div>
                  </div>
                ))}
              </div>
            </article>

            <article>
              <p className={styles.systemLabel}>TYPE SCALE</p>
              <p className={styles.displaySample}>나의 전시 기록</p>
              <p className={styles.titleSample}>포켓몬 피규어 컬렉션</p>
              <p className={styles.bodySample}>수집물의 이름과 이야기를 차분하게 기록합니다.</p>
              <p className={styles.captionSample}>수집물 024 · 피규어</p>
              <small className={styles.typeNote}>Display 56 · Title 28 · Body 14 · Label 10</small>
            </article>

            <article>
              <p className={styles.systemLabel}>FOUNDATION</p>
              <dl className={styles.ruleList}>
                <div><dt>Radius</dt><dd>10 / 16 / 24px</dd></div>
                <div><dt>Spacing</dt><dd>4px 단위, 주요 간격 24–48px</dd></div>
                <div><dt>Border</dt><dd>1px, 정보 구획과 액자에만 사용</dd></div>
                <div><dt>Shadow</dt><dd>낮고 넓게, 떠 있는 전시 카드에만 사용</dd></div>
                <div><dt>Photo</dt><dd>카드 4:3 · 슬롯 1:1 · 상세 4:5</dd></div>
                <div><dt>Desktop</dt><dd>최대 1100px · 2–4열 전시</dd></div>
                <div><dt>Mobile</dt><dd>20px 여백 · 1–3열 · 44px 터치</dd></div>
              </dl>
            </article>

            <article className={styles.stateCard}>
              <p className={styles.systemLabel}>INTERACTION</p>
              <div className={styles.stateButtons}>
                <button type="button" className={styles.primaryButton}>Primary</button>
                <button type="button" className={styles.secondaryButton}>Secondary</button>
                <button type="button" className={styles.dangerButton}>Danger</button>
                <button type="button" className={styles.primaryButton} disabled>Disabled</button>
              </div>
              <p>Hover는 부드러운 상승과 명도 변화, active는 0.98 축소, focus는 2px 외곽선으로 통일합니다.</p>
            </article>
          </div>
        </section>

        <div className={styles.screenStack}>
          <PreviewSection
            id="login"
            number="01"
            title="로그인"
            description="조용한 로비에서 나의 박물관으로 입장하는 첫 화면"
          >
            <div className={`${styles.screen} ${styles.authScreen}`}>
              <section className={styles.authStory}>
                <div className={styles.authBrand}><span>SOJANGSO</span></div>
                <div>
                  <p className={styles.lightOverline}>나의 수집 공간</p>
                  <h3>모아온 시간들이<br />하나의 전시가 됩니다.</h3>
                  <p>당신의 수집을 가장 당신다운 방식으로 기록하고 감상하세요.</p>
                </div>
                <span className={styles.entryNumber}>01</span>
              </section>
              <section className={styles.authFormWrap}>
                <form className={styles.authForm}>
                  <p className={styles.overline}>다시 만나 반가워요</p>
                  <h2>소장소 로그인</h2>
                  <p className={styles.formIntro}>나만의 디지털 박물관에 입장하세요.</p>
                  <Field label="이메일" value="collector@example.com" />
                  <Field label="비밀번호" value="museum" type="password" />
                  <button type="button" className={styles.primaryButton}>로그인</button>
                  <p className={styles.formLink}>계정이 없나요? <u>회원가입</u></p>
                </form>
              </section>
            </div>
          </PreviewSection>

          <PreviewSection
            id="signup"
            number="02"
            title="회원가입"
            description="두 개의 실제 입력 필드만 사용하는 간결한 입장 등록"
          >
            <div className={`${styles.screen} ${styles.authScreen}`}>
              <section className={`${styles.authStory} ${styles.ticketStory}`}>
                <div className={styles.authBrand}><span>SOJANGSO</span></div>
                <div className={styles.roomStudy} aria-hidden="true">
                  <span />
                  <div><i /><i /><i /></div>
                  <span />
                </div>
                <span className={styles.entryNumber}>02</span>
              </section>
              <section className={styles.authFormWrap}>
                <form className={styles.authForm}>
                  <p className={styles.overline}>첫 수집을 시작하기 전에</p>
                  <h2>입장 등록</h2>
                  <p className={styles.formIntro}>기록을 시작할 계정을 만들어보세요.</p>
                  <Field label="이메일" value="collector@example.com" />
                  <Field label="비밀번호" value="museum" type="password" note="6자 이상 입력해주세요." />
                  <button type="button" className={styles.primaryButton}>회원가입</button>
                  <p className={styles.formLink}>이미 계정이 있나요? <u>로그인</u></p>
                </form>
              </section>
            </div>
          </PreviewSection>

          <PreviewSection
            id="home"
            number="03"
            title="소장소 메인 / 내 컬렉션"
            description="각 컬렉션을 독립된 전시관처럼 탐색하는 박물관 로비"
          >
            <div className={styles.screen}>
              <MuseumHeader />
              <div className={styles.pageBody}>
                <div className={styles.pageTitleRow}>
                  <div>
                    <p className={styles.overline}>3개의 컬렉션</p>
                    <h2>내 컬렉션</h2>
                    <p>좋아하는 것을 모으는 즐거움</p>
                  </div>
                  <button type="button" className={styles.primaryButton}>+ 새 컬렉션 만들기</button>
                </div>

                <div className={styles.exhibitionGrid}>
                  <ExhibitionCard number="01" title="포켓몬 피규어" category="피규어" count={12} goal={30} image={0} />
                  <ExhibitionCard number="02" title="오래된 게임" category="게임" count={8} goal={12} image={1} />
                  <ExhibitionCard number="03" title="좋아하는 신발" category="신발" count={6} image={2} />
                </div>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            id="collection"
            number="04"
            title="컬렉션 상세 / 전체 수집물"
            description="목표 슬롯이 한 벽면의 전시 리듬처럼 이어지는 컬렉션 공간"
          >
            <div className={styles.screen}>
              <MuseumHeader back />
              <div className={styles.pageBody}>
                <div className={styles.collectionHero}>
                  <div>
                    <p className={styles.overline}>피규어 컬렉션</p>
                    <h2>포켓몬 피규어</h2>
                    <p>여행지에서 하나씩 모아온 작은 포켓몬들</p>
                  </div>
                  <div className={styles.progressSeal}>
                    <strong>2</strong><span>/ 8</span><small>25% 채움</small>
                  </div>
                </div>
                <div className={styles.wideProgress}><span style={{ width: "25%" }} /></div>

                <div className={styles.collectionWall}>
                  {[0, 3].map((image, index) => (
                    <article key={image} className={styles.artworkSlot}>
                      <div style={artworkStyle(image)} role="img" aria-label="수집물 예시 이미지" />
                      <p><span>수집물 {String(index + 1).padStart(3, "0")}</span>{index === 0 ? "피카츄 스태츄" : "뮤 캡슐 토이"}</p>
                    </article>
                  ))}
                  {Array.from({ length: 6 }, (_, index) => (
                    <button key={index} type="button" className={styles.emptySlot}>
                      <span>+</span><small>비어 있는 자리 {String(index + 3).padStart(2, "0")}</small>
                    </button>
                  ))}
                </div>

                <section className={styles.analysisPanel}>
                  <div><p className={styles.overline}>수집을 바라보는 새로운 시선</p><h3>내 수집 분석</h3></div>
                  <div>
                    <button type="button" className={styles.secondaryButton} disabled>내 수집 분석</button>
                    <p>수집물을 3개 이상 등록하면 내 수집을 분석해드려요.</p>
                  </div>
                </section>

                <section className={styles.descriptionPanel}>
                  <p className={styles.overline}>이 컬렉션에 대하여</p>
                  <h3>컬렉션 설명</h3>
                  <p>여행지에서 하나씩 모아온 작은 포켓몬들</p>
                </section>

                <div className={styles.dangerZone}>
                  <div><strong>컬렉션 삭제</strong><span>컬렉션과 모든 수집물을 삭제합니다.</span></div>
                  <button type="button" className={styles.dangerButton}>컬렉션 삭제</button>
                </div>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            id="item"
            number="05"
            title="수집물 상세"
            description="한 점의 수집물에 집중하는 작품 감상과 정보 라벨"
          >
            <div className={styles.screen}>
              <MuseumHeader back />
              <div className={`${styles.pageBody} ${styles.itemDetailLayout}`}>
                <section className={styles.itemVisualColumn}>
                  <p className={styles.overline}>수집물 001</p>
                  <div className={styles.heroArtwork} style={artworkStyle(0)} role="img" aria-label="피카츄 스태츄 예시 이미지">
                    <span>01 / 12</span>
                  </div>
                </section>
                <section className={styles.itemInformation}>
                  <p className={styles.overline}>포켓몬 피규어</p>
                  <h2>피카츄 스태츄</h2>
                  <dl className={styles.detailList}>
                    <DetailLabel label="캐릭터" value="피카츄" />
                    <DetailLabel label="작품 / 시리즈" value="포켓몬스터" />
                    <DetailLabel label="제조사" value="반프레스토" />
                    <DetailLabel label="버전 / 에디션" value="25주년 에디션" />
                    <DetailLabel label="설명" value="도쿄 여행에서 발견해 컬렉션에 처음 등록한 수집물입니다." />
                  </dl>
                  <button type="button" className={styles.primaryButton}>수정하기</button>
                  <button type="button" className={styles.dangerTextButton}>수집물 삭제</button>
                </section>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            id="edit"
            number="06"
            title="수집물 수정"
            description="전시 정보 점검 상태를 선명하게 드러내는 편집 화면"
          >
            <div className={styles.screen}>
              <MuseumHeader back />
              <div className={`${styles.pageBody} ${styles.editLayout}`}>
                <aside className={styles.editArtworkWrap}>
                  <div className={styles.editBadge}><span /> 현재 편집 중</div>
                  <div className={styles.editArtwork} style={artworkStyle(0)} role="img" aria-label="피카츄 스태츄 예시 이미지" />
                  <p>수집물 001</p>
                </aside>
                <form className={styles.editForm}>
                  <p className={styles.overline}>전시 정보를 점검하고 있습니다</p>
                  <h2>수집물 정보 수정</h2>
                  <div className={styles.twoColumnFields}>
                    <Field label="이름" value="피카츄 스태츄" />
                    <Field label="캐릭터" value="피카츄" />
                    <Field label="작품 / 시리즈" value="포켓몬스터" />
                    <Field label="제조사" value="반프레스토" />
                    <Field label="버전 / 에디션" value="25주년 에디션" />
                  </div>
                  <label className={styles.field}>
                    <span>설명</span>
                    <textarea defaultValue="도쿄 여행에서 발견해 컬렉션에 처음 등록한 수집물입니다." />
                  </label>
                  <div className={styles.formActions}>
                    <button type="button" className={styles.secondaryButton}>취소</button>
                    <button type="button" className={styles.primaryButton}>수정 저장</button>
                  </div>
                </form>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            id="new-collection"
            number="07"
            title="새 컬렉션 만들기"
            description="새로운 전시 구역의 필수 정보와 선택 정보를 단계적으로 정리"
          >
            <div className={styles.screen}>
              <MuseumHeader back />
              <div className={styles.formPageBody}>
                <div className={styles.formPageIntro}>
                  <p className={styles.overline}>새로운 수집 공간 구성</p>
                  <h2>새 컬렉션</h2>
                  <p>어떤 수집을 시작할지 알려주세요. 이 정보가 새로운 전시 구역의 기본이 됩니다.</p>
                </div>
                <form className={styles.collectionForm}>
                  <section className={styles.formSection}>
                    <div className={styles.formSectionTitle}><span>01</span><div><h3>필수 정보</h3><p>컬렉션의 이름과 종류를 정합니다.</p></div></div>
                    <Field label="컬렉션 이름" value="포켓몬 피규어" />
                    <label className={styles.field}><span>카테고리</span><select defaultValue="figure"><option value="figure">피규어</option><option>게임</option><option>신발</option><option>레고</option><option>기타</option></select></label>
                  </section>

                  <section className={styles.formSection}>
                    <div className={styles.formSectionTitle}><span>02</span><div><h3>선택 정보</h3><p>수집의 목표와 이야기를 기록합니다.</p></div></div>
                    <Field label="목표 개수" value="30" />
                    <label className={styles.field}><span>설명</span><textarea defaultValue="여행지에서 하나씩 모아온 작은 포켓몬들" /></label>
                  </section>

                  <section className={styles.formSection}>
                    <div className={styles.formSectionTitle}><span>03</span><div><h3>추가로 확인할 정보</h3><p>수집물이 식별된 후 더 확인할 정보를 선택합니다.</p></div></div>
                    <div className={styles.checkboxGrid}>
                      {[["최초 출시가격", true, false], ["출시연도", false, false], ["모델 / 제품번호", false, false], ["제조사", false, true]] .map(([label, checked, disabled]) => (
                        <label key={String(label)} className={disabled ? styles.disabledCheck : ""}><input type="checkbox" defaultChecked={Boolean(checked)} disabled={Boolean(disabled)} /><span>{label}</span></label>
                      ))}
                    </div>
                  </section>

                  <section className={styles.formSection}>
                    <div className={styles.formSectionTitle}><span>04</span><div><h3>직접 기록할 항목</h3><p>AI가 알 수 없는 개인 정보를 추가합니다.</p></div></div>
                    <div className={styles.inlineField}><input defaultValue="구매 장소" aria-label="직접 기록할 항목" /><button type="button" className={styles.secondaryButton}>+</button></div>
                    <div className={styles.addedField}><span>구매 장소</span><button type="button" aria-label="구매 장소 삭제">×</button></div>
                  </section>
                  <button type="button" className={styles.primaryButton}>컬렉션 만들기</button>
                </form>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            id="new-item"
            number="08"
            title="새 수집물 추가"
            description="사진 등록부터 분석·확인·저장까지 하나의 입고 기록으로 연결"
          >
            <div className={styles.screen}>
              <MuseumHeader back />
              <div className={styles.pageBody}>
                <div className={styles.intakeHeader}>
                  <div><p className={styles.overline}>새로운 수집물 등록</p><h2>새 수집물 추가</h2><p>포켓몬 피규어</p></div>
                </div>

                <div className={styles.intakeLayout}>
                  <section className={styles.uploadColumn}>
                    <div className={styles.uploadArtwork} style={artworkStyle(3)} role="img" aria-label="뮤 캡슐 토이 업로드 예시 이미지">
                      <div><span>등록할 이미지</span><strong>업로드 완료</strong></div>
                    </div>
                    <div className={styles.uploadActions}><button type="button" className={styles.secondaryButton}>사진 찍기</button><button type="button" className={styles.secondaryButton}>사진 업로드</button></div>
                    <div className={styles.aiStatus}><span>AI</span><div><strong>수집물 정보 확인이 완료되었습니다.</strong><p>사진 분석과 추가 정보 확인 결과를 자유롭게 수정할 수 있어요.</p></div></div>
                  </section>

                  <form className={styles.intakeForm}>
                    <div className={styles.intakeSectionTitle}><span>분석 결과 확인</span><strong>수집물 정보</strong></div>
                    <Field label="이름" value="뮤 캡슐 토이" />
                    <div className={styles.twoColumnFields}>
                      <Field label="캐릭터" value="뮤" />
                      <Field label="작품 / 시리즈" value="포켓몬스터" />
                      <Field label="제조사" value="타카라토미" note="AI 추정" />
                      <Field label="버전 / 에디션" value="몬콜레" />
                      <Field label="최초 출시가격" value="" note="확인하지 못함 · 직접 입력해주세요" />
                      <Field label="구매 장소" value="" note="직접 기록하는 항목" />
                    </div>
                    <label className={styles.field}><span>설명</span><textarea defaultValue="작은 크기의 뮤 캡슐 토이 피규어입니다." /></label>
                    <div className={styles.miscField}><span>기타 항목</span><div className={styles.inlineField}><input placeholder="예: 구매 가격" aria-label="기타 항목" /><button type="button" className={styles.secondaryButton}>+</button></div></div>
                    <button type="button" className={styles.primaryButton}>컬렉션에 저장</button>
                  </form>
                </div>
              </div>
            </div>
          </PreviewSection>
        </div>
      </div>
    </main>
  );
}
