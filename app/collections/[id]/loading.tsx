export default function Loading() {
  return (
    <main className="museum-page" aria-busy="true" aria-live="polite">
      <p className="museum-kicker">나의 전시 공간</p>
      <h1 className="museum-display-title">컬렉션을 불러오는 중...</h1>
      <p className="museum-page-copy">잠시만 기다려주세요.</p>
    </main>
  );
}
