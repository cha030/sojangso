"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import BrandMark from "@/app/brand-mark";
import {
  getPasswordValidationMessage,
  validateSignup,
} from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

type FieldName = "email" | "password" | "passwordConfirmation";
type FieldStatus = "success" | "error" | undefined;

const initialTouchedFields: Record<FieldName, boolean> = {
  email: false,
  password: false,
  passwordConfirmation: false,
};

function getFieldStatus(visible: boolean, valid: boolean): FieldStatus {
  if (!visible) return undefined;
  return valid ? "success" : "error";
}

function getSignupErrorMessage(error: { code?: string; message: string }) {
  const normalizedMessage = error.message.toLowerCase();

  if (
    error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    error.code === "identity_already_exists" ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "이미 가입된 이메일입니다.";
  }

  if (
    error.code === "email_address_invalid" ||
    normalizedMessage.includes("invalid email") ||
    normalizedMessage.includes("validate email")
  ) {
    return "이메일 형식이 올바르지 않습니다.";
  }

  if (
    error.code === "weak_password" ||
    normalizedMessage.includes("password")
  ) {
    return "비밀번호 조건을 확인해주세요.";
  }

  return "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [touchedFields, setTouchedFields] = useState(initialTouchedFields);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  const validation = validateSignup({
    email,
    password,
    passwordConfirmation,
  });
  const emailFeedbackVisible =
    submitted || touchedFields.email || email.length > 0;
  const passwordFeedbackVisible =
    submitted || touchedFields.password || password.length > 0;
  const passwordConfirmationFeedbackVisible =
    submitted ||
    touchedFields.passwordConfirmation ||
    passwordConfirmation.length > 0;
  const emailStatus = getFieldStatus(
    emailFeedbackVisible,
    validation.emailValid
  );
  const passwordStatus = getFieldStatus(
    passwordFeedbackVisible,
    validation.passwordValid
  );
  const passwordConfirmationStatus = getFieldStatus(
    passwordConfirmationFeedbackVisible,
    validation.passwordConfirmationValid
  );

  function markFieldTouched(field: FieldName) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function clearSignupMessage() {
    if (message) setMessage("");
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (signingUp) return;

    setSubmitted(true);
    const submittedValidation = validateSignup({
      email,
      password,
      passwordConfirmation,
    });

    if (!submittedValidation.complete) return;

    setSigningUp(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(getSignupErrorMessage(error));
        return;
      }

      window.location.assign(new URL("/", window.location.origin));
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
        <form
          onSubmit={handleSignup}
          className="museum-auth-form museum-signup-form"
          noValidate
        >
          <h2>회원가입</h2>
          <p className="museum-page-copy museum-signup-description">기록을 시작할 계정을 만들어보세요.</p>

          <label className="museum-form-field" htmlFor="signup-email">
            <span className="museum-form-label">이메일</span>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearSignupMessage();
              }}
              onBlur={() => markFieldTouched("email")}
              className={`museum-input${emailStatus ? ` museum-input-${emailStatus}` : ""}`}
              autoComplete="email"
              aria-invalid={emailStatus === "error"}
              aria-describedby={emailFeedbackVisible ? "signup-email-message" : undefined}
              required
            />
            {emailFeedbackVisible && (
              <small
                id="signup-email-message"
                className={`museum-field-message museum-field-message-${emailStatus}`}
                aria-live="polite"
              >
                {validation.emailValid
                  ? "사용할 수 있는 이메일 형식이에요."
                  : "이메일 형식이 올바르지 않습니다."}
              </small>
            )}
          </label>

          <label className="museum-form-field" htmlFor="signup-password">
            <span className="museum-form-label">비밀번호</span>
            <input
              id="signup-password"
              name="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearSignupMessage();
              }}
              onBlur={() => markFieldTouched("password")}
              className={`museum-input${passwordStatus ? ` museum-input-${passwordStatus}` : ""}`}
              autoComplete="new-password"
              aria-invalid={passwordStatus === "error"}
              aria-describedby="signup-password-message"
              required
              minLength={8}
            />
            <small
              id="signup-password-message"
              className={`museum-password-hint${passwordStatus ? ` museum-field-message-${passwordStatus}` : ""}`}
              aria-live="polite"
            >
              {passwordFeedbackVisible
                ? getPasswordValidationMessage(validation.passwordRequirements)
                : "영문, 숫자, 특수문자를 포함해 8자 이상"}
            </small>
          </label>

          <label
            className="museum-form-field"
            htmlFor="signup-password-confirmation"
          >
            <span className="museum-form-label">비밀번호 확인</span>
            <input
              id="signup-password-confirmation"
              name="passwordConfirmation"
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value);
                clearSignupMessage();
              }}
              onBlur={() => markFieldTouched("passwordConfirmation")}
              className={`museum-input${passwordConfirmationStatus ? ` museum-input-${passwordConfirmationStatus}` : ""}`}
              autoComplete="new-password"
              aria-invalid={passwordConfirmationStatus === "error"}
              aria-describedby={
                passwordConfirmationFeedbackVisible
                  ? "signup-password-confirmation-message"
                  : undefined
              }
              required
            />
            {passwordConfirmationFeedbackVisible && (
              <small
                id="signup-password-confirmation-message"
                className={`museum-field-message museum-field-message-${passwordConfirmationStatus}`}
                aria-live="polite"
              >
                {validation.passwordConfirmationValid
                  ? "비밀번호가 일치합니다."
                  : "비밀번호가 일치하지 않습니다."}
              </small>
            )}
          </label>

          <button
            type="submit"
            disabled={!validation.complete || signingUp}
            className="museum-primary-button museum-full-button"
          >
            {signingUp ? "처리 중..." : "회원가입"}
          </button>

          {message && <p className="museum-inline-error" role="alert">{message}</p>}

          <Link href="/login" className="museum-auth-link">
            이미 계정이 있나요? <u>로그인</u>
          </Link>
        </form>
      </section>
    </main>
  );
}
