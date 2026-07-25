"use client";

import React, { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error Boundary captured error:", error);
  }, [error]);

  return (
    <div
      style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
        maxWidth: "600px",
        margin: "4rem auto",
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "16px",
      }}
    >
      <i
        className="fa-solid fa-triangle-exclamation"
        style={{ fontSize: "2.5rem", color: "var(--color-danger, #ef4444)", marginBottom: "1rem" }}
      />
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "var(--color-text-dark-secondary, #cbd5e1)", marginBottom: "1.5rem" }}>
        {error?.message || "An unexpected error occurred while rendering this section."}
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "0.6rem 1.25rem",
          backgroundColor: "var(--color-primary, #6366f1)",
          color: "#fff",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <i className="fa-solid fa-rotate-right" style={{ marginRight: "0.5rem" }} />
        Try Again
      </button>
    </div>
  );
}
