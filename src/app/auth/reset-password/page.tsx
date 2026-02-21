"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import PasswordStrength from "@/components/PasswordStrength";

function ResetPasswordInner() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();
  const router = useRouter();

  if (!token) {
    return (
      <>
        <h2 className="auth-title">Invalid reset link</h2>
        <p className="auth-description">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/auth/forgot-password" className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
          Request a new link
        </Link>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast("Password must be at least 8 characters.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Something went wrong.", "error");
      } else {
        toast("Password reset successfully! Please sign in.", "success");
        router.push("/auth/login");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
    setSubmitting(false);
  };

  return (
    <>
      <h2 className="auth-title">Set new password</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="password">New password</label>
          <div className="auth-password-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              autoFocus
              minLength={8}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? <span className="auth-spinner" /> : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: 32 }}><span className="auth-spinner" style={{ width: 32, height: 32 }} /></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
