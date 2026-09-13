"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  buttonLabel: string;
  title: string;
  description?: string;
  endpoint: string;
  redirectTo: string;
};

export default function DeleteConfirmation({
  buttonLabel,
  title,
  description,
  endpoint,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  function openConfirmation() {
    setMessage("");
    setIsConfirming(true);
  }

  function closeConfirmation() {
    if (isDeleting) return;

    setMessage("");
    setIsConfirming(false);
  }

  async function handleDelete() {
    if (isDeleting) return;

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        setMessage(
          result?.message ?? "삭제하지 못했습니다. 다시 시도해주세요."
        );
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setMessage("삭제하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={openConfirmation}
        className="museum-danger-button museum-full-button"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirmation-title"
      aria-describedby={description ? "delete-confirmation-description" : undefined}
      className="museum-delete-confirmation"
    >
      <p id="delete-confirmation-title">
        {title}
      </p>

      {description && (
        <p
          id="delete-confirmation-description"
          className="museum-delete-description"
        >
          {description}
        </p>
      )}

      {message && (
        <p aria-live="polite" className="museum-inline-error">
          {message}
        </p>
      )}

      <div className="museum-delete-actions">
        <button
          type="button"
          onClick={closeConfirmation}
          disabled={isDeleting}
          className="museum-secondary-button"
        >
          취소
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="museum-danger-button"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
