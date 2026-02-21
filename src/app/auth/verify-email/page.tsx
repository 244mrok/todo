"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          await refreshUser();
        } else {
          const data = await res.json();
          setStatus("error");
          setErrorMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      });
  }, [token, refreshUser]);

  if (status === "verifying") {
    return (
      <>
        <h2 className="auth-title">Verifying your email...</h2>
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <span className="auth-spinner" style={{ width: 32, height: 32 }} />
        </div>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <h2 className="auth-title">Email verified!</h2>
        <p className="auth-description">
          Your email has been verified successfully. You can now enjoy all features.
        </p>
        <Link href="/" className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
          Go to Task Board
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="auth-title">Verification failed</h2>
      <p className="auth-description">{errorMessage}</p>
      <Link href="/" className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
        Go to Task Board
      </Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: 32 }}><span className="auth-spinner" style={{ width: 32, height: 32 }} /></div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
