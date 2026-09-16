export type SignupValues = {
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type PasswordRequirements = {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialCharacter: boolean;
};

export type SignupValidation = {
  emailValid: boolean;
  passwordValid: boolean;
  passwordConfirmationValid: boolean;
  passwordRequirements: PasswordRequirements;
  complete: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(values: SignupValues): SignupValidation {
  const passwordRequirements = {
    minLength: values.password.length >= 8,
    hasLetter: /[A-Za-z]/.test(values.password),
    hasNumber: /\d/.test(values.password),
    hasSpecialCharacter: /[\p{P}\p{S}]/u.test(values.password),
  };
  const emailValid = EMAIL_PATTERN.test(values.email.trim());
  const passwordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordConfirmationValid =
    values.passwordConfirmation.length > 0 &&
    values.passwordConfirmation === values.password;

  return {
    emailValid,
    passwordValid,
    passwordConfirmationValid,
    passwordRequirements,
    complete: emailValid && passwordValid && passwordConfirmationValid,
  };
}

const passwordRequirementLabels: Record<keyof PasswordRequirements, string> = {
  minLength: "8자 이상",
  hasLetter: "영문",
  hasNumber: "숫자",
  hasSpecialCharacter: "특수문자",
};

export function getPasswordValidationMessage(
  requirements: PasswordRequirements
) {
  const missingRequirements = Object.entries(requirements)
    .filter(([, met]) => !met)
    .map(([requirement]) =>
      passwordRequirementLabels[requirement as keyof PasswordRequirements]
    );

  if (missingRequirements.length === 0) {
    return "안전한 비밀번호예요.";
  }

  return `다음 조건이 필요합니다: ${missingRequirements.join(", ")}.`;
}
