"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  createdAt?: string;
}

export function UserManagementTab() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, isAdmin } = usePermissions();
  const canManageUsers = isAdmin || can("manageUsers");
  const canChangeRoles = isAdmin || can("changeUserRoles");
  const canEditUser = canManageUsers || canChangeRoles;

  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Floating Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selection & Modal States
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form States for Editing / Creating
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Employee" as IUser["role"],
    status: "Active" as IUser["status"],
    department: "General",
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [availableRoles, setAvailableRoles] = useState<string[]>(["Admin", "OPS", "Manager", "HR", "Employee"]);

  // Fetch Users & Custom Roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [teamRes, permRes] = await Promise.all([
        fetch(`/api/team?_t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/settings/permissions", { cache: "no-store" }),
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

  // Open Edit Modal
  const handleOpenEdit = (user: IUser) => {
    setSelectedUser(user);
    const userSal = (user as any).salary;
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || "Active",
      department: user.department || "General",
      employmentType: (user as any).employmentType || "Permanent",
      salary: userSal !== undefined && userSal !== null && Number(userSal) > 0 ? Number(userSal) : "",
      newPassword: "",
    });
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
        name: formData.name,
        role: formData.role,
        status: formData.status,
        department: formData.department,
        employmentType: formData.employmentType,
        salary: numSalary,
      };

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
      showToast(`Profile & salary for ${formData.name} updated successfully!`, "success");
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
        role: "Employee",
        status: "Active",
        department: "General",
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
                role: "Employee",
                status: "Active",
                department: "General",
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
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
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

          {/* Filters */}
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

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <i className="fa-solid fa-shield text-muted-foreground" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border border-input text-foreground text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(u)}
                              className="text-foreground hover:bg-muted"
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
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowEditModal(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border/80 shadow-xs">
                  <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {selectedUser.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Manage User: {selectedUser.name}
                    <Badge variant="outline" className="text-[10px] py-0 px-2 bg-primary/5 text-primary border-primary/20">
                      {formData.role}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Personal Details */}
              <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/60">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user-circle text-primary text-xs" /> Account Identity
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">Full Name</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background border-input text-foreground text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">Department</label>
                    <Input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="bg-background border-input text-foreground text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Roles & Status */}
              <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/60">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user-shield text-amber-500 text-xs" /> Role &amp; Access Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">System Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full bg-background border border-input text-foreground text-xs rounded-lg px-3 h-9 focus:border-primary focus:outline-none"
                    >
                      {availableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r === "OPS" ? "OPS (SubAdmin)" : r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">Account Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-background border border-input text-foreground text-xs rounded-lg px-3 h-9 focus:border-primary focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment & Compensation */}
              <div className="space-y-3 p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-500/10">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-money-bill-wave text-emerald-500 text-xs" /> Employment &amp; Compensation
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <i className="fa-solid fa-lock text-[9px]" /> Admin Defined
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">Employment Type</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full bg-background border border-input text-foreground text-xs rounded-lg px-3 h-9 focus:border-primary focus:outline-none"
                    >
                      <option value="Permanent">Full Time (Permanent)</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium block">
                      Monthly Base Salary (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground pointer-events-none">
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
                    The monthly base salary set here is locked for the user and automatically synchronizes with their self-service invoice generator and attendance salary claims.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-2"
                >
                  {isSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving Changes...</>
                  ) : (
                    <><i className="fa-solid fa-check text-xs" /> Save Changes</>
                  )}
                </Button>
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
