"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface ContactLog {
  _id?: string;
  date: string;
  type: "Email" | "Call" | "Meeting" | "Note";
  summary: string;
  authorName: string;
}

interface ClientData {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: "Active" | "Lead" | "On Hold" | "Archived";
  pipelineStage: "Lead" | "Negotiation" | "Active Retainer" | "On Hold" | "Closed";
  retainerHours: number;
  usedHours: number;
  monthlyValue: number;
  renewalDate?: string;
  notes?: string;
  contactHistory: ContactLog[];
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active" as ClientData["status"],
    pipelineStage: "Active Retainer" as ClientData["pipelineStage"],
    retainerHours: 20,
    usedHours: 0,
    monthlyValue: 1500,
    renewalDate: "",
    notes: "",
  });

  // Contact history modal
  const [activeHistoryClient, setActiveHistoryClient] = useState<ClientData | null>(null);
  const [newLogType, setNewLogType] = useState<"Email" | "Call" | "Meeting" | "Note">("Meeting");
  const [newLogSummary, setNewLogSummary] = useState("");

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
        pipelineStage: client.pipelineStage || "Active Retainer",
        retainerHours: client.retainerHours,
        usedHours: client.usedHours,
        monthlyValue: client.monthlyValue,
        renewalDate: client.renewalDate ? client.renewalDate.split("T")[0] : "",
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
        pipelineStage: "Active Retainer",
        retainerHours: 20,
        usedHours: 0,
        monthlyValue: 1500,
        renewalDate: "",
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

  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHistoryClient || !newLogSummary.trim()) return;

    try {
      const res = await fetch(`/api/clients/${activeHistoryClient._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactLog: {
            type: newLogType,
            summary: newLogSummary,
          },
        }),
      });

      if (res.ok) {
        setNewLogSummary("");
        const updated = await res.json();
        setActiveHistoryClient(updated.client);
        fetchClients();
      }
    } catch (err) {
      console.error("Add contact log error:", err);
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

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

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
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-handshake text-primary text-xl" /> CRM & Client Retainers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Retainer hours pipeline, contact interaction history logs, and renewal tracking.
          </p>
        </div>

        <Button color="primary" size="sm" onClick={() => handleOpenModal()} className="gap-2">
          <i className="fa-solid fa-user-plus text-xs" /> Add Client Retainer
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Retainers</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalRetainers}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <i className="fa-solid fa-handshake text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Clients</p>
              <p className="text-2xl font-bold text-foreground">{metrics.activeRetainers}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-circle-check text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold text-foreground">${metrics.totalMonthlyValue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <i className="fa-solid fa-dollar-sign text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours Utilization</p>
              <p className="text-2xl font-bold text-foreground">{metrics.overallUtilization}%</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-clock text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Lead">Lead</option>
          <option value="On Hold">On Hold</option>
          <option value="Archived">Archived</option>
        </select>
      </Card>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedClients.map((client) => {
          const usagePercent =
            client.retainerHours > 0
              ? Math.min(100, Math.round((client.usedHours / client.retainerHours) * 100))
              : 0;

          return (
            <Card key={client._id} className="hover:shadow-md transition-all flex flex-col justify-between border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">{client.company}</CardTitle>
                  <p className="text-xs text-primary font-semibold mt-0.5">{client.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={client.status === "Active" ? "success" : client.status === "Lead" ? "info" : "warning"} variant="soft">
                    {client.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {client.pipelineStage || "Active Retainer"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2"><i className="fa-solid fa-envelope text-xs" /> {client.email}</p>
                  {client.phone && <p className="flex items-center gap-2"><i className="fa-solid fa-phone text-xs" /> {client.phone}</p>}
                  {client.renewalDate && (
                    <p className="flex items-center gap-2 text-amber-500 font-semibold">
                      <i className="fa-solid fa-calendar-days text-xs" /> Renewal: {new Date(client.renewalDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Monthly Retainer Hours</span>
                    <span className="text-foreground">{client.usedHours} / {client.retainerHours} hrs ({usagePercent}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${usagePercent}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Monthly Value</p>
                    <p className="text-lg font-bold text-foreground">${client.monthlyValue.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveHistoryClient(client)}
                      className="gap-1 text-xs"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-xs" /> Logs ({client.contactHistory?.length || 0})
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(client)} className="h-8 w-8">
                      <i className="fa-solid fa-pen-to-square text-xs" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client._id)} className="h-8 w-8 text-destructive">
                      <i className="fa-solid fa-trash text-xs" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredClients.length}
        itemsPerPage={itemsPerPage}
      />

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-handshake text-primary text-base" /> {editingClient ? "Edit Client Retainer" : "Add Client Retainer"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Contact Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Company Name *</label>
                  <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Acme Corp" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email Address *</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Active">Active</option>
                    <option value="Lead">Lead</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Pipeline Stage</label>
                  <select value={formData.pipelineStage} onChange={(e) => setFormData({ ...formData, pipelineStage: e.target.value as any })} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Lead">Lead</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Active Retainer">Active Retainer</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Renewal Date</label>
                  <Input type="date" value={formData.renewalDate} onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Monthly Retainer Hours</label>
                  <Input type="number" value={formData.retainerHours} onChange={(e) => setFormData({ ...formData, retainerHours: Number(e.target.value) })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Monthly Value ($)</label>
                  <Input type="number" value={formData.monthlyValue} onChange={(e) => setFormData({ ...formData, monthlyValue: Number(e.target.value) })} required />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Save Client</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact History Log Modal */}
      {activeHistoryClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setActiveHistoryClient(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-sky-500 text-base" /> Contact History Timeline
                </h3>
                <p className="text-xs text-muted-foreground">{activeHistoryClient.company} ({activeHistoryClient.name})</p>
              </div>
              <button onClick={() => setActiveHistoryClient(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>

            {/* Form to log interaction */}
            <form onSubmit={handleAddContactLog} className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Log New Interaction</p>
              <div className="flex gap-2">
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as any)}
                  className="h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Note">Note</option>
                </select>
                <Input
                  placeholder="Summary of conversation, email sent, or meeting outcome..."
                  value={newLogSummary}
                  onChange={(e) => setNewLogSummary(e.target.value)}
                  className="text-xs flex-1 h-8"
                  required
                />
                <Button color="primary" size="sm" type="submit" className="h-8 text-xs gap-1">
                  <i className="fa-solid fa-paper-plane text-xs" /> Log
                </Button>
              </div>
            </form>

            {/* Interaction history list */}
            <div className="space-y-3 pt-2">
              {activeHistoryClient.contactHistory?.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No contact history logged yet for this client.</p>
              ) : (
                activeHistoryClient.contactHistory?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-accent/20 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                        <span className="text-foreground">{item.authorName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleString()}</span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
