import React from "react";

export default function DashboardLoading() {
  return (
    <div style={{ padding: "2rem", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Skeleton */}
      <div
        style={{
          height: "36px",
          width: "240px",
          borderRadius: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          marginBottom: "1rem",
          animation: "pulse 1.5s infinite ease-in-out",
        }}
      />
      <div
        style={{
          height: "18px",
          width: "360px",
          borderRadius: "6px",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          marginBottom: "2rem",
          animation: "pulse 1.5s infinite ease-in-out",
        }}
      />

      {/* Cards Grid Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: "120px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              animation: "pulse 1.5s infinite ease-in-out",
            }}
          >
            <div
              style={{
                height: "16px",
                width: "40%",
                borderRadius: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            />
            <div
              style={{
                height: "28px",
                width: "60%",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Large Content Section Skeleton */}
      <div
        style={{
          height: "340px",
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          animation: "pulse 1.5s infinite ease-in-out",
        }}
      />
    </div>
  );
}
