"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary captured error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "3rem 1.5rem",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "600px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "16px",
            padding: "2.5rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          }}
        >
          <i
            className="fa-solid fa-triangle-exclamation"
            style={{ fontSize: "2.5rem", color: "#ef4444", marginBottom: "1rem" }}
          />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#64748b", marginBottom: "1.5rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {error?.message || "An unexpected error occurred while rendering this page."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.6rem 1.25rem",
              backgroundColor: "#6366f1",
              color: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="fa-solid fa-rotate-right" />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
