"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Something went wrong.", "error");
      } else {
        setSent(true);
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
    setSubmitting(false);
  };

  if (sent) {
    return (
      <>
        <h2 className="auth-title">Check your email</h2>
        <p className="auth-description">
          If an account with that email exists, we&apos;ve sent a password reset link.
          Check your inbox and spam folder.
        </p>
        <Link href="/auth/login" className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="auth-title">Forgot your password?</h2>
      <p className="auth-description">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? <span className="auth-spinner" /> : "Send reset link"}
        </button>
      </form>
      <p className="auth-footer">
        Remember your password?{" "}
        <Link href="/auth/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </>
  );
}
