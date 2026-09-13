"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import BrandMark from "@/app/brand-mark";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (signingUp) return;

    setSigningUp(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("회원가입 요청이 완료되었습니다. 이메일을 확인해주세요.");
    } catch {
      setMessage("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSigningUp(false);
    }
  }

  return (
    <main className="museum-auth-page">
      <section className="museum-auth-story">
        <BrandMark priority />
        <div className="museum-auth-copy">
          <p className="museum-kicker">첫 수집을 시작하기 전에</p>
          <h1>나만의 전시 공간을<br />시작해보세요.</h1>
          <p>소중한 수집물이 하나의 이야기로 이어지는 공간입니다.</p>
        </div>
      </section>

      <section className="museum-auth-form-wrap">
        <form onSubmit={handleSignup} className="museum-auth-form">
          <p className="museum-kicker">소장소 입장 등록</p>
          <h2>회원가입</h2>
          <p className="museum-page-copy">기록을 시작할 계정을 만들어보세요.</p>

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
              minLength={6}
            />
            <small className="museum-page-copy">6자 이상 입력해주세요.</small>
          </label>

          <button
            type="submit"
            disabled={signingUp}
            className="museum-primary-button museum-full-button"
          >
            {signingUp ? "처리 중..." : "회원가입"}
          </button>

          {message && <p className="museum-inline-error" role="status">{message}</p>}

          <Link href="/login" className="museum-auth-link">
            이미 계정이 있나요? <u>로그인</u>
          </Link>
        </form>
      </section>
    </main>
  );
}
