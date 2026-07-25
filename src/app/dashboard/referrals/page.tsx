"use client";

import React, { useState, useEffect, useMemo } from "react";

interface ReferralData {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  position: string;
  referrerName: string;
  status: "Submitted" | "Interviewing" | "Hired" | "Paid" | "Rejected";
  rewardAmount: number;
  payoutStatus: "Pending" | "Approved" | "Paid";
  notes?: string;
  createdAt: string;
}

const STAGES: Array<ReferralData["status"]> = [
  "Submitted",
  "Interviewing",
  "Hired",
  "Paid",
  "Rejected",
];

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    phone: "",
    position: "",
    rewardAmount: 500,
    notes: "",
  });

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/referrals");
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error("Failed to fetch referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          candidateName: "",
          candidateEmail: "",
          phone: "",
          position: "",
          rewardAmount: 500,
          notes: "",
        });
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit referral");
      }
    } catch (err) {
      console.error("Submit referral error:", err);
    }
  };

  const handleUpdateStage = async (id: string, newStatus: ReferralData["status"]) => {
    try {
      // Auto-update payoutStatus to Approved when Hired, or Paid when Paid
      let payoutStatusUpdate: ReferralData["payoutStatus"] | undefined = undefined;
      if (newStatus === "Hired") payoutStatusUpdate = "Approved";
      if (newStatus === "Paid") payoutStatusUpdate = "Paid";

      const res = await fetch(`/api/referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(payoutStatusUpdate && { payoutStatus: payoutStatusUpdate }),
        }),
      });

      if (res.ok) {
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update stage");
      }
    } catch (err) {
      console.error("Update stage error:", err);
    }
  };

  const handleDeleteReferral = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referral record?")) return;
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete referral");
      }
    } catch (err) {
      console.error("Delete referral error:", err);
    }
  };

  // Filtered list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesSearch =
        r.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referrerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "All" || r.status === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [referrals, searchQuery, stageFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = referrals.length;
    const hired = referrals.filter((r) => r.status === "Hired" || r.status === "Paid").length;
    const totalPayouts = referrals
      .filter((r) => r.status === "Paid")
      .reduce((acc, r) => acc + (r.rewardAmount || 0), 0);
    const pendingPayouts = referrals
      .filter((r) => r.status === "Hired" && r.payoutStatus !== "Paid")
      .reduce((acc, r) => acc + (r.rewardAmount || 0), 0);

    return { total, hired, totalPayouts, pendingPayouts };
  }, [referrals]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Referral & Payout Pipeline
          </h1>
          <p style={{ color: "var(--color-text-dark-secondary, #cbd5e1)", fontSize: "0.95rem" }}>
            Track candidate pipeline stages (Submitted → Interviewing → Hired → Paid) and reward payouts.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "0.65rem 1.25rem",
            backgroundColor: "var(--color-primary, #6366f1)",
            color: "#fff",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
          }}
        >
          <i className="fa-solid fa-user-plus" />
          Submit Referral
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Total Referrals
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {metrics.total}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Hired Candidates
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#10b981" }}>
            {metrics.hired}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Pending Reward Payouts
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#f59e0b" }}>
            ${metrics.pendingPayouts.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Total Rewards Paid
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#6366f1" }}>
            ${metrics.totalPayouts.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Stage Filter Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          padding: "0.85rem 1.25rem",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search candidate, role, or referrer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              color: "#fff",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setStageFilter("All")}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: stageFilter === "All" ? "var(--color-primary, #6366f1)" : "rgba(255, 255, 255, 0.06)",
              color: "#fff",
            }}
          >
            All ({referrals.length})
          </button>
          {STAGES.map((stg) => {
            const count = referrals.filter((r) => r.status === stg).length;
            return (
              <button
                key={stg}
                onClick={() => setStageFilter(stg)}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: stageFilter === stg ? "var(--color-primary, #6366f1)" : "rgba(255, 255, 255, 0.06)",
                  color: stageFilter === stg ? "#fff" : "#cbd5e1",
                }}
              >
                {stg} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Referrals Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }} />
          <p>Loading candidate referrals...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
          }}
        >
          <i className="fa-solid fa-user-xmark" style={{ fontSize: "2.5rem", color: "#64748b", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Referrals Found</h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {searchQuery || stageFilter !== "All"
              ? "No referrals match your current search/stage filter."
              : "You haven't submitted any candidate referrals yet."}
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--color-primary, #6366f1)",
              color: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Submit First Referral
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredReferrals.map((referral) => {
            let statusColor = "#6366f1"; // Submitted
            if (referral.status === "Interviewing") statusColor = "#06b6d4";
            if (referral.status === "Hired") statusColor = "#10b981";
            if (referral.status === "Paid") statusColor = "#8b5cf6";
            if (referral.status === "Rejected") statusColor = "#ef4444";

            return (
              <div
                key={referral._id}
                className="glass-panel"
                style={{
                  borderRadius: "16px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{referral.candidateName}</h3>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-primary, #6366f1)", fontWeight: 600 }}>
                        {referral.position}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.65rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      {referral.status}
                    </span>
                  </div>

                  {/* Contact & Referrer */}
                  <div style={{ fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "1rem" }}>
                    <div><i className="fa-regular fa-envelope" style={{ width: "16px", color: "#94a3b8" }} /> {referral.candidateEmail}</div>
                    {referral.phone && <div><i className="fa-solid fa-phone" style={{ width: "16px", color: "#94a3b8" }} /> {referral.phone}</div>}
                    <div style={{ marginTop: "0.35rem", color: "#94a3b8" }}>
                      Referred by: <strong style={{ color: "#fff" }}>{referral.referrerName}</strong>
                    </div>
                  </div>

                  {/* Reward & Payout Status */}
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Bonus Reward</span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>
                        ${referral.rewardAmount.toLocaleString()}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: referral.payoutStatus === "Paid" ? "#8b5cf6" : referral.payoutStatus === "Approved" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      Payout: {referral.payoutStatus}
                    </span>
                  </div>
                </div>

                {/* Stage Advancement Action Bar */}
                <div style={{ paddingTop: "0.85rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    {referral.status === "Submitted" && (
                      <button
                        onClick={() => handleUpdateStage(referral._id, "Interviewing")}
                        style={{
                          padding: "0.35rem 0.65rem",
                          backgroundColor: "rgba(6, 182, 212, 0.15)",
                          color: "#06b6d4",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Interviewing
                      </button>
                    )}
                    {(referral.status === "Submitted" || referral.status === "Interviewing") && (
                      <button
                        onClick={() => handleUpdateStage(referral._id, "Hired")}
                        style={{
                          padding: "0.35rem 0.65rem",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Mark Hired
                      </button>
                    )}
                    {referral.status === "Hired" && (
                      <button
                        onClick={() => handleUpdateStage(referral._id, "Paid")}
                        style={{
                          padding: "0.35rem 0.65rem",
                          backgroundColor: "rgba(139, 92, 246, 0.15)",
                          color: "#8b5cf6",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Mark Reward Paid
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteReferral(referral._id)}
                    title="Delete Referral"
                    style={{
                      padding: "0.4rem 0.6rem",
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      color: "#ef4444",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Submit Referral */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "16px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Submit Candidate Referral</h2>
              <button onClick={() => setShowModal(false)} style={{ color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSubmitReferral} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                  Candidate Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  placeholder="e.g. Alex Rivera"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Candidate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.candidateEmail}
                    onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    placeholder="alex@example.com"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Target Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Reward Bonus ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rewardAmount}
                    onChange={(e) => setFormData({ ...formData, rewardAmount: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-primary, #6366f1)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
