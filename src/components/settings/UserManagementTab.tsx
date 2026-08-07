"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  managerId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

export function UserManagementTab() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

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
    newPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [availableRoles, setAvailableRoles] = useState<string[]>(["Admin", "OPS", "Manager", "HR", "Employee"]);

  // Fetch Users & Custom Roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [teamRes, permRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/settings/permissions"),
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
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || "Active",
      department: user.department || "General",
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

      const payload: any = {
        name: formData.name,
        role: formData.role,
        status: formData.status,
        department: formData.department,
      };

      if (formData.newPassword.trim()) {
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

      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
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

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setCreatedTempPassword(data.tempPassword || null);
      setShowCreateModal(false);
      setFormData({
        name: "",
        email: "",
        role: "Employee",
        status: "Active",
        department: "General",
        newPassword: "",
      });
      fetchUsers();
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
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading User Management System..." />;
  }

  const isAdmin = currentUser?.role === "Admin";

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

        {isAdmin && (
          <Button
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                role: "Employee",
                status: "Active",
                department: "General",
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Accounts</p>
              <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
              <i className="fa-solid fa-users text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Admins & Managers</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {users.filter((u) => u.role === "Admin" || u.role === "Manager").length}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
              <i className="fa-solid fa-user-shield text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Users</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {users.filter((u) => u.status === "Active" || !u.status).length}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <i className="fa-solid fa-user-check text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending & Suspended</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {users.filter((u) => u.status === "Pending" || u.status === "Suspended").length}
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-500">
              <i className="fa-solid fa-user-clock text-lg" />
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
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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

                      <td className="px-6 py-4 text-foreground">
                        {u.department || "General"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isAdmin ? (
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
                            {!isCurrent && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-pen text-primary" /> Manage User: {selectedUser.name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Full Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted/50 border-input text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-background border border-input text-foreground text-sm rounded-xl p-2.5 focus:border-primary focus:outline-none"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r === "OPS" ? "OPS (SubAdmin)" : r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-background border border-input text-foreground text-sm rounded-xl p-2.5 focus:border-primary focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Department</label>
                <Input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  Reset Password (Optional)
                </label>
                <Input
                  type="password"
                  placeholder="Enter new password to override..."
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-primary" /> Add New User
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-background border border-input text-foreground text-sm rounded-xl p-2.5 focus:border-primary focus:outline-none"
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
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * A strong, random temporary password is generated and shown after creation. The user must reset it on first login.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
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
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isSubmitting ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
