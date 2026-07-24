"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OrgChartNode, OrgNode } from "@/components/features/OrgChartNode";
import styles from "./team.module.css";

interface IDepartmentItem {
  _id: string;
  name: string;
  description?: string;
  code?: string;
}

interface IBulkAddRow {
  id: string;
  name: string;
  email: string;
  role: string;
  departments: string[];
  managerId: string;
}

export default function TeamDashboardPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<IDepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"directory" | "orgchart" | "manager" | "departments">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  // Bulk Member Selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignDepts, setBulkAssignDepts] = useState<string[]>([]);
  const [bulkAssignMode, setBulkAssignMode] = useState<"set" | "add">("add");
  const [isSubmittingBulkAssign, setIsSubmittingBulkAssign] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Bulk Add Modal States (Admin & Manager)
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<IBulkAddRow[]>([
    { id: "1", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
    { id: "2", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
  ]);
  const [bulkAddError, setBulkAddError] = useState("");
  const [isSubmittingBulkAdd, setIsSubmittingBulkAdd] = useState(false);

  // Remove Single Employee State (Admin only)
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // Department Assigned Members Modal
  const [viewingDeptMembers, setViewingDeptMembers] = useState<IDepartmentItem | null>(null);
  
  // Profile self-edit states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState("");
  const [editSkillsText, setEditSkillsText] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepts, setEditDepts] = useState<string[]>(["Engineering"]);
  const [editRole, setEditRole] = useState("Employee");
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Single Employee Form States (Admin / Manager)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("Employee");
  const [addDepts, setAddDepts] = useState<string[]>(["Engineering"]);
  const [addManagerId, setAddManagerId] = useState("");
  const [addSkills, setAddSkills] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Department CRUD States (Admin / Manager)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<IDepartmentItem | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<IDepartmentItem | null>(null);

  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormDesc, setDeptFormDesc] = useState("");
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormError, setDeptFormError] = useState("");
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch departments dynamically
  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const response = await fetch("/api/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartmentsList(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setDeptLoading(false);
    }
  };

  // Fetch employees
  const fetchTeam = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/team?department=${departmentFilter}&search=${searchQuery}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchTeam();
      fetchDepartments();
    }
  }, [departmentFilter, searchQuery, mounted]);

  // Checkbox Selection handlers
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u._id));
    }
  };

  // Bulk Assign Departments submit
  const handleBulkAssignDepartments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0 || bulkAssignDepts.length === 0) {
      showToast("Please select members and at least one department.", "error");
      return;
    }

    setIsSubmittingBulkAssign(true);
    try {
      const response = await fetch("/api/team/bulk-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedUserIds,
          departments: bulkAssignDepts,
          mode: bulkAssignMode,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || "Departments assigned successfully!", "success");
        setShowBulkAssignModal(false);
        setSelectedUserIds([]);
        setBulkAssignDepts([]);
        await fetchTeam();
      } else {
        showToast(data.error || "Failed to assign departments.", "error");
      }
    } catch (error) {
      console.error("Bulk assign error:", error);
      showToast("An error occurred during bulk assignment.", "error");
    } finally {
      setIsSubmittingBulkAssign(false);
    }
  };

  // Bulk Delete Members submit
  const handleConfirmBulkDelete = async () => {
    const deletableIds = selectedUserIds.filter((id) => id !== currentUser?._id);
    if (deletableIds.length === 0) {
      showToast("Cannot delete selected user(s).", "error");
      setShowBulkDeleteConfirm(false);
      return;
    }

    setIsDeletingBulk(true);
    try {
      let successCount = 0;
      for (const id of deletableIds) {
        const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      showToast(`Removed ${successCount} employee(s) successfully.`, "success");
      setSelectedUserIds([]);
      setShowBulkDeleteConfirm(false);
      await fetchTeam();
    } catch (error) {
      console.error("Bulk delete error:", error);
      showToast("Failed to complete bulk deletion.", "error");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Bulk Add Members submit
  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkAddError("");

    const validRows = bulkRows.filter((r) => r.name.trim() && r.email.trim());
    if (validRows.length === 0) {
      setBulkAddError("Please fill out Name and Email for at least one team member.");
      return;
    }

    setIsSubmittingBulkAdd(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: validRows }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Successfully added ${data.count} team member(s)!`, "success");
        setShowBulkAddModal(false);
        setBulkRows([
          { id: "1", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
          { id: "2", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
        ]);
        await fetchTeam();
      } else {
        setBulkAddError(data.error || "Failed to add team members.");
      }
    } catch (error) {
      console.error("Bulk add error:", error);
      setBulkAddError("An error occurred during bulk employee creation.");
    } finally {
      setIsSubmittingBulkAdd(false);
    }
  };

  // Handle reporting line reassignment via Org Chart Drag & Drop
  const handleReassign = async (employeeId: string, managerId: string | null) => {
    try {
      const response = await fetch("/api/team/reassign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, managerId }),
      });
      const data = await response.json();
      if (response.ok) {
        await fetchTeam();
        showToast("Reporting line reassigned successfully!", "success");
      } else {
        showToast(`Failed to reassign: ${data.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Reassign error:", error);
      showToast("An error occurred during manager reassignment.", "error");
    }
  };

  // Remove Single Employee Action (Admin only)
  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;

    setIsDeletingMember(true);
    try {
      const response = await fetch(`/api/team/${memberToDelete._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.ok) {
        showToast("Employee removed successfully!", "success");
        if (selectedMember?._id === memberToDelete._id) {
          setSelectedMember(null);
        }
        setMemberToDelete(null);
        await fetchTeam();
      } else {
        showToast(data.error || "Failed to remove employee.", "error");
      }
    } catch (error) {
      console.error("Delete member error:", error);
      showToast("An error occurred while deleting the employee.", "error");
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Profile update action
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setIsUpdating(true);
    try {
      const parsedSkills = editSkillsText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const updateData: any = {
        name: editName,
        email: editEmail,
        phone: editPhone,
        bio: editBioText,
        skills: parsedSkills,
        photoUrl: editPhotoUrl,
      };

      if (currentUser?.role === "Admin") {
        updateData.departments = editDepts;
        updateData.department = editDepts[0] || "General";
        updateData.role = editRole;
      }

      const response = await fetch(`/api/team/${selectedMember._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedMember(data.user);
        setIsEditingBio(false);
        await fetchTeam();
        showToast("Profile updated successfully!", "success");
      } else {
        showToast(data.error || "Failed to update profile.", "error");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Add single employee record (Admin / Manager)
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!addName || !addEmail) {
      setFormError("Name and Email are required fields.");
      return;
    }

    try {
      const skillsArray = addSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          role: addRole,
          departments: addDepts,
          department: addDepts[0] || "General",
          managerId: addManagerId || undefined,
          skills: skillsArray,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setFormSuccess("Employee added successfully! Default password is 'password123'.");
        setAddName("");
        setAddEmail("");
        setAddSkills("");
        setAddManagerId("");
        await fetchTeam();
        setTimeout(() => {
          setShowAddForm(false);
          setFormSuccess("");
        }, 1500);
      } else {
        setFormError(data.error || "Failed to add employee.");
      }
    } catch (error) {
      console.error("Add employee error:", error);
      setFormError("An error occurred. Please try again.");
    }
  };

  // Department CRUD Handlers
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFormError("");

    if (!deptFormName.trim()) {
      setDeptFormError("Department name is required.");
      return;
    }

    setIsSubmittingDept(true);
    try {
      const isEditing = !!editingDept;
      const url = isEditing ? `/api/departments/${editingDept._id}` : "/api/departments";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptFormName,
          description: deptFormDesc,
          code: deptFormCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(
          isEditing ? "Department updated successfully!" : "Department created successfully!",
          "success"
        );
        setShowAddDeptModal(false);
        setEditingDept(null);
        setDeptFormName("");
        setDeptFormDesc("");
        setDeptFormCode("");
        await fetchDepartments();
        await fetchTeam();
      } else {
        setDeptFormError(data.error || "Failed to save department.");
      }
    } catch (error) {
      console.error("Save department error:", error);
      setDeptFormError("An error occurred while saving the department.");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleConfirmDeleteDepartment = async () => {
    if (!deptToDelete) return;

    setIsSubmittingDept(true);
    try {
      const response = await fetch(`/api/departments/${deptToDelete._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.ok) {
        showToast("Department deleted successfully!", "success");
        setDeptToDelete(null);
        await fetchDepartments();
        await fetchTeam();
      } else {
        showToast(data.error || "Failed to delete department.", "error");
      }
    } catch (error) {
      console.error("Delete department error:", error);
      showToast("An error occurred while deleting the department.", "error");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    const member = users.find((u) => u._id === memberId);
    if (member) {
      setSelectedMember(member);
      setEditBioText(member.bio || "");
      setEditSkillsText(member.skills ? member.skills.join(", ") : "");
      setEditPhotoUrl(member.photoUrl || "");
      setEditName(member.name || "");
      setEditEmail(member.email || "");
      setEditPhone(member.phone || "");
      const userDepts = member.departments && member.departments.length > 0
        ? member.departments
        : [member.department || "Engineering"];
      setEditDepts(userDepts);
      setEditRole(member.role || "Employee");
      setIsEditingBio(false);
    }
  };

  // Map users into Org tree structure
  const buildOrgTree = (): OrgNode[] => {
    const userMap: { [key: string]: OrgNode } = {};
    const rootNodes: OrgNode[] = [];

    users.forEach((u) => {
      userMap[u._id] = {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || "Engineering",
        photoUrl: u.photoUrl,
        status: u.status || "Active",
        managerId: u.managerId?._id || u.managerId,
        reports: [],
      };
    });

    users.forEach((u) => {
      const node = userMap[u._id];
      const managerId = u.managerId?._id || u.managerId;
      if (managerId && userMap[managerId]) {
        userMap[managerId].reports.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  const orgTreeRoots = buildOrgTree();
  const isAdmin = currentUser?.role === "Admin";
  const isManagerOrAdmin = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  // Filter direct reports for Manager Dashboard view
  const directReports = users.filter((u) => {
    const mgrId = u.managerId?._id || u.managerId;
    return mgrId === currentUser?._id;
  });

  if (!mounted || authLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }}></i> Loading Team Directory...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Title & Actions - Buttons on next bottom line */}
      <div className={styles.titleSection} style={{ flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <h1 className={styles.title}>My Team</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage organization members, multiple department assignments, and reporting lines.
            {currentUser && (
              <span style={{ fontSize: "0.85rem", color: "var(--color-primary)", marginLeft: "0.5rem" }}>
                (Logged in as: {currentUser.name} • Role: {currentUser.role})
              </span>
            )}
          </p>
        </div>

        {isManagerOrAdmin && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className={styles.btnSecondary} onClick={() => setShowBulkAddModal(true)}>
              <i className="fa-solid fa-users-gear" style={{ marginRight: "0.25rem" }}></i> Bulk Add Members
            </button>
            <button className={styles.btnSecondary} onClick={() => {
              setEditingDept(null);
              setDeptFormName("");
              setDeptFormDesc("");
              setDeptFormCode("");
              setDeptFormError("");
              setShowAddDeptModal(true);
            }}>
              <i className="fa-solid fa-building" style={{ marginRight: "0.25rem" }}></i> Add Department
            </button>
            <button className={styles.btnPrimary} onClick={() => setShowAddForm(true)}>
              <i className="fa-solid fa-user-plus" style={{ marginRight: "0.25rem" }}></i> Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "directory" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("directory"))}
        >
          <i className="fa-solid fa-folder-open" style={{ marginRight: "0.25rem" }}></i> Directory ({users.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "orgchart" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("orgchart"))}
        >
          <i className="fa-solid fa-sitemap" style={{ marginRight: "0.25rem" }}></i> Org Chart
        </button>
        {isManagerOrAdmin && (
          <button
            className={`${styles.tab} ${activeTab === "manager" ? styles.tabActive : ""}`}
            onClick={() => startTransition(() => setActiveTab("manager"))}
          >
            <i className="fa-solid fa-crown" style={{ marginRight: "0.25rem" }}></i> Manager Panel
          </button>
        )}
        <button
          className={`${styles.tab} ${activeTab === "departments" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("departments"))}
        >
          <i className="fa-solid fa-layer-group" style={{ marginRight: "0.25rem" }}></i> Departments ({departmentsList.length})
        </button>
      </div>

      {/* ----------------- Tab 1: Directory ----------------- */}
      {activeTab === "directory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Search/Filter Bar */}
          <div className={`${styles.filterBar} glass-panel`}>
            <div className={styles.searchGroup}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-muted)" }}></i>
              <input
                type="text"
                placeholder="Search name, email, skills, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                className={styles.select}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name} Department
                  </option>
                ))}
              </select>

              <div className={styles.viewToggle}>
                <button
                  className={`${styles.toggleBtn} ${viewMode === "grid" ? styles.toggleBtnActive : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <i className="fa-solid fa-grip"></i>
                </button>
                <button
                  className={`${styles.toggleBtn} ${viewMode === "list" ? styles.toggleBtnActive : ""}`}
                  onClick={() => setViewMode("list")}
                  title="List View"
                >
                  <i className="fa-solid fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading team directory...</p>
          ) : users.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No team members found.</p>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className={styles.cardGrid}>
              {users.map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();

                const isSelf = member._id === currentUser?._id;
                const isSelected = selectedUserIds.includes(member._id);
                const memberDepts: string[] = member.departments && member.departments.length > 0
                  ? member.departments
                  : [member.department || "General"];

                return (
                  <div
                    key={member._id}
                    className={`${styles.memberCard} glass-panel`}
                    onClick={() => handleSelectMember(member._id)}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      border: isSelected ? "2px solid var(--color-primary)" : undefined,
                    }}
                  >
                    <div className={styles.cardHeader}>
                      {isManagerOrAdmin && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectUser(member._id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      )}

                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatar}>{initials}</div>
                      )}
                      <div className={styles.memberMeta} style={{ flex: 1 }}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberRole}>{member.role}</span>
                      </div>

                      {isAdmin && !isSelf && (
                        <button
                          className={styles.btnDanger}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "var(--radius-sm)" }}
                          title="Remove Team Member"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(member);
                          }}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      )}
                    </div>

                    {/* Multi-Department Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {memberDepts.map((d) => (
                        <span key={d} className={styles.departmentBadge}>{d}</span>
                      ))}
                    </div>

                    <div className={styles.cardBody}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                        <i className="fa-solid fa-envelope" style={{ marginRight: "0.25rem" }}></i>{member.email}
                      </span>
                      {member.phone && (
                        <span style={{ fontSize: "0.8rem" }}>
                          <i className="fa-solid fa-phone" style={{ marginRight: "0.25rem" }}></i>{member.phone}
                        </span>
                      )}

                      {member.skills && member.skills.length > 0 && (
                        <div className={styles.skillsGroup}>
                          {member.skills.map((skill: string) => (
                            <span key={skill} className={styles.skillTag}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.reportingLine}>
                        <span>Reports to:</span>
                        <strong style={{ color: "var(--text-secondary)" }}>
                          {member.managerId?.name || "CEO"}
                        </strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <div
                          className={styles.statusIndicator}
                          style={{
                            backgroundColor:
                              member.status === "Active"
                                ? "var(--color-success)"
                                : member.status === "On Leave"
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                          }}
                        />
                        <span style={{ fontSize: "0.75rem" }}>{member.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className={`${styles.listTableCard} glass-panel`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {isManagerOrAdmin && (
                      <th className={styles.th} style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.length === users.length && users.length > 0}
                          onChange={toggleSelectAllUsers}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                    )}
                    <th className={styles.th}>Employee</th>
                    <th className={styles.th}>Departments</th>
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Reporting Line</th>
                    <th className={styles.th}>Status</th>
                    {isAdmin && <th className={styles.th} style={{ textAlign: "right" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase();

                    const isSelf = member._id === currentUser?._id;
                    const isSelected = selectedUserIds.includes(member._id);
                    const memberDepts: string[] = member.departments && member.departments.length > 0
                      ? member.departments
                      : [member.department || "General"];

                    return (
                      <tr
                        key={member._id}
                        className={styles.tr}
                        onClick={() => handleSelectMember(member._id)}
                        style={{ cursor: "pointer", background: isSelected ? "var(--color-primary-glow)" : undefined }}
                      >
                        {isManagerOrAdmin && (
                          <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectUser(member._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                        )}
                        <td className={styles.td}>
                          <div className={styles.tableUser}>
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.name} className={styles.tableAvatar} />
                            ) : (
                              <div className={styles.tableAvatar}>{initials}</div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 700 }}>{member.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", wordBreak: "break-all" }}>{member.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                            {memberDepts.map((d) => (
                              <span key={d} className={styles.departmentBadge}>{d}</span>
                            ))}
                          </div>
                        </td>
                        <td className={styles.td}>{member.role}</td>
                        <td className={styles.td}>{member.managerId?.name || "CEO / None"}</td>
                        <td className={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <div
                              className={styles.statusIndicator}
                              style={{
                                width: "6px",
                                height: "6px",
                                backgroundColor:
                                  member.status === "Active"
                                    ? "var(--color-success)"
                                    : member.status === "On Leave"
                                    ? "var(--color-warning)"
                                    : "var(--color-danger)",
                              }}
                            />
                            <span>{member.status}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className={styles.td} style={{ textAlign: "right" }}>
                            {!isSelf && (
                              <button
                                className={styles.btnDanger}
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "var(--radius-sm)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberToDelete(member);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedUserIds.length > 0 && isManagerOrAdmin && (
        <div className={styles.bulkActionBar}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            <i className="fa-solid fa-check-double" style={{ marginRight: "0.35rem", color: "var(--color-primary)" }}></i>
            {selectedUserIds.length} Member(s) Selected
          </span>

          <button
            className={styles.btnPrimary}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            onClick={() => {
              setBulkAssignDepts([]);
              setShowBulkAssignModal(true);
            }}
          >
            <i className="fa-solid fa-layer-group" style={{ marginRight: "0.25rem" }}></i> Assign Departments
          </button>

          {isAdmin && (
            <button
              className={styles.btnDanger}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <i className="fa-solid fa-user-xmark" style={{ marginRight: "0.25rem" }}></i> Bulk Remove
            </button>
          )}

          <button
            className={styles.btnSecondary}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            onClick={() => setSelectedUserIds([])}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* ----------------- Tab 2: Org Chart ----------------- */}
      {activeTab === "orgchart" && (
        <div className={`${styles.orgChartWrapper} glass-panel`}>
          {loading ? (
            <p style={{ alignSelf: "center", color: "var(--text-muted)" }}>Loading org chart tree...</p>
          ) : orgTreeRoots.length === 0 ? (
            <p style={{ alignSelf: "center", color: "var(--text-muted)" }}>No tree hierarchy found.</p>
          ) : (
            <div style={{ display: "flex", gap: "4rem" }}>
              {orgTreeRoots.map((root) => (
                <OrgChartNode
                  key={root._id}
                  node={root}
                  onReassign={handleReassign}
                  isAdmin={isAdmin}
                  onSelectMember={handleSelectMember}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- Tab 3: Manager Dashboard ----------------- */}
      {activeTab === "manager" && isManagerOrAdmin && (
        <div className={styles.managerPanelGrid}>
          {/* Left panel: Direct Reports list */}
          <div className={`${styles.memberCard} glass-panel`} style={{ height: "fit-content" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <i className="fa-solid fa-users" style={{ marginRight: "0.25rem", color: "var(--color-primary)" }}></i> Direct Reports ({directReports.length})
            </h2>

            {directReports.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "1rem 0" }}>
                You do not have any direct reports assigned.
              </p>
            ) : (
              <div className={styles.directReportsCard}>
                {directReports.map((report) => {
                  const initials = report.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <div
                      key={report._id}
                      className={styles.reportItem}
                      onClick={() => handleSelectMember(report._id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className={styles.reportUser}>
                        {report.photoUrl ? (
                          <img src={report.photoUrl} alt={report.name} className={styles.reportAvatar} />
                        ) : (
                          <div className={styles.reportAvatar}>{initials}</div>
                        )}
                        <div className={styles.reportMeta}>
                          <span className={styles.reportName}>{report.name}</span>
                          <span className={styles.reportDept}>{report.department}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <div
                          className={styles.statusIndicator}
                          style={{
                            width: "6px",
                            height: "6px",
                            backgroundColor:
                              report.status === "Active"
                                ? "var(--color-success)"
                                : report.status === "On Leave"
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                          }}
                        />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{report.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: KPI status */}
          <div className={`${styles.memberCard} glass-panel`}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <i className="fa-solid fa-list-check" style={{ marginRight: "0.25rem", color: "var(--color-primary)" }}></i> Team KPI Status & Pending Approvals
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: "0.25rem", color: "var(--color-warning)" }}></i> Timesheet Approvals
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  No pending timesheet approvals this week. All team hours logged are fully up to date.
                </p>
              </div>

              <div style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  <i className="fa-solid fa-umbrella-beach" style={{ marginRight: "0.25rem", color: "var(--color-success)" }}></i> Time Off Requests
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  No pending leave requests from your direct reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Tab 4: Departments CRUD ----------------- */}
      {activeTab === "departments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Company Departments</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Manage organizational departments, descriptions, and code identifiers. Click on assigned members to view employee details.
              </p>
            </div>
            {isManagerOrAdmin && (
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  setEditingDept(null);
                  setDeptFormName("");
                  setDeptFormDesc("");
                  setDeptFormCode("");
                  setDeptFormError("");
                  setShowAddDeptModal(true);
                }}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: "0.25rem" }}></i> Create Department
              </button>
            )}
          </div>

          {deptLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading departments...</p>
          ) : departmentsList.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No departments found.</p>
          ) : (
            <div className={styles.cardGrid}>
              {departmentsList.map((dept) => {
                const count = users.filter((u) => {
                  const depts = u.departments || [u.department];
                  return depts.includes(dept.name);
                }).length;

                return (
                  <div key={dept._id} className={`${styles.memberCard} glass-panel`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{dept.name}</h3>
                          {dept.code && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.4rem",
                                background: "var(--color-primary-glow)",
                                color: "var(--color-primary)",
                                borderRadius: "var(--radius-sm)",
                              }}
                            >
                              {dept.code}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                          {dept.description || "No description provided."}
                        </p>
                      </div>

                      {isManagerOrAdmin && (
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            className={styles.btnSecondary}
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                            title="Edit Department"
                            onClick={() => {
                              setEditingDept(dept);
                              setDeptFormName(dept.name);
                              setDeptFormDesc(dept.description || "");
                              setDeptFormCode(dept.code || "");
                              setDeptFormError("");
                              setShowAddDeptModal(true);
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          {isAdmin && (
                            <button
                              className={styles.btnDanger}
                              style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                              title="Delete Department"
                              onClick={() => setDeptToDelete(dept)}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "0.75rem",
                        marginTop: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        background: "rgba(99, 102, 241, 0.04)",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-md)",
                        transition: "all var(--transition-fast)",
                      }}
                      onClick={() => setViewingDeptMembers(dept)}
                      title="Click to view assigned members"
                    >
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        <i className="fa-solid fa-users" style={{ marginRight: "0.35rem", color: "var(--color-primary)" }}></i>
                        Assigned Members
                      </span>
                      <strong style={{ color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        {count} Employees <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.75rem" }}></i>
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- Assigned Members Modal ----------------- */}
      {viewingDeptMembers && (
        <div className={styles.modalOverlay} onClick={() => setViewingDeptMembers(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <span className={styles.closeBtn} onClick={() => setViewingDeptMembers(null)}>
              ×
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-building" style={{ fontSize: "1.4rem", color: "var(--color-primary)" }}></i>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                {viewingDeptMembers.name} Assigned Members
              </h2>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {viewingDeptMembers.description || "Employees currently assigned to this department."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto", marginTop: "0.5rem" }}>
              {users.filter((u) => {
                const depts = u.departments || [u.department];
                return depts.includes(viewingDeptMembers.name);
              }).length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                  No members are currently assigned to this department.
                </p>
              ) : (
                users
                  .filter((u) => {
                    const depts = u.departments || [u.department];
                    return depts.includes(viewingDeptMembers.name);
                  })
                  .map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={member._id}
                        className={styles.reportItem}
                        onClick={() => {
                          handleSelectMember(member._id);
                          setViewingDeptMembers(null);
                        }}
                        style={{ cursor: "pointer", padding: "0.75rem" }}
                      >
                        <div className={styles.reportUser}>
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className={styles.reportAvatar} />
                          ) : (
                            <div className={styles.reportAvatar}>{initials}</div>
                          )}
                          <div className={styles.reportMeta}>
                            <span className={styles.reportName}>{member.name}</span>
                            <span className={styles.reportDept}>{member.role} • {member.email}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{member.status || "Active"}</span>
                          <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}></i>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setDepartmentFilter(viewingDeptMembers.name);
                  setActiveTab("directory");
                  setViewingDeptMembers(null);
                }}
              >
                <i className="fa-solid fa-filter" style={{ marginRight: "0.25rem" }}></i> Filter in Directory
              </button>
              <button className={styles.btnPrimary} onClick={() => setViewingDeptMembers(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Profile Modal ----------------- */}
      {selectedMember && (
        <div className={styles.modalOverlay} onClick={() => setSelectedMember(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setSelectedMember(null)}>
              ×
            </span>

            {/* Profile Header */}
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              {selectedMember.photoUrl ? (
                <img
                  src={selectedMember.photoUrl}
                  alt={selectedMember.name}
                  className={styles.avatar}
                  style={{ width: "70px", height: "70px" }}
                />
              ) : (
                <div className={styles.avatar} style={{ width: "70px", height: "70px", fontSize: "1.6rem" }}>
                  {selectedMember.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{selectedMember.name}</h2>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  {selectedMember.role}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
                  {(selectedMember.departments && selectedMember.departments.length > 0
                    ? selectedMember.departments
                    : [selectedMember.department || "General"]
                  ).map((d: string) => (
                    <span key={d} className={styles.departmentBadge}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Body */}
            {isEditingBio ? (
              <form onSubmit={handleUpdateProfile} className={styles.form} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +1-555-0199"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={editSkillsText}
                      onChange={(e) => setEditSkillsText(e.target.value)}
                      placeholder="e.g. React, Next.js, CSS"
                      className={styles.input}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Assigned Departments (Select Multiple)</label>
                    <div className={styles.deptCheckboxGroup}>
                      {departmentsList.map((d) => {
                        const checked = editDepts.includes(d.name);
                        return (
                          <label
                            key={d._id}
                            className={`${styles.deptCheckboxPill} ${checked ? styles.deptCheckboxPillActive : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setEditDepts((prev) =>
                                  prev.includes(d.name)
                                    ? prev.filter((name) => name !== d.name)
                                    : [...prev, d.name]
                                );
                              }}
                              style={{ display: "none" }}
                            />
                            {d.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Biography</label>
                  <textarea
                    value={editBioText}
                    onChange={(e) => setEditBioText(e.target.value)}
                    className={styles.input}
                    style={{ width: "100%", height: "70px", resize: "vertical" }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Profile Picture (Upload)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {editPhotoUrl ? (
                      <img
                        src={editPhotoUrl}
                        alt="Preview"
                        style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }}
                      />
                    ) : (
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        No Pic
                      </div>
                    )}
                    <label className={styles.btnSecondary} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      <i className="fa-solid fa-cloud-arrow-up"></i> Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            setUploadingPhoto(true);
                            const formData = new FormData();
                            formData.append("file", files[0]);
                            try {
                              const res = await fetch("/api/team/upload-photo", {
                                method: "POST",
                                body: formData,
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setEditPhotoUrl(data.photoUrl);
                                showToast("Photo uploaded successfully!", "success");
                              } else {
                                const data = await res.json();
                                showToast(data.error || "Failed to upload photo.", "error");
                              }
                            } catch (err) {
                              console.error(err);
                              showToast("Error uploading photo.", "error");
                            } finally {
                              setUploadingPhoto(false);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {uploadingPhoto && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Uploading image...</span>}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setIsEditingBio(false)} disabled={isUpdating}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={uploadingPhoto || isUpdating}>
                    {isUpdating ? "Saving changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <div>
                  <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Bio
                  </strong>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {selectedMember.bio || "No biography provided."}
                  </p>
                </div>

                <div>
                  <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Skills
                  </strong>
                  <div className={styles.skillsGroup} style={{ marginTop: "0.25rem" }}>
                    {selectedMember.skills && selectedMember.skills.length > 0 ? (
                      selectedMember.skills.map((skill: string) => (
                        <span key={skill} className={styles.skillTag}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No skills listed.</span>
                    )}
                  </div>
                </div>

                {/* Contact Details */}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", fontSize: "0.85rem" }}>
                  <div>
                    <i className="fa-solid fa-envelope" style={{ marginRight: "0.25rem", color: "var(--text-muted)" }}></i> {selectedMember.email}
                  </div>
                  {selectedMember.phone && (
                    <div>
                      <i className="fa-solid fa-phone" style={{ marginRight: "0.25rem", color: "var(--text-muted)" }}></i> {selectedMember.phone}
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <div>
                    <i className="fa-solid fa-user-tie" style={{ marginRight: "0.25rem", color: "var(--text-muted)" }}></i> Reports To: <strong>{selectedMember.managerId?.name || "CEO"}</strong>
                  </div>
                  <div>
                    <i className="fa-solid fa-calendar-check" style={{ marginRight: "0.25rem", color: "var(--text-muted)" }}></i> Joined: <strong>{new Date(selectedMember.joinDate || selectedMember.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>

                {/* Edit & Remove Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                  {isAdmin && selectedMember._id !== currentUser?._id ? (
                    <button
                      className={styles.btnDanger}
                      onClick={() => setMemberToDelete(selectedMember)}
                    >
                      <i className="fa-solid fa-trash-can" style={{ marginRight: "0.25rem" }}></i> Remove Employee
                    </button>
                  ) : <div />}

                  {selectedMember._id === currentUser?._id && (
                    <button
                      className={styles.btnSecondary}
                      onClick={() => setIsEditingBio(true)}
                    >
                      <i className="fa-solid fa-pen-to-square" style={{ marginRight: "0.25rem" }}></i> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- Single Add Employee Modal ----------------- */}
      {showAddForm && isManagerOrAdmin && (
        <div className={styles.modalOverlay} onClick={() => setShowAddForm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowAddForm(false)}>
              ×
            </span>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              <i className="fa-solid fa-user-plus" style={{ marginRight: "0.5rem", color: "var(--color-primary)" }}></i> Add New Employee
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Create a record inside your workspace. Hashed default password is `password123`.
            </p>

            {formError && <div className={styles.generalError}>{formError}</div>}
            {formSuccess && <div className={styles.generalError} style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--color-success)", borderColor: "rgba(16, 185, 129, 0.2)" }}>{formSuccess}</div>}

            <form onSubmit={handleAddEmployee} className={styles.form} style={{ marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@acme.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Assign Departments (Select Multiple)</label>
                <div className={styles.deptCheckboxGroup}>
                  {departmentsList.map((d) => {
                    const checked = addDepts.includes(d.name);
                    return (
                      <label
                        key={d._id}
                        className={`${styles.deptCheckboxPill} ${checked ? styles.deptCheckboxPillActive : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setAddDepts((prev) =>
                              prev.includes(d.name)
                                ? prev.filter((name) => name !== d.name)
                                : [...prev, d.name]
                            );
                          }}
                          style={{ display: "none" }}
                        />
                        {d.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Role</label>
                  <select
                    className={styles.select}
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Reports To (Manager)</label>
                  <select
                    className={styles.select}
                    value={addManagerId}
                    onChange={(e) => setAddManagerId(e.target.value)}
                  >
                    <option value="">None (Reports to CEO)</option>
                    {users
                      .filter((u) => u.role === "Manager" || u.role === "Admin")
                      .map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Skills / Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Figma, SEO"
                  value={addSkills}
                  onChange={(e) => setAddSkills(e.target.value)}
                  className={styles.input}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                Add Employee Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- Bulk Add Team Members Modal ----------------- */}
      {showBulkAddModal && isManagerOrAdmin && (
        <div className={styles.modalOverlay} onClick={() => setShowBulkAddModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <span className={styles.closeBtn} onClick={() => setShowBulkAddModal(false)}>
              ×
            </span>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              <i className="fa-solid fa-users-gear" style={{ marginRight: "0.5rem", color: "var(--color-primary)" }}></i>
              Bulk Add Team Members
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Add multiple employees at once and assign each to one or multiple departments.
            </p>

            {bulkAddError && <div className={styles.generalError}>{bulkAddError}</div>}

            <form onSubmit={handleBulkAddSubmit} className={styles.form} style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {bulkRows.map((row, idx) => (
                  <div key={row.id} className={styles.bulkRow}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={row.name}
                      onChange={(e) => {
                        const updated = [...bulkRows];
                        updated[idx].name = e.target.value;
                        setBulkRows(updated);
                      }}
                      className={styles.input}
                      required
                    />

                    <input
                      type="email"
                      placeholder="Email Address"
                      value={row.email}
                      onChange={(e) => {
                        const updated = [...bulkRows];
                        updated[idx].email = e.target.value;
                        setBulkRows(updated);
                      }}
                      className={styles.input}
                      required
                    />

                    <select
                      className={styles.select}
                      value={row.role}
                      onChange={(e) => {
                        const updated = [...bulkRows];
                        updated[idx].role = e.target.value;
                        setBulkRows(updated);
                      }}
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>

                    <div className={styles.deptCheckboxGroup}>
                      {departmentsList.slice(0, 4).map((d) => {
                        const checked = row.departments.includes(d.name);
                        return (
                          <label
                            key={d._id}
                            className={`${styles.deptCheckboxPill} ${checked ? styles.deptCheckboxPillActive : ""}`}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const updated = [...bulkRows];
                                const current = updated[idx].departments;
                                updated[idx].departments = current.includes(d.name)
                                  ? current.filter((n) => n !== d.name)
                                  : [...current, d.name];
                                setBulkRows(updated);
                              }}
                              style={{ display: "none" }}
                            />
                            {d.name}
                          </label>
                        );
                      })}
                    </div>

                    <select
                      className={styles.select}
                      value={row.managerId}
                      onChange={(e) => {
                        const updated = [...bulkRows];
                        updated[idx].managerId = e.target.value;
                        setBulkRows(updated);
                      }}
                    >
                      <option value="">Manager: CEO</option>
                      {users.filter((u) => u.role === "Manager" || u.role === "Admin").map((m) => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className={styles.btnDanger}
                      style={{ padding: "0.4rem", borderRadius: "var(--radius-sm)" }}
                      onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))}
                      disabled={bulkRows.length <= 1}
                    >
                      <i className="fa-solid fa-minus"></i>
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setBulkRows([...bulkRows, { id: Date.now().toString(), name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" }])}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: "0.25rem" }}></i> Add Row
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setShowBulkAddModal(false)} disabled={isSubmittingBulkAdd}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={isSubmittingBulkAdd}>
                    {isSubmittingBulkAdd ? "Creating Members..." : `Create ${bulkRows.filter(r => r.name && r.email).length} Members`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- Bulk Assign Departments Modal ----------------- */}
      {showBulkAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBulkAssignModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <span className={styles.closeBtn} onClick={() => setShowBulkAssignModal(false)}>
              ×
            </span>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              <i className="fa-solid fa-layer-group" style={{ marginRight: "0.5rem", color: "var(--color-primary)" }}></i>
              Bulk Assign Departments
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Assign multiple departments to the <strong>{selectedUserIds.length}</strong> selected team members.
            </p>

            <form onSubmit={handleBulkAssignDepartments} className={styles.form} style={{ marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Assignment Mode</label>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <input
                      type="radio"
                      name="mode"
                      value="add"
                      checked={bulkAssignMode === "add"}
                      onChange={() => setBulkAssignMode("add")}
                    /> Add to existing departments
                  </label>
                  <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <input
                      type="radio"
                      name="mode"
                      value="set"
                      checked={bulkAssignMode === "set"}
                      onChange={() => setBulkAssignMode("set")}
                    /> Replace departments
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Select Departments</label>
                <div className={styles.deptCheckboxGroup}>
                  {departmentsList.map((d) => {
                    const checked = bulkAssignDepts.includes(d.name);
                    return (
                      <label
                        key={d._id}
                        className={`${styles.deptCheckboxPill} ${checked ? styles.deptCheckboxPillActive : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setBulkAssignDepts((prev) =>
                              prev.includes(d.name)
                                ? prev.filter((name) => name !== d.name)
                                : [...prev, d.name]
                            );
                          }}
                          style={{ display: "none" }}
                        />
                        {d.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowBulkAssignModal(false)} disabled={isSubmittingBulkAssign}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmittingBulkAssign}>
                  {isSubmittingBulkAssign ? "Assigning..." : "Apply Assignments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- Confirm Delete Department Modal ----------------- */}
      {deptToDelete && (
        <div className={styles.modalOverlay} onClick={() => setDeptToDelete(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-danger)" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "0.5rem" }}></i>
              Delete Department
            </h2>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete the <strong>{deptToDelete.name}</strong> department?
              Members currently assigned to this department will be reassigned to <strong>General</strong>.
            </p>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className={styles.btnSecondary} onClick={() => setDeptToDelete(null)} disabled={isSubmittingDept}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={handleConfirmDeleteDepartment} disabled={isSubmittingDept}>
                {isSubmittingDept ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Confirm Delete Single Team Member Modal ----------------- */}
      {memberToDelete && (
        <div className={styles.modalOverlay} onClick={() => setMemberToDelete(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-danger)" }}>
              <i className="fa-solid fa-user-xmark" style={{ marginRight: "0.5rem" }}></i>
              Remove Team Member
            </h2>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to remove <strong>{memberToDelete.name}</strong> ({memberToDelete.email}) from the company?
              <br /><br />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                * Direct reports belonging to this employee will automatically be re-assigned to their manager.
              </span>
            </p>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className={styles.btnSecondary} onClick={() => setMemberToDelete(null)} disabled={isDeletingMember}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={handleConfirmDeleteMember} disabled={isDeletingMember}>
                {isDeletingMember ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Confirm Bulk Delete Modal ----------------- */}
      {showBulkDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-danger)" }}>
              <i className="fa-solid fa-users-slash" style={{ marginRight: "0.5rem" }}></i>
              Bulk Remove Team Members
            </h2>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to remove <strong>{selectedUserIds.length}</strong> selected team members from the organization?
            </p>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className={styles.btnSecondary} onClick={() => setShowBulkDeleteConfirm(false)} disabled={isDeletingBulk}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={handleConfirmBulkDelete} disabled={isDeletingBulk}>
                {isDeletingBulk ? "Removing..." : "Confirm Bulk Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Create/Edit Department Modal ----------------- */}
      {showAddDeptModal && isManagerOrAdmin && (
        <div className={styles.modalOverlay} onClick={() => setShowAddDeptModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowAddDeptModal(false)}>
              ×
            </span>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              <i className="fa-solid fa-building" style={{ marginRight: "0.5rem", color: "var(--color-primary)" }}></i>
              {editingDept ? "Edit Department" : "Create New Department"}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Define department name, optional code identifier, and summary description.
            </p>

            {deptFormError && <div className={styles.generalError}>{deptFormError}</div>}

            <form onSubmit={handleSaveDepartment} className={styles.form} style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Product Engineering"
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Code Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. ENG"
                    value={deptFormCode}
                    onChange={(e) => setDeptFormCode(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  placeholder="Summary of department responsibilities and team mandate..."
                  value={deptFormDesc}
                  onChange={(e) => setDeptFormDesc(e.target.value)}
                  className={styles.input}
                  style={{ width: "100%", height: "80px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowAddDeptModal(false)} disabled={isSubmittingDept}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmittingDept}>
                  {isSubmittingDept ? "Saving..." : editingDept ? "Update Department" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          <i className={toast.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}
