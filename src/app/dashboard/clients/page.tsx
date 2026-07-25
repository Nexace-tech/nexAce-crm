"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Handshake, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  DollarSign, 
  Edit3, 
  Trash2, 
  Timer,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

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
    retainerHours: 20,
    usedHours: 0,
    monthlyValue: 1500,
    notes: "",
  });

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CRM & Client Retainers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Retainer hours pipeline, monthly client value, and usage tracking.
          </p>
        </div>

        <Button color="primary" size="sm" onClick={() => handleOpenModal()} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add Client Retainer
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
              <Handshake className="w-6 h-6" />
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
              <CheckCircle className="w-6 h-6" />
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
              <DollarSign className="w-6 h-6" />
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
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <Card key={client._id} className="hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">{client.company}</CardTitle>
                  <p className="text-xs text-primary font-semibold mt-0.5">{client.name}</p>
                </div>
                <Badge color={client.status === "Active" ? "success" : client.status === "Lead" ? "info" : "warning"} variant="soft">
                  {client.status}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {client.email}</p>
                  {client.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {client.phone}</p>}
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
                    <Button variant="outline" size="sm" onClick={() => { setLogHoursClient(client); setHoursToLog(1); }}>
                      Log Hours
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(client)} className="h-8 w-8">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client._id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
