"use client";

import React from "react";

interface Props {
  password: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#e74c3c" };
  if (score <= 2) return { score, label: "Fair", color: "#f39c12" };
  if (score <= 3) return { score, label: "Good", color: "#3498db" };
  return { score, label: "Strong", color: "#27ae60" };
}

export default function PasswordStrength({ password }: Props) {
  if (!password) return null;

  const { score, label, color } = getStrength(password);
  const width = `${(score / 5) * 100}%`;

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className="password-strength-fill"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <span className="password-strength-label" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
