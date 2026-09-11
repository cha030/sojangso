"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("회원가입 요청이 완료되었습니다. 이메일을 확인해주세요.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-8 text-3xl font-bold">소장소 회원가입</h1>

      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border p-3"
          required
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border p-3"
          required
          minLength={6}
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-black p-3 text-white"
        >
          회원가입
        </button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}

      <Link href="/login" className="mt-6 text-sm underline">
        이미 계정이 있나요? 로그인
      </Link>
    </main>
  );
}