"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Share2, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Gift, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage, itemsPerPage]);

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
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Referral & Reward Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track candidate pipeline stages (Submitted → Interviewing → Hired → Paid) and referral payouts.
          </p>
        </div>

        <Button color="primary" size="sm" onClick={() => setShowModal(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Submit Referral
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Share2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hired Candidates</p>
              <p className="text-2xl font-bold text-foreground">{metrics.hired}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-foreground">${metrics.pendingPayouts.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Gift className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Rewards Paid</p>
              <p className="text-2xl font-bold text-foreground">${metrics.totalPayouts.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <Gift className="w-6 h-6" />
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
            placeholder="Search candidate, position, or referrer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <Button
            variant={stageFilter === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter("All")}
          >
            All
          </Button>
          {STAGES.map((stg) => (
            <Button
              key={stg}
              variant={stageFilter === stg ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter(stg)}
            >
              {stg}
            </Button>
          ))}
        </div>
      </Card>

      {/* Referral Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedReferrals.map((ref) => (
          <Card key={ref._id} className="hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">{ref.candidateName}</CardTitle>
                <p className="text-xs text-primary font-semibold mt-0.5">{ref.position}</p>
              </div>
              <Badge color={ref.status === "Hired" ? "success" : ref.status === "Paid" ? "info" : "warning"} variant="soft">
                {ref.status}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {ref.candidateEmail}</p>
                <p className="text-foreground">Referred by: <strong>{ref.referrerName}</strong></p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bonus Reward</span>
                  <span className="font-bold text-emerald-500 text-sm">${ref.rewardAmount.toLocaleString()}</span>
                </div>
                <Badge color={ref.payoutStatus === "Paid" ? "success" : "warning"} variant="soft">
                  Payout: {ref.payoutStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex gap-1.5">
                  {ref.status === "Submitted" && (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStage(ref._id, "Interviewing")}>
                      Interviewing
                    </Button>
                  )}
                  {(ref.status === "Submitted" || ref.status === "Interviewing") && (
                    <Button size="sm" color="success" onClick={() => handleUpdateStage(ref._id, "Hired")}>
                      Mark Hired
                    </Button>
                  )}
                  {ref.status === "Hired" && (
                    <Button size="sm" color="primary" onClick={() => handleUpdateStage(ref._id, "Paid")}>
                      Mark Paid
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="icon" onClick={() => handleDeleteReferral(ref._id)} className="h-8 w-8 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredReferrals.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}
