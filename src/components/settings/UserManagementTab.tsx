"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Preloader } from "@/components/ui/Preloader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending" | "On Leave" | "Suspended";
  department?: string;
  departments?: string[];
  photoUrl?: string;
  phone?: string;
  employmentType?: string;
  salary?: number;
  managerId?: {
    _id: string;
    name: string;
    email: string;
  };
  hrId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

export function UserManagementTab() {
  const searchParams = useSearchParams();
  const filterQueryParam = searchParams?.get("filter") || searchParams?.get("status");
  const isPendingFilterParam = filterQueryParam?.toLowerCase() === "pending" || searchParams?.get("pending") === "true";

  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, isAdmin } = usePermissions();
  const canManageUsers = isAdmin || can("manageUsers");
  const canChangeRoles = isAdmin || can("changeUserRoles");
  const canEditUser = canManageUsers || canChangeRoles;

  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>(isPendingFilterParam ? "Pending" : "All");

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    try {
      const url = new URL(window.location.href);
      if (newStatus === "All") {
        url.searchParams.delete("filter");
        url.searchParams.delete("status");
        url.searchParams.delete("pending");
      } else {
        url.searchParams.set("filter", newStatus);
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  // React to URL query parameter changes (e.g. from notifications deep-linking to ?filter=Pending)
  useEffect(() => {
    const filterParam = searchParams?.get("filter") || searchParams?.get("status");
    if (filterParam) {
      if (filterParam.toLowerCase() === "pending") {
        setStatusFilter("Pending");
      } else if (["active", "on leave", "suspended"].includes(filterParam.toLowerCase())) {
        const capitalized = filterParam.charAt(0).toUpperCase() + filterParam.slice(1);
        setStatusFilter(capitalized);
      }
    } else if (searchParams?.get("pending") === "true") {
      setStatusFilter("Pending");
    }
  }, [searchParams]);

  // Floating Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selection & Modal States
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState<"identity" | "org" | "compensation" | "security">("identity");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Approval Modal States for Pending Registrations
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedApproveUser, setSelectedApproveUser] = useState<IUser | null>(null);
  const [approveFormData, setApproveFormData] = useState({
    department: "General",
    managerId: "",
    hrId: "",
    role: "Employee",
    employmentType: "Permanent",
    salary: "" as string | number,
  });
  const [approveError, setApproveError] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Reject / Decline Pending User Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectUser, setSelectedRejectUser] = useState<IUser | null>(null);

  // Departments List from Backend
  const [departmentsList, setDepartmentsList] = useState<Array<{ _id: string; name: string }>>([]);

  // Form States for Editing / Creating
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Employee" as IUser["role"],
    status: "Active" as IUser["status"],
    department: "General",
    managerId: "",
    hrId: "",
    employmentType: "Permanent",
    salary: "" as string | number,
    newPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization Total Payroll Memo
  const totalPayroll = useMemo(() => {
    return users.reduce((sum, u) => sum + (Number(u.salary) || 0), 0);
  }, [users]);

  // Pending Users Memo & Available Managers / HRs Memo
  const pendingUsers = useMemo(() => {
    return users.filter((u) => u.status === "Pending");
  }, [users]);

  const availableManagers = useMemo(() => {
    return users.filter((u) => u.status === "Active" || !u.status);
  }, [users]);

  const availableHRs = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === "Active" || !u.status);
    const hrUsers = activeUsers.filter((u) => u.role?.toLowerCase() === "hr");
    const adminOpsUsers = activeUsers.filter((u) => {
      const r = u.role?.toLowerCase();
      return r === "admin" || r === "ops" || r === "sub admin";
    });

    if (hrUsers.length > 0) {
      return [...hrUsers, ...adminOpsUsers];
    }
    return adminOpsUsers.length > 0 ? adminOpsUsers : activeUsers;
  }, [users]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [availableRoles, setAvailableRoles] = useState<string[]>(["Admin", "OPS", "Manager", "HR", "Employee"]);

  // Fetch Users, Custom Roles & Departments
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [teamRes, permRes, deptRes] = await Promise.all([
        fetch(`/api/team?_t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/settings/permissions", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
      ]);
      if (teamRes.ok) {
        const data = await teamRes.json();
        setUsers(data.users || []);
      }
      if (permRes.ok) {
        const pData = await permRes.json();
        const custom: string[] = pData.customRoles || [];
        const allRoles = Array.from(new Set(["Admin", "OPS", "Manager", "HR", "Employee", ...custom]));
        setAvailableRoles(allRoles);
      }
      if (deptRes.ok) {
        const dData = await deptRes.json();
        setDepartmentsList(dData.departments || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Paginated Users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  // Open Approve Employee Modal
  const handleOpenApprove = (user: IUser) => {
    setSelectedApproveUser(user);
    const defaultDept = departmentsList[0]?.name || user.department || "Engineering";
    const defaultHr = (user.hrId as any)?._id || (availableHRs.find((h) => h.role?.toLowerCase() === "hr")?._id) || "";
    setApproveFormData({
      department: defaultDept,
      managerId: (user.managerId as any)?._id || "",
      hrId: defaultHr,
      role: user.role && user.role !== "Admin" ? user.role : "Employee",
      employmentType: user.employmentType || "Permanent",
      salary: user.salary ? Number(user.salary) : "",
    });
    setApproveError("");
    setShowApproveModal(true);
  };

  // Submit Approval
  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproveUser) return;

    try {
      setIsApproving(true);
      setApproveError("");

      const numSalary = approveFormData.salary === "" ? 0 : Number(approveFormData.salary) || 0;
      const payload: any = {
        status: "Active",
        department: approveFormData.department,
        managerId: approveFormData.managerId || null,
        hrId: approveFormData.hrId || null,
        role: approveFormData.role,
        employmentType: approveFormData.employmentType,
        salary: numSalary,
      };

      const res = await fetch(`/api/team/${selectedApproveUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve employee");
      }

      // Optimistically update local users state
      const updatedUser = data.user || { ...selectedApproveUser, ...payload, status: "Active" };
      setUsers((prev) =>
        prev.map((u) => (u._id === selectedApproveUser._id ? { ...u, ...updatedUser } : u))
      );

      setShowApproveModal(false);
      showToast(`🎉 ${selectedApproveUser.name} has been approved and assigned to ${approveFormData.department}!`, "success");
      setSelectedApproveUser(null);
      await fetchUsers();

      // If no more pending users remain, automatically switch to "All" so the approved employee is visible
      const remainingPending = users.filter((u) => u._id !== selectedApproveUser._id && u.status === "Pending");
      if (remainingPending.length === 0) {
        handleStatusFilterChange("All");
      }
    } catch (err: any) {
      setApproveError(err.message || "Failed to approve employee");
    } finally {
      setIsApproving(false);
    }
  };

  // Open Reject Pending Registration Modal
  const handleOpenReject = (user: IUser) => {
    setSelectedRejectUser(user);
    setShowRejectModal(true);
  };

  // Confirm Reject Pending Registration
  const handleConfirmReject = async () => {
    if (!selectedRejectUser) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/team/${selectedRejectUser._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to decline registration");
      }

      setUsers((prev) => prev.filter((u) => u._id !== selectedRejectUser._id));
      setShowRejectModal(false);
      showToast(`Registration for ${selectedRejectUser.name} was declined.`, "success");
      setSelectedRejectUser(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Failed to decline registration", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: IUser) => {
    setSelectedUser(user);
    const userSal = (user as any).salary;
    const mgrId = user.managerId?._id
      ? String(user.managerId._id)
      : (user as any).managerId
      ? String((user as any).managerId)
      : "";
    const hId = user.hrId?._id
      ? String(user.hrId._id)
      : (user as any).hrId
      ? String((user as any).hrId)
      : "";

    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: (user as any).phone || "",
      role: user.role || "Employee",
      status: user.status || "Active",
      department: user.department || "General",
      managerId: mgrId,
      hrId: hId,
      employmentType: (user as any).employmentType || "Permanent",
      salary: userSal !== undefined && userSal !== null && Number(userSal) > 0 ? Number(userSal) : "",
      newPassword: "",
    });
    setEditModalTab("identity");
    setShowEditPassword(false);
    setFormError("");
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setFormError("");

      const numSalary = formData.salary === "" ? 0 : Number(formData.salary) || 0;
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        status: formData.status,
        department: formData.department.trim() || "General",
        managerId: formData.managerId || null,
        hrId: formData.hrId || null,
        employmentType: formData.employmentType,
        salary: numSalary,
      };

      if (formData.newPassword && formData.newPassword.trim()) {
        payload.newPassword = formData.newPassword.trim();
      }

      const res = await fetch(`/api/team/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      // Optimistically update local users state immediately
      const updatedUser = data.user || { ...selectedUser, ...payload };
      setUsers((prev) =>
        prev.map((u) => (u._id === selectedUser._id ? { ...u, ...updatedUser } : u))
      );

      setShowEditModal(false);
      setSelectedUser(null);
      showToast(`User account for ${formData.name} updated successfully!`, "success");
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError("");

      const numSalary = formData.salary === "" ? 0 : Number(formData.salary) || 0;
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          employmentType: formData.employmentType,
          salary: numSalary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setCreatedTempPassword(data.tempPassword || null);
      setShowCreateModal(false);
      showToast(`Employee ${formData.name} created successfully!`, "success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "Employee",
        status: "Active",
        department: "General",
        managerId: "",
        hrId: "",
        employmentType: "Permanent",
        salary: "",
        newPassword: "",
      });
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/team/${selectedUser._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setShowDeleteModal(false);
      setSelectedUser(null);
      showToast("User account deleted successfully.", "success");
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading User Management System..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <i className="fa-solid fa-users-gear text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                User Management
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 font-medium">
                  Admin Control Panel
                </Badge>
              </h2>
              <p className="text-muted-foreground text-sm">
                Manage organization user accounts, roles, workspace statuses, and credentials.
              </p>
            </div>
          </div>
        </div>

        {canManageUsers && (
          <Button
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                phone: "",
                role: "Employee",
                status: "Active",
                department: "General",
                managerId: "",
                hrId: "",
                employmentType: "Permanent",
                salary: "",
                newPassword: "",
              });
              setFormError("");
              setCreatedTempPassword(null);
              setShowCreateModal(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium shadow-md"
          >
            <i className="fa-solid fa-user-plus" /> Add New User
          </Button>
        )}
      </div>

      {/* PENDING APPROVALS ALERT BANNER (Option A) */}
      {pendingUsers.length > 0 && canManageUsers && (
        <div className="p-4 md:p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
              <i className="fa-solid fa-user-clock text-xl animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  Pending Employee Approvals
                  <Badge className="bg-amber-500 text-slate-950 font-extrabold px-2 py-0 text-xs shadow-xs">
                    {pendingUsers.length} waiting
                  </Badge>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                New employees have registered and are waiting for department and reporting manager assignment before accessing the workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              onClick={() => {
                handleStatusFilterChange("Pending");
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer gap-1.5"
            >
              <i className="fa-solid fa-users-viewfinder text-xs" /> Review Approvals ({pendingUsers.length})
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="bg-card/50 border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Accounts</p>
              <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
              <i className="fa-solid fa-users text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Members</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {users.filter((u) => u.status === "Active" || !u.status).length}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <i className="fa-solid fa-user-check text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Admins &amp; Leads</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {users.filter((u) => u.role === "Admin" || u.role === "Manager" || u.role === "OPS").length}
              </p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
              <i className="fa-solid fa-user-shield text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monthly Payroll</p>
              <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalPayroll.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <i className="fa-solid fa-money-bill-trend-up text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Action Req. / Inactive</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {users.filter((u) => u.status === "Pending" || u.status === "Suspended").length}
              </p>
            </div>
            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-500">
              <i className="fa-solid fa-user-clock text-base" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Controls */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <Input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              )}
            </div>

            {/* Role Filter & Status Dropdown */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <i className="fa-solid fa-filter text-muted-foreground" /> Role:
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-background border border-input text-foreground text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="All">All Roles</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r === "OPS" ? "OPS (SubAdmin)" : r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <i className="fa-solid fa-shield text-muted-foreground" /> Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    handleStatusFilterChange(e.target.value);
                  }}
                  className="bg-background border border-input text-foreground text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending ({pendingUsers.length})</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Status Filter Pills */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 overflow-x-auto pb-0.5">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider shrink-0 mr-1">
              Filter by:
            </span>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("All")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                statusFilter === "All"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Active")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                statusFilter === "Active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Active ({users.filter(u => u.status === "Active" || !u.status).length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Pending")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                statusFilter === "Pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : pendingUsers.length > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {pendingUsers.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
              Pending Approvals ({pendingUsers.length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Suspended")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                statusFilter === "Suspended"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Suspended ({users.filter(u => u.status === "Suspended").length})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Users Roster Table */}
      <Card className="bg-card/50 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role &amp; Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <i className="fa-solid fa-user-slash text-3xl mb-3 text-muted-foreground/60 block" />
                    No users matching your criteria were found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isCurrent = currentUser?._id === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={u.photoUrl} alt={u.name} />
                            <AvatarFallback className="bg-muted text-foreground font-bold">
                              {u.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {u.name}
                              {isCurrent && (
                                <Badge color="secondary" variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] py-0">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{u.email}</div>
                            {((u as any).onboardedBy?.hrName || (u as any).onboardedBy?.hrId?.name) && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 mt-0.5">
                                <i className="fa-solid fa-user-check text-[9px]" /> Onboarded by {(u as any).onboardedBy.hrName || (u as any).onboardedBy.hrId?.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <Badge
                            className={cn(
                              "font-medium border text-xs px-2.5 py-0.5",
                              u.role === "Admin" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              u.role === "OPS" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              u.role === "Manager" && "bg-purple-500/10 text-purple-500 border-purple-500/20",
                              u.role === "HR" && "bg-pink-500/10 text-pink-500 border-pink-500/20",
                              u.role === "Employee" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                              !["Admin", "OPS", "Manager", "HR", "Employee"].includes(u.role) && "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            )}
                          >
                            <i
                              className={cn(
                                "mr-1.5 text-[10px]",
                                u.role === "Admin" && "fa-solid fa-user-shield",
                                u.role === "OPS" && "fa-solid fa-user-ninja",
                                u.role === "Manager" && "fa-solid fa-user-gear",
                                u.role === "HR" && "fa-solid fa-user-group",
                                u.role === "Employee" && "fa-solid fa-user",
                                !["Admin", "OPS", "Manager", "HR", "Employee"].includes(u.role) && "fa-solid fa-user-tag"
                              )}
                            />
                            {u.role === "OPS" ? "OPS (SubAdmin)" : u.role}
                          </Badge>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <i className="fa-solid fa-briefcase text-[9px] text-primary/70" />
                            {u.employmentType || "Permanent"}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                            u.status === "Active" || !u.status
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : u.status === "Pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : u.status === "On Leave"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              u.status === "Active" || !u.status
                                ? "bg-emerald-500"
                                : u.status === "Pending"
                                ? "bg-amber-500 animate-pulse"
                                : u.status === "On Leave"
                                ? "bg-blue-500"
                                : "bg-rose-500"
                            )}
                          />
                          {u.status || "Active"}
                        </span>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              (u as any).documentsSubmitted
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            )}
                          >
                            <i className={cn("fa-solid text-[8px]", (u as any).documentsSubmitted ? "fa-circle-check text-emerald-500" : "fa-clock text-amber-500")} />
                            {(u as any).documentsSubmitted ? "Docs Verified" : "Docs Pending"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-foreground font-medium">
                        {u.department || "General"}
                      </td>

                      <td className="px-6 py-4">
                        {u.salary && Number(u.salary) > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            <i className="fa-solid fa-indian-rupee-sign text-[10px]" />
                            <span>{Number(u.salary).toLocaleString()}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
                            <i className="fa-solid fa-circle-minus text-[10px] text-muted-foreground/40" />
                            Not configured
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canEditUser ? (
                          <div className="flex items-center justify-end gap-2">
                            {u.status === "Pending" && canManageUsers && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenApprove(u)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1 gap-1.5 shadow-xs cursor-pointer"
                                  title="Approve Employee & Assign Department"
                                >
                                  <i className="fa-solid fa-user-check text-xs" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenReject(u)}
                                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs px-2 py-1 gap-1 cursor-pointer"
                                  title="Decline Registration"
                                >
                                  <i className="fa-solid fa-user-xmark text-xs" /> Decline
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(u)}
                              className="text-foreground hover:bg-muted cursor-pointer"
                              title="Edit user role or status"
                            >
                              <i className="fa-solid fa-pen-to-square text-sm" />
                            </Button>
                            {canManageUsers && !isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowDeleteModal(true);
                                }}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                title="Remove User"
                              >
                                <i className="fa-solid fa-trash-can text-sm" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </Card>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80 bg-muted/20 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar className="h-11 w-11 border-2 border-border shadow-xs">
                    <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {selectedUser.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ring-1",
                      formData.status === "Active"
                        ? "bg-emerald-500 ring-emerald-500/20"
                        : formData.status === "Pending"
                        ? "bg-amber-500 ring-amber-500/20"
                        : formData.status === "On Leave"
                        ? "bg-sky-500 ring-sky-500/20"
                        : "bg-rose-500 ring-rose-500/20"
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground truncate">
                      Manage User: {formData.name || selectedUser.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] py-0 px-2 bg-primary/10 text-primary border-primary/20 font-semibold">
                      {formData.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] py-0 px-2 font-medium",
                        formData.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : formData.status === "Pending"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : formData.status === "On Leave"
                          ? "bg-sky-500/10 text-sky-500 border-sky-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}
                    >
                      {formData.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            {/* Segmented Navigation Tab Bar */}
            <div className="flex items-center gap-1.5 p-2 bg-muted/30 border-b border-border/80 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setEditModalTab("identity")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  editModalTab === "identity"
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <i className="fa-solid fa-id-card text-sky-500 text-xs" />
                <span>Identity &amp; Contact</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("org")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  editModalTab === "org"
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <i className="fa-solid fa-sitemap text-indigo-400 text-xs" />
                <span>Role &amp; Hierarchy</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("compensation")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  editModalTab === "compensation"
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <i className="fa-solid fa-wallet text-emerald-500 text-xs" />
                <span>Compensation</span>
                {Number(formData.salary) > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    ₹{Number(formData.salary) >= 100000 ? `${Number(formData.salary) / 100000}L` : `${Number(formData.salary) / 1000}k`}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("security")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  editModalTab === "security"
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <i className="fa-solid fa-shield-halved text-amber-500 text-xs" />
                <span>Security &amp; Access</span>
                {formData.newPassword && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </div>

            {/* Error Message Banner */}
            {formError && (
              <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2 shrink-0">
                <i className="fa-solid fa-triangle-exclamation shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form & Tab Content Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* TAB 1: Identity & Contact */}
                {editModalTab === "identity" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-muted-foreground text-[11px]" />
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g. John Doe"
                            className="bg-background border-input text-foreground text-sm h-10 pl-9"
                          />
                          <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-envelope text-muted-foreground text-[11px]" />
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="employee@domain.com"
                            className="bg-background border-input text-foreground text-sm h-10 pl-9"
                          />
                          <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-phone text-muted-foreground text-[11px]" />
                          Phone Number
                        </label>
                        <div className="relative">
                          <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="bg-background border-input text-foreground text-sm h-10 pl-9"
                          />
                          <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-building text-muted-foreground text-[11px]" />
                          Department
                        </label>
                        <div className="relative">
                          <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="General">General</option>
                            {departmentsList.map((d) => (
                              <option key={d._id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                            {!departmentsList.some((d) => d.name.toLowerCase() === formData.department.toLowerCase()) &&
                              formData.department &&
                              formData.department !== "General" && (
                                <option value={formData.department}>{formData.department}</option>
                              )}
                          </select>
                          <i className="fa-solid fa-building absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 border border-border/60 rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground">
                      <i className="fa-solid fa-circle-info text-primary text-sm shrink-0" />
                      <span>Employee contact and department details synchronize across team directories, task delegations, and chat mentions.</span>
                    </div>
                  </div>
                )}

                {/* TAB 2: Role & Hierarchy */}
                {editModalTab === "org" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-user-shield text-amber-500 text-[11px]" />
                          System Role <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            {availableRoles.map((r) => (
                              <option key={r} value={r}>
                                {r === "OPS" ? "OPS (SubAdmin)" : r}
                              </option>
                            ))}
                          </select>
                          <i className="fa-solid fa-user-shield absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-dot text-emerald-500 text-[11px]" />
                          Account Status <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="Active">Active (Full Workspace Access)</option>
                            <option value="Pending">Pending (Registration Review)</option>
                            <option value="On Leave">On Leave (Temporary Inactivity)</option>
                            <option value="Suspended">Suspended (Access Disabled)</option>
                          </select>
                          <i className="fa-solid fa-signal absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-user-tie text-indigo-400 text-[11px]" />
                          Reporting Manager
                        </label>
                        <div className="relative">
                          <select
                            value={formData.managerId}
                            onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="">None / Self-Managed (Direct Leadership)</option>
                            {availableManagers
                              .filter((u) => u._id !== selectedUser._id)
                              .map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.name} — {u.role} ({u.department || "General"})
                                </option>
                              ))}
                          </select>
                          <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-user-gear text-purple-400 text-[11px]" />
                          Assigned HR Partner
                        </label>
                        <div className="relative">
                          <select
                            value={formData.hrId}
                            onChange={(e) => setFormData({ ...formData, hrId: e.target.value })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="">None / Default Workspace HR</option>
                            {availableHRs
                              .filter((u) => u._id !== selectedUser._id)
                              .map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.name} — {u.role} ({u.email})
                                </option>
                              ))}
                          </select>
                          <i className="fa-solid fa-user-gear absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Hierarchy Preview */}
                    <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Assigned Organizational Structure
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-background border border-border text-foreground font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-user-tie text-indigo-400 text-[11px]" />
                          Manager:{" "}
                          <strong className="text-foreground font-semibold">
                            {availableManagers.find((m) => m._id === formData.managerId)?.name || "Direct Leadership"}
                          </strong>
                        </span>
                        <i className="fa-solid fa-arrow-right text-[10px] text-muted-foreground" />
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                          {formData.name || selectedUser.name}
                        </span>
                        <span className="ml-auto px-2.5 py-1 rounded-lg bg-background border border-border text-foreground font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-user-gear text-purple-400 text-[11px]" />
                          HR:{" "}
                          <strong className="text-foreground font-semibold">
                            {availableHRs.find((h) => h._id === formData.hrId)?.name || "Workspace Default"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Compensation & Payroll */}
                {editModalTab === "compensation" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-briefcase text-emerald-500 text-[11px]" />
                          Employment Type
                        </label>
                        <div className="relative">
                          <select
                            value={formData.employmentType}
                            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                            className="w-full bg-background border border-input text-foreground text-sm rounded-xl pl-9 pr-8 h-10 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="Permanent">Full Time (Permanent)</option>
                            <option value="Freelancer">Freelancer</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Contractor">Contractor</option>
                            <option value="Intern">Intern</option>
                          </select>
                          <i className="fa-solid fa-briefcase absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs pointer-events-none" />
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-indian-rupee-sign text-emerald-500 text-[11px]" />
                            Monthly Base Salary (₹)
                          </label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <i className="fa-solid fa-lock text-[9px]" /> Admin Defined
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-muted-foreground pointer-events-none">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="50000"
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                            className="bg-background border-input text-foreground font-mono font-bold text-sm h-10 pl-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium mr-1 flex items-center gap-1">
                          <i className="fa-solid fa-bolt text-amber-500 text-[10px]" /> Quick Presets:
                        </span>
                        {[25000, 35000, 50000, 75000, 100000, 150000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData({ ...formData, salary: preset })}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-lg border font-mono font-medium transition-all cursor-pointer",
                              Number(formData.salary) === preset
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold shadow-xs"
                                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border-border"
                            )}
                          >
                            ₹{preset >= 100000 ? `${preset / 100000}L` : `${preset / 1000}k`}
                          </button>
                        ))}
                        {formData.salary !== "" && Number(formData.salary) > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, salary: "" })}
                            className="text-xs px-2 py-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                          >
                            <i className="fa-solid fa-xmark mr-1 text-[10px]" /> Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Live Financial Projection Breakdown */}
                    <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <i className="fa-solid fa-calculator text-xs" />
                          Compensation Breakdown
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">Auto Calculated</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 rounded-lg bg-background/80 border border-emerald-500/20">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">
                            Monthly Base
                          </span>
                          <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(formData.salary || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background/80 border border-emerald-500/20">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">
                            Annual CTC
                          </span>
                          <span className="text-sm font-mono font-bold text-foreground">
                            ₹{(Number(formData.salary || 0) * 12).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background/80 border border-emerald-500/20">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">
                            Daily Est. (26d)
                          </span>
                          <span className="text-sm font-mono font-bold text-muted-foreground">
                            ~₹{Math.round(Number(formData.salary || 0) / 26).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-2 text-xs text-muted-foreground">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-sm mt-0.5 shrink-0" />
                      <span>This base salary automatically pre-populates self-service invoices, tax calculations, and payroll claims.</span>
                    </div>
                  </div>
                )}

                {/* TAB 4: Security & Access */}
                {editModalTab === "security" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-key text-sky-500 text-[11px]" />
                        Reset Account Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Enter new password to reset, or leave blank to keep unchanged"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="bg-background border-input text-foreground text-sm h-10 pl-9 pr-10 font-mono"
                        />
                        <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer transition-colors"
                          title={showEditPassword ? "Hide password" : "Show password"}
                        >
                          <i className={cn("fa-solid", showEditPassword ? "fa-eye-slash" : "fa-eye")} />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Leave blank to keep existing password. If resetting, enter at least 8 characters with uppercase, lowercase, numbers, and symbols.
                      </p>
                    </div>

                    <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-shield-halved text-sky-500 text-xs" />
                        Admin Override &amp; First-Time Setup
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Setting a new password here directly overrides their login credentials without requiring the employee&apos;s existing password or an email OTP code.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Modal Footer */}
              <div className="p-3.5 sm:p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {(["identity", "org", "compensation", "security"] as const).map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setEditModalTab(tabKey)}
                      className={cn(
                        "h-2 rounded-full transition-all cursor-pointer",
                        editModalTab === tabKey ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      )}
                      title={`Switch to ${tabKey}`}
                    />
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-1.5 hidden sm:inline">
                    {editModalTab === "identity" && "Step 1: Identity & Contact"}
                    {editModalTab === "org" && "Step 2: Role & Hierarchy"}
                    {editModalTab === "compensation" && "Step 3: Compensation & Payroll"}
                    {editModalTab === "security" && "Step 4: Security & Access"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditModal(false)}
                    className="border-border text-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-2 shadow-xs px-4"
                  >
                    {isSubmitting ? (
                      <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving Changes...</>
                    ) : (
                      <><i className="fa-solid fa-check text-xs" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time temporary password banner (shown after a successful user creation) */}
      {createdTempPassword && (
        <div className="mb-4 p-3.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500" />
          <div>
            <span className="font-semibold">User created.</span> Share this temporary password securely; the user must reset it on first login.
            <div className="mt-1 font-mono text-base break-all bg-emerald-500/10 border border-emerald-500/20 rounded p-2">{createdTempPassword}</div>
          </div>
          <button
            onClick={() => setCreatedTempPassword(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-foreground"
            aria-label="Dismiss"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <i className="fa-solid fa-user-plus text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add New Team Member</h3>
                  <p className="text-xs text-muted-foreground">Configure profile, roles, and compensation structure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Account Information */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Full Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background border-input text-foreground text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="rahul@nexace.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-background border-input text-foreground text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">System Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full bg-background border border-input text-foreground text-xs rounded-lg px-2.5 h-9 focus:border-primary focus:outline-none cursor-pointer"
                    >
                      {availableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r === "OPS" ? "OPS (SubAdmin)" : r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Department</label>
                    <Input
                      type="text"
                      placeholder="Engineering / Sales / Support"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="bg-background border-input text-foreground text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Compensation & Employment Structure */}
              <div className="p-3.5 bg-muted/40 border border-border/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <i className="fa-solid fa-indian-rupee-sign text-emerald-500" />
                    <span>Compensation & Employment Structure</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                    Admin Controlled
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Employment Type</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full bg-background border border-input text-foreground text-xs rounded-lg px-2.5 h-9 focus:border-primary focus:outline-none cursor-pointer"
                    >
                      <option value="Permanent">Full Time (Permanent)</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">
                      Monthly Base Salary (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="50000"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        className="bg-background border-input text-foreground font-mono font-bold text-xs h-9 pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Salary Preset Buttons */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1">Quick presets:</span>
                    {[25000, 35000, 50000, 75000, 100000, 150000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({ ...formData, salary: preset })}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md border font-mono transition-all cursor-pointer",
                          Number(formData.salary) === preset
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold shadow-xs"
                            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border-border"
                        )}
                      >
                        ₹{preset >= 100000 ? `${preset / 100000}L` : `${preset / 1000}k`}
                      </button>
                    ))}
                    {formData.salary !== "" && Number(formData.salary) > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, salary: "" })}
                        className="text-[10px] px-1.5 py-0.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                        title="Clear salary"
                      >
                        <i className="fa-solid fa-xmark text-[9px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Financial Projection Breakdown */}
                {Number(formData.salary) > 0 && (
                  <div className="p-2.5 bg-background/80 border border-emerald-500/20 rounded-xl grid grid-cols-3 gap-2 text-center animate-in fade-in">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Monthly Base</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(formData.salary).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Annual CTC</span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        ₹{(Number(formData.salary) * 12).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Est. Daily (26d)</span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        ~₹{Math.round(Number(formData.salary) / 26).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-2 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-2 text-[11px] text-muted-foreground">
                  <i className="fa-solid fa-circle-info text-[10px] text-primary mt-0.5 shrink-0" />
                  <span>
                    A strong temporary password will be automatically generated upon creation. The employee must set their own password on first login.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer gap-2"
                >
                  {isSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin text-xs" /> Creating User...</>
                  ) : (
                    <><i className="fa-solid fa-user-plus text-xs" /> Create Team Member</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete User Account</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to permanently remove <strong className="text-foreground">{selectedUser.name}</strong> ({selectedUser.email}) from your workspace?
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="border-border text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
              >
                {isSubmitting ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Employee Modal */}
      {showApproveModal && selectedApproveUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowApproveModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold">
                  <i className="fa-solid fa-user-check text-lg" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Approve Employee Account</h3>
                  <p className="text-xs text-muted-foreground">Assign department, reporting manager, and HR to activate access.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {approveError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                <span>{approveError}</span>
              </div>
            )}

            {/* Employee Info Header */}
            <div className="p-3.5 bg-muted/30 border border-border/60 rounded-xl flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={selectedApproveUser.photoUrl} alt={selectedApproveUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {selectedApproveUser.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {selectedApproveUser.name}
                  <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] py-0 font-medium">
                    Pending Approval
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{selectedApproveUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              {/* Department Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-building text-primary text-[11px]" />
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={approveFormData.department}
                  onChange={(e) => setApproveFormData({ ...approveFormData, department: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  required
                >
                  {departmentsList.length > 0 ? (
                    departmentsList.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Engineering">Engineering</option>
                      <option value="Management">Management</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="General">General</option>
                    </>
                  )}
                </select>
                <p className="text-[11px] text-muted-foreground">Select the organizational unit this employee belongs to.</p>
              </div>

              {/* Reporting Manager Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tie text-primary text-[11px]" />
                  Reporting Manager
                </label>
                <select
                  value={approveFormData.managerId}
                  onChange={(e) => setApproveFormData({ ...approveFormData, managerId: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">None / Self-Managed (Direct Report to Leadership)</option>
                  {availableManagers
                    .filter((m) => m._id !== selectedApproveUser._id)
                    .map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} — {m.role} ({m.department || "General"})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Assign their direct reporting lead for workflows, task delegations, and leaves.</p>
              </div>

              {/* Assigned HR Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user-gear text-primary text-[11px]" />
                  Assigned HR
                </label>
                <select
                  value={approveFormData.hrId}
                  onChange={(e) => setApproveFormData({ ...approveFormData, hrId: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">None / Default Workspace HR</option>
                  {availableHRs
                    .filter((h) => h._id !== selectedApproveUser._id)
                    .map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} — {h.role} ({h.email})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Assign their dedicated HR partner for appraisals, onboarding, attendance, and queries.</p>
              </div>

              {/* Role and Employment Type Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-user-shield text-primary text-[11px]" /> Role
                  </label>
                  <select
                    value={approveFormData.role}
                    onChange={(e) => setApproveFormData({ ...approveFormData, role: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-briefcase text-primary text-[11px]" /> Employment Type
                  </label>
                  <select
                    value={approveFormData.employmentType}
                    onChange={(e) => setApproveFormData({ ...approveFormData, employmentType: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Probation">Probation</option>
                    <option value="Intern">Intern</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>

              {/* Monthly Base Salary (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-indian-rupee-sign text-emerald-500 text-[11px]" />
                  Monthly Base Salary (Optional)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={approveFormData.salary}
                  onChange={(e) => setApproveFormData({ ...approveFormData, salary: e.target.value })}
                  className="bg-background border-input text-foreground font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                <i className="fa-solid fa-paper-plane mt-0.5 shrink-0" />
                <span>
                  Approving will activate this employee&apos;s workspace account and automatically send an email notification to <strong>{selectedApproveUser.email}</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApproveModal(false)}
                  className="border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-2 shadow-xs"
                >
                  {isApproving ? (
                    <><i className="fa-solid fa-spinner fa-spin text-xs" /> Approving Account...</>
                  ) : (
                    <><i className="fa-solid fa-user-check text-xs" /> Confirm &amp; Approve Employee</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject / Decline Pending User Modal */}
      {showRejectModal && selectedRejectUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <i className="fa-solid fa-user-xmark text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Decline Registration</h3>
                <p className="text-xs text-muted-foreground">Remove unauthorized or rejected registration.</p>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              Are you sure you want to decline registration for <strong className="text-foreground">{selectedRejectUser.name}</strong> ({selectedRejectUser.email})? This will permanently delete their pending account.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="border-border text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
              >
                {isSubmitting ? "Declining..." : "Decline Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 transition-all",
            toast.type === "success"
              ? "bg-emerald-950/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50"
              : "bg-rose-950/95 text-rose-300 border-rose-500/40 shadow-rose-950/50"
          )}
        >
          <i
            className={cn(
              "text-sm",
              toast.type === "success"
                ? "fa-solid fa-circle-check text-emerald-400"
                : "fa-solid fa-triangle-exclamation text-rose-400"
            )}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
