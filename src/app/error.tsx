"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0079bf",
      padding: 16,
    }}>
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: "40px 32px",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#172b4d", marginBottom: 12 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: "#5e6c84", marginBottom: 8 }}>
          {error.message}
        </p>
        <p style={{ fontSize: 12, color: "#8993a4", marginBottom: 20, wordBreak: "break-all" }}>
          {error.digest && `Digest: ${error.digest}`}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#0079bf",
            color: "white",
            border: "none",
            padding: "10px 24px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          Try again
        </button>
        <a
          href="/auth/login"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            border: "1px solid #dfe1e6",
            borderRadius: 6,
            fontSize: 14,
            color: "#172b4d",
            textDecoration: "none",
          }}
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
