"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "../../page.module.css";

interface ClientData {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: "Active" | "Lead" | "On Hold" | "Archived";
  retainerHours: number;
  usedHours: number;
  monthlyValue: number;
  notes?: string;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active" as ClientData["status"],
    retainerHours: 20,
    usedHours: 0,
    monthlyValue: 1500,
    notes: "",
  });

  // Log Hours modal state
  const [logHoursClient, setLogHoursClient] = useState<ClientData | null>(null);
  const [hoursToLog, setHoursToLog] = useState<number>(1);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenModal = (client?: ClientData) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone || "",
        status: client.status,
        retainerHours: client.retainerHours,
        usedHours: client.usedHours,
        monthlyValue: client.monthlyValue,
        notes: client.notes || "",
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        status: "Active",
        retainerHours: 20,
        usedHours: 0,
        monthlyValue: 1500,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingClient ? `/api/clients/${editingClient._id}` : "/api/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save client");
      }
    } catch (err) {
      console.error("Save client error:", err);
    }
  };

  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logHoursClient) return;

    try {
      const res = await fetch(`/api/clients/${logHoursClient._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logHours: hoursToLog }),
      });

      if (res.ok) {
        setLogHoursClient(null);
        setHoursToLog(1);
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to log hours");
      }
    } catch (err) {
      console.error("Log hours error:", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client retainer?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Delete client error:", err);
    }
  };

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalRetainers = clients.length;
    const activeRetainers = clients.filter((c) => c.status === "Active").length;
    const totalMonthlyValue = clients.reduce((acc, c) => acc + (c.monthlyValue || 0), 0);
    const totalAllocated = clients.reduce((acc, c) => acc + (c.retainerHours || 0), 0);
    const totalUsed = clients.reduce((acc, c) => acc + (c.usedHours || 0), 0);
    const overallUtilization = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    return { totalRetainers, activeRetainers, totalMonthlyValue, overallUtilization };
  }, [clients]);

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
            CRM & Client Retainers
          </h1>
          <p style={{ color: "var(--color-text-dark-secondary, #cbd5e1)", fontSize: "0.95rem" }}>
            Track client retainer pipelines, monthly hour usage, renewal alerts, and billing metrics.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
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
          Add Client Retainer
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
            Total Retainers
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {metrics.totalRetainers}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Active Clients
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#10b981" }}>
            {metrics.activeRetainers}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Monthly Retainer Revenue
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#6366f1" }}>
            ${metrics.totalMonthlyValue.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px" }}>
          <div style={{ color: "var(--color-text-dark-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
            Hours Utilization
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "#f59e0b" }}>
            {metrics.overallUtilization}%
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Status Filter */}
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
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              color: "#fff",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Lead">Lead</option>
            <option value="On Hold">On Hold</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Client Retainer Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }} />
          <p>Loading client retainers...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
          }}
        >
          <i className="fa-solid fa-users-slash" style={{ fontSize: "2.5rem", color: "#64748b", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Clients Found</h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {searchQuery || statusFilter !== "All"
              ? "No client retainers match your current search/filter criteria."
              : "You haven't added any client retainers yet."}
          </p>
          <button
            onClick={() => handleOpenModal()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--color-primary, #6366f1)",
              color: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Your First Client
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredClients.map((client) => {
            const usagePercent =
              client.retainerHours > 0
                ? Math.min(100, Math.round((client.usedHours / client.retainerHours) * 100))
                : 0;

            let progressColor = "#10b981"; // Emerald
            if (usagePercent >= 90) progressColor = "#ef4444"; // Rose
            else if (usagePercent >= 75) progressColor = "#f59e0b"; // Amber

            return (
              <div
                key={client._id}
                className="glass-panel"
                style={{
                  borderRadius: "16px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  {/* Top Bar: Company & Status Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{client.company}</h3>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-primary, #6366f1)", fontWeight: 600 }}>
                        {client.name}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.65rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor:
                          client.status === "Active"
                            ? "rgba(16, 185, 129, 0.15)"
                            : client.status === "Lead"
                            ? "rgba(99, 102, 241, 0.15)"
                            : client.status === "On Hold"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(148, 163, 184, 0.15)",
                        color:
                          client.status === "Active"
                            ? "#10b981"
                            : client.status === "Lead"
                            ? "#6366f1"
                            : client.status === "On Hold"
                            ? "#f59e0b"
                            : "#94a3b8",
                      }}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div style={{ fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "1.25rem" }}>
                    <div><i className="fa-regular fa-envelope" style={{ width: "16px", color: "#94a3b8" }} /> {client.email}</div>
                    {client.phone && <div><i className="fa-solid fa-phone" style={{ width: "16px", color: "#94a3b8" }} /> {client.phone}</div>}
                  </div>

                  {/* Retainer Usage Progress Bar */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "#94a3b8", fontWeight: 600 }}>Monthly Hours</span>
                      <span style={{ fontWeight: 700 }}>
                        {client.usedHours} / {client.retainerHours} hrs ({usagePercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        width: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${usagePercent}%`,
                          backgroundColor: progressColor,
                          borderRadius: "4px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Bar & Actions */}
                <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Monthly Value</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>${client.monthlyValue.toLocaleString()}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setLogHoursClient(client);
                        setHoursToLog(1);
                      }}
                      title="Log Retainer Hours"
                      style={{
                        padding: "0.45rem 0.75rem",
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                        color: "#6366f1",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-stopwatch" style={{ marginRight: "0.3rem" }} />
                      Log Hours
                    </button>
                    <button
                      onClick={() => handleOpenModal(client)}
                      title="Edit Client"
                      style={{
                        padding: "0.45rem 0.65rem",
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        color: "#cbd5e1",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id)}
                      title="Delete Client"
                      style={{
                        padding: "0.45rem 0.65rem",
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        color: "#ef4444",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Client */}
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
              maxWidth: "520px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                {editingClient ? "Edit Client Retainer" : "Add New Client Retainer"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Primary Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Lead">Lead</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    placeholder="contact@acme.com"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Phone
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Retainer Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.retainerHours}
                    onChange={(e) => setFormData({ ...formData, retainerHours: Number(e.target.value) })}
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
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Used Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usedHours}
                    onChange={(e) => setFormData({ ...formData, usedHours: Number(e.target.value) })}
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
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                    Monthly ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthlyValue}
                    onChange={(e) => setFormData({ ...formData, monthlyValue: Number(e.target.value) })}
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
                  {editingClient ? "Save Changes" : "Create Retainer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Hours */}
      {logHoursClient && (
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
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Log Retainer Hours</h2>
              <button onClick={() => setLogHoursClient(null)} style={{ color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#cbd5e1", marginBottom: "1.25rem" }}>
              Add completed hours for <strong style={{ color: "#fff" }}>{logHoursClient.company}</strong>:
            </p>

            <form onSubmit={handleLogHoursSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>
                  Hours Worked
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={hoursToLog}
                  onChange={(e) => setHoursToLog(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setLogHoursClient(null)}
                  style={{
                    padding: "0.55rem 1rem",
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
                    padding: "0.55rem 1.25rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-primary, #6366f1)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Log Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
