"use client";

import React, { useState, useEffect, useMemo, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Preloader } from "@/components/ui/Preloader";
import { OrgChartNode, OrgNode } from "@/components/features/OrgChartNode";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { isSubAdminRole } from "@/lib/roles";

interface IDepartmentItem {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  managerId?: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    photoUrl?: string;
  } | string | null;
}

interface IBulkAddRow {
  id: string;
  name: string;
  email: string;
  role: string;
  departments: string[];
  managerId: string;
}

const generateDeptCode = (name: string): string => {
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  if (!clean) return "";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    // Single word: first 3 letters uppercase
    return words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words: initials uppercase
    return words.map(w => w[0].toUpperCase()).join("");
  }
};

export default function TeamDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();
  const { canAccessModule, loading: permLoading } = usePermissions();
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
  const [orgZoom, setOrgZoom] = useState(1);

  // Bulk Member Selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignDepts, setBulkAssignDepts] = useState<string[]>([]);
  const [bulkAssignMode, setBulkAssignMode] = useState<"set" | "add">("add");
  const [isSubmittingBulkAssign, setIsSubmittingBulkAssign] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Bulk Add Modal States
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<IBulkAddRow[]>([
    { id: "1", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
    { id: "2", name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
  ]);
  const [bulkAddError, setBulkAddError] = useState("");
  const [isSubmittingBulkAdd, setIsSubmittingBulkAdd] = useState(false);

  // Remove Single Employee State
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
  const memberFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepts, setEditDepts] = useState<string[]>(["Engineering"]);
  const [editRole, setEditRole] = useState("Employee");
  const [editSocialLinkedin, setEditSocialLinkedin] = useState("");
  const [editSocialTwitter, setEditSocialTwitter] = useState("");
  const [editSocialGithub, setEditSocialGithub] = useState("");
  const [editSocialWebsite, setEditSocialWebsite] = useState("");
  const [editSocialInstagram, setEditSocialInstagram] = useState("");
  const [editSocialFacebook, setEditSocialFacebook] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination state for Team Directory
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Add Single Employee Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("Employee");
  const [addDepts, setAddDepts] = useState<string[]>(["Engineering"]);
  const [addManagerId, setAddManagerId] = useState("");
  const [addSkills, setAddSkills] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);


  // Department CRUD States
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<IDepartmentItem | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<IDepartmentItem | null>(null);

  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormDesc, setDeptFormDesc] = useState("");
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormManagerId, setDeptFormManagerId] = useState("");
  const [deptFormError, setDeptFormError] = useState("");
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  const handleDeptNameChange = (val: string) => {
    setDeptFormName(val);
    const previousAutoGenerated = generateDeptCode(deptFormName);
    if (!deptFormCode || deptFormCode === previousAutoGenerated) {
      setDeptFormCode(generateDeptCode(val));
    }
  };

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // URL & LocalStorage Active Tab Persistence
  useEffect(() => {
    setMounted(true);

    if (!permLoading && currentUser && !canAccessModule("team")) {
      router.replace("/dashboard");
      return;
    }

    const tabFromUrl = searchParams.get("tab") as any;
    const tabFromStorage = typeof window !== "undefined" ? localStorage.getItem("team_active_tab") as any : null;
    const validTabs = ["directory", "orgchart", "manager", "departments"];

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (tabFromStorage && validTabs.includes(tabFromStorage)) {
      setActiveTab(tabFromStorage);
    }
  }, [searchParams, permLoading, currentUser]);

  const handleTabChange = (tab: "directory" | "orgchart" | "manager" | "departments") => {
    startTransition(() => {
      setActiveTab(tab);
      if (typeof window !== "undefined") {
        localStorage.setItem("team_active_tab", tab);
      }
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      router.replace(`/dashboard/team?${params.toString()}`, { scroll: false });
      if (tab === "departments") {
        fetchDepartments();
      }
    });
  };

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (editName && editName.trim().toLowerCase() !== (selectedMember.name || "").trim().toLowerCase()) {
      const trimmedEditName = editName.trim().toLowerCase();
      const isDuplicate = users.some(
        (u) => u._id !== selectedMember._id && u.name && u.name.trim().toLowerCase() === trimmedEditName
      );
      if (isDuplicate) {
        showToast(`An employee named "${editName.trim()}" already exists in this workspace.`, "error");
        return;
      }
    }

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
        socialLinks: {
          linkedin: editSocialLinkedin,
          twitter: editSocialTwitter,
          github: editSocialGithub,
          website: editSocialWebsite,
          instagram: editSocialInstagram,
          facebook: editSocialFacebook,
        },
      };

      if (isAdmin) {
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
        // Optimistically update the local users list and selectedMember immediately
        // so the role/name/dept reflects the new value without stale state
        const updatedUser = data.user || { ...selectedMember, ...updateData };
        setUsers((prev) =>
          prev.map((u) => (u._id === selectedMember._id ? { ...u, ...updatedUser } : u))
        );
        setSelectedMember((prev: any) => (prev ? { ...prev, ...updatedUser } : prev));
        showToast("Profile updated successfully!", "success");
        // Background re-fetch to sync with server (keeps drawer open)
        fetchTeam();
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

  const handleUploadMemberPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (PNG, JPG, WebP, GIF).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Profile image must be smaller than 5MB.", "error");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/team/upload-photo", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.photoUrl) {
        throw new Error(uploadData.error || "Failed to upload photo");
      }

      setEditPhotoUrl(uploadData.photoUrl);
      setSelectedMember((prev: any) => prev ? { ...prev, photoUrl: uploadData.photoUrl } : null);

      // Save directly to user profile
      const updateRes = await fetch(`/api/team/${selectedMember._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: uploadData.photoUrl }),
      });

      if (updateRes.ok) {
        await fetchTeam();
        if (currentUser?._id === selectedMember._id) {
          await refreshUser();
        }
        showToast("Profile photo updated successfully!", "success");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload photo", "error");
    } finally {
      setUploadingPhoto(false);
      if (memberFileInputRef.current) memberFileInputRef.current.value = "";
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!addName || !addEmail) {
      setFormError("Name and Email are required fields.");
      return;
    }

    const trimmedName = addName.trim().toLowerCase();
    const isDuplicateName = users.some(
      (u) => u.name && u.name.trim().toLowerCase() === trimmedName
    );
    if (isDuplicateName) {
      setFormError(`An employee named "${addName.trim()}" already exists in this workspace.`);
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
        setCreatedTempPassword(data.tempPassword || null);
        setFormSuccess(data.tempPassword
          ? "Employee added! Temporary password generated (shown below)."
          : "Employee added successfully!");
        setAddName("");
        setAddEmail("");
        setAddSkills("");
        setAddManagerId("");
         await fetchTeam();
         if (!data.tempPassword) {
           setTimeout(() => {
             setShowAddForm(false);
             setFormSuccess("");
           }, 1500);
         }
      } else {
        setFormError(data.error || "Failed to add employee.");
      }
    } catch (error) {
      console.error("Add employee error:", error);
      setFormError("An error occurred. Please try again.");
    }
  };

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
          managerId: deptFormManagerId || null,
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
        setDeptFormManagerId("");
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
      setEditSocialLinkedin(member.socialLinks?.linkedin || "");
      setEditSocialTwitter(member.socialLinks?.twitter || "");
      setEditSocialGithub(member.socialLinks?.github || "");
      setEditSocialWebsite(member.socialLinks?.website || "");
      setEditSocialInstagram(member.socialLinks?.instagram || "");
      setEditSocialFacebook(member.socialLinks?.facebook || "");
      setIsEditingBio(false);
    }
  };

  const orgTreeRoots = useMemo(() => {
    const filteredUsers = departmentFilter && departmentFilter !== "All"
      ? users.filter((u) => u.department === departmentFilter || (u.departments && u.departments.includes(departmentFilter)))
      : users;

    const userMap: { [key: string]: OrgNode } = {};
    const rootNodes: OrgNode[] = [];
    // Guard: track placed nodes to prevent any user appearing twice in the tree
    const placedIds = new Set<string>();

    const roleWeight = (role: string) => {
      const r = (role || "").toLowerCase().trim();
      if (r === "admin") return 0;
      if (r === "ops" || r === "sub admin" || r === "subadmin" || r === "sub-admin") return 1;
      if (r === "manager") return 2;
      if (r === "hr") return 3;
      return 4; // Employee and others
    };

    filteredUsers.forEach((u) => {
      userMap[u._id] = {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || "Engineering",
        photoUrl: u.photoUrl,
        status: u.status || "Active",
        managerId: u.managerId?._id || u.managerId,
        managerName: u.managerId?.name || undefined,
        reports: [],
      };
    });

    const globalFirstAdmin = filteredUsers.find((u) => u.role === "Admin")?._id || users.find((u) => u.role === "Admin")?._id || null;
    const globalFirstManager = filteredUsers.find((u) => u.role === "Manager")?._id || users.find((u) => u.role === "Manager")?._id || null;

    filteredUsers.forEach((u) => {
      const node = userMap[u._id];
      const managerId = u.managerId?._id || u.managerId;
      const managerNode = managerId ? userMap[managerId] : null;

      const deptManager = filteredUsers.find(
        (m) => (m.role === "Manager" || m.role === "OPS" || m.role === "Admin") && m._id !== u._id && (m.department === u.department || (m.departments && u.departments && m.departments.some((d: string) => u.departments.includes(d))))
      )?._id;

      const fallbackManagerId = deptManager || globalFirstAdmin || globalFirstManager;

      const isTopLevelRole = u.role === "Admin" || u.role === "OPS" || isSubAdminRole(u.role);

      // 1. Explicit assigned manager exists in current view
      if (managerId && managerNode && managerId !== u._id && !placedIds.has(u._id)) {
        node.managerName = managerNode.name;
        userMap[managerId].reports.push(node);
        placedIds.add(u._id);
      }
      // 2. Non-top-level user with no explicit manager: nest under top workspace Admin / OPS / Manager
      else if (!isTopLevelRole && fallbackManagerId && fallbackManagerId !== u._id && userMap[fallbackManagerId] && !placedIds.has(u._id)) {
        node.managerName = userMap[fallbackManagerId].name;
        userMap[fallbackManagerId].reports.push(node);
        placedIds.add(u._id);
      }
      // 3. Root Level (Admin, OPS, or unassigned top-level) — only if not already placed
      else if (!placedIds.has(u._id)) {
        rootNodes.push(node);
        placedIds.add(u._id);
      }
    });

    Object.values(userMap).forEach((node) => {
      node.reports.sort((a, b) => roleWeight(a.role) - roleWeight(b.role) || a.name.localeCompare(b.name));
    });

    rootNodes.sort((a, b) => roleWeight(a.role) - roleWeight(b.role) || a.name.localeCompare(b.name));

    return rootNodes;
  }, [users, departmentFilter]);

  const userRole = useMemo(() => (currentUser?.role || "").trim(), [currentUser?.role]);
  const isAdmin = Boolean(userRole && (userRole.toLowerCase() === "admin" || isSubAdminRole(userRole)));
  const isManagerOrAdmin = Boolean(isAdmin || userRole.toLowerCase() === "manager");

  const directReports = useMemo(() => {
    return users.filter((u) => {
      const mgrId = u.managerId?._id || u.managerId;
      return mgrId === currentUser?._id;
    });
  }, [users, currentUser?._id]);

  const filteredUsers = useMemo(() => {
    return users.filter((m) => {
      const matchesDept = departmentFilter === "All" || m.department === departmentFilter || (m.departments && m.departments.includes(departmentFilter));
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query ||
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.role?.toLowerCase().includes(query) ||
        m.phone?.includes(query) ||
        (m.skills && m.skills.some((s: string) => s.toLowerCase().includes(query)));
      return matchesDept && matchesQuery;
    });
  }, [users, departmentFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, itemsPerPage]);

  // Auto-set reporting manager to first HR when adding an Employee
  useEffect(() => {
    if (addRole === "Employee") {
      const firstHR = users.find((u) => u.role === "HR");
      if (firstHR) {
        setAddManagerId(firstHR._id);
      }
    } else {
      setAddManagerId("");
    }
  }, [addRole, users]);

  if (!mounted || authLoading || permLoading || (currentUser && !canAccessModule("team"))) {
    return <Preloader label="Loading Team Directory & Hierarchy..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? <i className="fa-solid fa-circle-check" /> : <i className="fa-solid fa-circle-exclamation" />}
          {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organization members, department allocations, and reporting hierarchy.
          </p>
        </div>

        {isManagerOrAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkAddModal(true)}
              className="gap-2"
            >
              <i className="fa-solid fa-people-group" /> Bulk Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingDept(null);
                setDeptFormName("");
                setDeptFormDesc("");
                setDeptFormCode("");
                setDeptFormManagerId("");
                setDeptFormError("");
                setShowAddDeptModal(true);
              }}
              className="gap-2"
            >
              <i className="fa-solid fa-building" /> Add Department
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/clients?tab=external")}
              className="gap-2 text-xs font-semibold cursor-pointer border-primary/30 hover:border-primary text-primary"
            >
              <i className="fa-solid fa-building-user" /> External Teams Panel
            </Button>
            <Button
              color="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="gap-2"
            >
              <i className="fa-solid fa-user-plus" /> Add Employee
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange("directory")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "directory"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-users" /> Directory ({filteredUsers.length})
        </button>

        <button
          onClick={() => handleTabChange("orgchart")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "orgchart"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-sitemap" /> Org Chart (Hierarchy)
        </button>

        {isManagerOrAdmin && (
          <button
            onClick={() => handleTabChange("manager")}
            className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "manager"
                ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-crown text-amber-500" /> Manager Panel
          </button>
        )}

        <button
          onClick={() => handleTabChange("departments")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "departments"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-layer-group" /> Departments ({departmentsList.length})
        </button>
      </div>

      {/* Directory Tab */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  type="text"
                  placeholder="Search name, email, skills, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map((dept) => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center border border-border rounded-md overflow-hidden bg-muted/40">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn("p-2 transition-colors cursor-pointer", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="Grid View"
                  >
                    <i className="fa-solid fa-grip" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn("p-2 transition-colors cursor-pointer", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="List View"
                  >
                    <i className="fa-solid fa-list" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Cards Grid or Table */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading team members...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No team members match your filter.</div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedUsers.map((member) => {
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
                  <Card
                    key={member._id}
                    onClick={() => handleSelectMember(member._id)}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all relative overflow-hidden group",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isManagerOrAdmin && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectUser(member._id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            />
                          )}

                          <Avatar size="default">
                            {member.photoUrl ? (
                              <AvatarImage src={member.photoUrl} alt={member.name} />
                            ) : (
                              <AvatarFallback>{initials}</AvatarFallback>
                            )}
                          </Avatar>

                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {member.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                          </div>
                        </div>

                        {isAdmin && !isSelf && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete(member);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            title="Remove Member"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {memberDepts.map((d) => (
                          <Badge key={d} color="primary" variant="soft" rounded="full">
                            {d}
                          </Badge>
                        ))}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <p className="flex items-center gap-2 truncate">
                          <i className="fa-solid fa-envelope shrink-0 text-xs" /> {member.email}
                        </p>
                        {member.phone && (
                          <p className="flex items-center gap-2 truncate">
                            <i className="fa-solid fa-phone shrink-0 text-xs" /> {member.phone}
                          </p>
                        )}
                      </div>

                      {/* Social media icons on card (Rendered at last of section) */}
                      {member.socialLinks && (member.socialLinks.linkedin || member.socialLinks.twitter || member.socialLinks.github || member.socialLinks.website || member.socialLinks.instagram || member.socialLinks.facebook) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                          {member.socialLinks.linkedin && (
                            <a
                              href={member.socialLinks.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-sky-500/20 group/icon"
                              title="LinkedIn Profile"
                            >
                              <i className="fa-brands fa-linkedin text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                          {member.socialLinks.twitter && (
                            <a
                              href={member.socialLinks.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-foreground/10 hover:bg-foreground text-foreground hover:text-background border border-foreground/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md group/icon"
                              title="Twitter / X Profile"
                            >
                              <i className="fa-brands fa-x-twitter text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                          {member.socialLinks.instagram && (
                            <a
                              href={member.socialLinks.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-pink-500/10 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 text-pink-500 hover:text-white border border-pink-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-pink-500/20 group/icon"
                              title="Instagram Profile"
                            >
                              <i className="fa-brands fa-instagram text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                          {member.socialLinks.facebook && (
                            <a
                              href={member.socialLinks.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-600/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-blue-600/20 group/icon"
                              title="Facebook Profile"
                            >
                              <i className="fa-brands fa-facebook text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                          {member.socialLinks.github && (
                            <a
                              href={member.socialLinks.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-slate-500/10 hover:bg-slate-900 dark:hover:bg-slate-100 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-slate-950 border border-slate-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md group/icon"
                              title="GitHub Profile"
                            >
                              <i className="fa-brands fa-github text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                          {member.socialLinks.website && (
                            <a
                              href={member.socialLinks.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-emerald-500/20 group/icon"
                              title="Personal Website"
                            >
                              <i className="fa-solid fa-globe text-xs transition-transform duration-200 group-hover/icon:scale-110" />
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-muted-foreground">Reports to: <strong className="text-foreground">{member.managerId?.name || "CEO"}</strong></span>
                        <Badge
                          color={member.status === "Active" ? "success" : member.status === "On Leave" ? "warning" : "destructive"}
                          variant="soft"
                        >
                          {member.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View */
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                    <tr>
                      {isManagerOrAdmin && (
                        <th className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={toggleSelectAllUsers}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </th>
                      )}
                      <th className="p-4 font-semibold">Employee</th>
                      <th className="p-4 font-semibold">Departments</th>
                      <th className="p-4 font-semibold">Role</th>
                      <th className="p-4 font-semibold">Social Profiles</th>
                      <th className="p-4 font-semibold">Reporting Line</th>
                      <th className="p-4 font-semibold">Status</th>
                      {isAdmin && <th className="p-4 font-semibold text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedUsers.map((member) => {
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
                          onClick={() => handleSelectMember(member._id)}
                          className={cn("cursor-pointer hover:bg-accent/40 transition-colors", isSelected && "bg-primary/5")}
                        >
                          {isManagerOrAdmin && (
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectUser(member._id)}
                                className="rounded border-border text-primary"
                              />
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                {member.photoUrl ? (
                                  <AvatarImage src={member.photoUrl} alt={member.name} />
                                ) : (
                                  <AvatarFallback>{initials}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {memberDepts.map((d) => (
                                <Badge key={d} color="primary" variant="soft" rounded="full">
                                  {d}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{member.role}</td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            {member.socialLinks && (member.socialLinks.linkedin || member.socialLinks.twitter || member.socialLinks.github || member.socialLinks.website || member.socialLinks.instagram || member.socialLinks.facebook) ? (
                              <div className="flex items-center gap-1.5">
                                {member.socialLinks.linkedin && (
                                  <a href={member.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white border border-sky-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="LinkedIn">
                                    <i className="fa-brands fa-linkedin text-[11px]" />
                                  </a>
                                )}
                                {member.socialLinks.twitter && (
                                  <a href={member.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-foreground/10 hover:bg-foreground text-foreground hover:text-background border border-foreground/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="Twitter / X">
                                    <i className="fa-brands fa-x-twitter text-[11px]" />
                                  </a>
                                )}
                                {member.socialLinks.github && (
                                  <a href={member.socialLinks.github} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-slate-500/10 hover:bg-slate-900 dark:hover:bg-slate-100 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-slate-950 border border-slate-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="GitHub">
                                    <i className="fa-brands fa-github text-[11px]" />
                                  </a>
                                )}
                                {member.socialLinks.website && (
                                  <a href={member.socialLinks.website} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="Website">
                                    <i className="fa-solid fa-globe text-[11px]" />
                                  </a>
                                )}
                                {member.socialLinks.instagram && (
                                  <a href={member.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-pink-500/10 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 text-pink-600 hover:text-white border border-pink-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="Instagram">
                                    <i className="fa-brands fa-instagram text-[11px]" />
                                  </a>
                                )}
                                {member.socialLinks.facebook && (
                                  <a href={member.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-md bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-600/20 flex items-center justify-center transition-all duration-200 hover:scale-110" title="Facebook">
                                    <i className="fa-brands fa-facebook text-[11px]" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">&mdash;</span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">{member.managerId?.name || "CEO"}</td>
                          <td className="p-4">
                            <Badge
                              color={member.status === "Active" ? "success" : member.status === "On Leave" ? "warning" : "destructive"}
                              variant="soft"
                            >
                              {member.status}
                            </Badge>
                          </td>
                          {isAdmin && (
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMemberToDelete(member)}
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  Remove
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Directory Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Cards per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="h-8 px-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                >
                  <option value={8}>8 cards</option>
                  <option value={12}>12 cards</option>
                  <option value={16}>16 cards</option>
                  <option value={24}>24 cards</option>
                  <option value={50}>50 cards</option>
                </select>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedUserIds.length > 0 && isManagerOrAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-primary" /> {selectedUserIds.length} Selected
          </span>
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              setBulkAssignDepts([]);
              setShowBulkAssignModal(true);
            }}
          >
            Assign Departments
          </Button>
          {isAdmin && (
            <Button
              color="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              Bulk Remove
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedUserIds([])}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Org Chart Tab */}
      {activeTab === "orgchart" && (
        <Card className="relative overflow-hidden border border-border shadow-sm">
          {/* Zoom & View Controls Bar */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-md">
            <button
              type="button"
              onClick={() => setOrgZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              title="Zoom Out (Ctrl -)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer text-xs"
            >
              <i className="fa-solid fa-magnifying-glass-minus text-sm" />
            </button>

            <button
              type="button"
              onClick={() => setOrgZoom(1)}
              title="Reset Zoom to 100%"
              className="px-2.5 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs text-foreground hover:bg-accent/60 transition-all cursor-pointer border border-border/50"
            >
              {Math.round(orgZoom * 100)}%
            </button>

            <button
              type="button"
              onClick={() => setOrgZoom((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(2))))}
              title="Zoom In (Ctrl +)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer text-xs"
            >
              <i className="fa-solid fa-magnifying-glass-plus text-sm" />
            </button>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            <button
              type="button"
              onClick={() => setOrgZoom(1)}
              title="Fit to Default View"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer text-xs"
            >
              <i className="fa-solid fa-arrows-rotate text-xs" />
            </button>
          </div>

          <div className="p-8 overflow-auto min-h-[580px] max-h-[780px]">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
                <span className="text-sm">Loading organization hierarchy...</span>
              </div>
            ) : orgTreeRoots.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <i className="fa-solid fa-sitemap text-3xl opacity-30" />
                <span className="text-sm font-medium">No organization tree structure found.</span>
              </div>
            ) : (
              <div
                className="flex justify-center gap-12 min-w-max pb-16 pt-8 transition-transform duration-200 ease-out origin-top"
                style={{
                  transform: `scale(${orgZoom})`,
                }}
              >
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
        </Card>
      )}

      {/* Manager Panel Tab */}
      {activeTab === "manager" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-crown text-amber-500 text-lg" /> Manager Leadership Panel
              </h2>
              <p className="text-xs text-muted-foreground">
                Overview of your direct reports, team allocation, and reporting hierarchy management.
              </p>
            </div>
            <Badge color="primary" variant="soft" rounded="full" className="px-3 py-1">
              {directReports.length} Direct Report{directReports.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Direct Reports Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-users text-primary" /> Direct Reports
                </CardTitle>
                <CardDescription>Members reporting directly to you ({currentUser?.name})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {directReports.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm space-y-1">
                    <i className="fa-solid fa-people-group text-4xl mx-auto opacity-50" />
                    <p>You currently have no direct reports assigned.</p>
                  </div>
                ) : (
                  directReports.map((report) => (
                    <div
                      key={report._id}
                      onClick={() => handleSelectMember(report._id)}
                      className="p-4 rounded-xl border border-border bg-accent/20 hover:bg-accent/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          {report.photoUrl ? (
                            <AvatarImage src={report.photoUrl} alt={report.name} />
                          ) : (
                            <AvatarFallback>{report.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{report.name}</p>
                          <p className="text-xs text-muted-foreground">{report.role} &bull; {report.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge color="primary" variant="soft" rounded="full">
                          {report.department || "General"}
                        </Badge>
                        <Badge
                          color={report.status === "Active" ? "success" : report.status === "On Leave" ? "warning" : "destructive"}
                          variant="soft"
                        >
                          {report.status || "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Reassign & Team Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-sitemap text-primary" /> Team Structure Actions
                </CardTitle>
                <CardDescription>Manage reporting lines for organization members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Select Member to Reassign</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) handleSelectMember(val);
                    }}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose employee...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500 text-xs" /> Manager Drag & Drop
                  </p>
                  <p>
                    You can also switch to the <strong>Org Chart</strong> tab to visually drag and drop team members onto new managers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-amber-500" /> Pending Approvals
                </CardTitle>
                <CardDescription>Leave requests and timesheets awaiting your action</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {directReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No direct reports â€” no pending approvals.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">Timesheet Approvals</p>
                        <p className="text-xs text-muted-foreground">Submitted by your direct reports this week</p>
                      </div>
                      <Badge color="warning" variant="soft">{directReports.length} pending</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">Leave Requests</p>
                        <p className="text-xs text-muted-foreground">Time-off requests from your team</p>
                      </div>
                      <Badge color="primary" variant="soft">0 pending</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-1" asChild>
                      <a href="/dashboard/hr">Go to HR Portal â†’</a>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Team KPI Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-trophy text-emerald-500" /> Team KPI Status
                </CardTitle>
                <CardDescription>At-a-glance performance status for your direct reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {directReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No direct reports to display KPIs for.</p>
                ) : (
                  directReports.slice(0, 4).map((report: any) => (
                    <div key={report._id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          {report.photoUrl ? (
                            <AvatarImage src={report.photoUrl} alt={report.name} />
                          ) : (
                            <AvatarFallback>{report.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{report.name}</p>
                          <p className="text-xs text-muted-foreground">{report.role}</p>
                        </div>
                      </div>
                      <Badge
                        color={report.status === "Active" ? "success" : report.status === "On Leave" ? "warning" : "destructive"}
                        variant="soft"
                        className="shrink-0"
                      >
                        {report.status || "Active"}
                      </Badge>
                    </div>
                  ))
                )}
                {directReports.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{directReports.length - 4} more reports</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Departments Directory</h2>
              <p className="text-xs text-muted-foreground">Click on any department card to inspect assigned personnel.</p>
            </div>
            {isManagerOrAdmin && (
              <Button
                color="primary"
                size="sm"
                onClick={() => {
                  setEditingDept(null);
                  setDeptFormName("");
                  setDeptFormDesc("");
                  setDeptFormCode("");
                  setDeptFormError("");
                  setShowAddDeptModal(true);
                }}
                className="gap-2"
              >
                <i className="fa-solid fa-plus" /> Create Department
              </Button>
            )}
          </div>

          {deptLoading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
              <span className="text-sm">Loading workspace departments...</span>
            </div>
          ) : departmentsList.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-layer-group text-2xl" />
                </div>
                <h3 className="font-bold text-base text-foreground">No Departments Found</h3>
                <p className="text-xs text-muted-foreground">
                  Your workspace currently has no department categories. Click below to create your first department.
                </p>
                {isManagerOrAdmin && (
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => {
                      setEditingDept(null);
                      setDeptFormName("");
                      setDeptFormDesc("");
                      setDeptFormCode("");
                      setDeptFormManagerId("");
                      setDeptFormError("");
                      setShowAddDeptModal(true);
                    }}
                    className="mt-2 gap-2"
                  >
                    <i className="fa-solid fa-plus" /> Create First Department
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departmentsList.map((dept) => {
                const count = users.filter((u) => {
                  const depts = u.departments || [u.department];
                  return depts.includes(dept.name);
                }).length;

                return (
                  <Card key={dept._id} className="hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-start justify-between pb-3">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          {dept.name}
                          {dept.code && (
                            <Badge color="primary" variant="soft" rounded="sm">
                              {dept.code}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{dept.description || "No description provided."}</CardDescription>
                      </div>
                      {isManagerOrAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDept(dept);
                              setDeptFormName(dept.name);
                              setDeptFormDesc(dept.description || "");
                              setDeptFormCode(dept.code || "");
                              const mgrId = typeof dept.managerId === "object" ? dept.managerId?._id : dept.managerId;
                              setDeptFormManagerId(mgrId || "");
                              setDeptFormError("");
                              setShowAddDeptModal(true);
                            }}
                            className="h-8 w-8"
                          >
                            <i className="fa-solid fa-pen text-muted-foreground" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeptToDelete(dept)}
                              className="h-8 w-8 text-destructive"
                            >
                              <i className="fa-solid fa-trash" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-2 space-y-2.5">
                      {/* Department Head / Manager info */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-user-tie text-amber-500" /> Dept Manager:
                        </span>
                        {dept.managerId ? (
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {typeof dept.managerId === "object" ? dept.managerId.name : "Assigned"}
                            {typeof dept.managerId === "object" && dept.managerId.role && (
                              <Badge color="warning" variant="soft" rounded="full" className="text-[10px] px-1.5 py-0">
                                {dept.managerId.role}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                        )}
                      </div>

                      <button
                        onClick={() => setViewingDeptMembers(dept)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-accent/40 hover:bg-accent border border-border text-xs font-semibold text-foreground transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-users text-primary" /> Assigned Employees
                        </span>
                        <span className="text-primary flex items-center gap-1">
                          {count} Members <i className="fa-solid fa-chevron-right" />
                        </span>
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Selected Member Profile & Edit Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedMember(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="relative group/avatar cursor-pointer shrink-0"
                  onClick={() => !uploadingPhoto && memberFileInputRef.current?.click()}
                  title="Click to upload/change photo"
                >
                  <Avatar size="lg" className="ring-2 ring-primary/30 shadow-xs">
                    {selectedMember.photoUrl ? (
                      <AvatarImage src={selectedMember.photoUrl} alt={selectedMember.name} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base">
                        {selectedMember.name ? selectedMember.name.substring(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold gap-0.5 backdrop-blur-2xs">
                    <i className="fa-solid fa-camera text-xs" />
                    <span>Upload</span>
                  </div>

                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/65 flex items-center justify-center text-white">
                      <i className="fa-solid fa-spinner fa-spin text-sm text-primary-foreground" />
                    </div>
                  )}

                  <input
                    ref={memberFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    onChange={handleUploadMemberPhoto}
                    className="hidden"
                  />
                </div>

                <div>
                  <h3 className="font-bold text-lg text-foreground">{selectedMember.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Read-only profile info: join date, status, reporting line */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div className="space-y-0.5">
                <p className="text-muted-foreground font-medium">Status</p>
                <Badge
                  color={selectedMember.status === "Active" ? "success" : selectedMember.status === "On Leave" ? "warning" : "destructive"}
                  variant="soft"
                  className="text-xs"
                >
                  {selectedMember.status || "Active"}
                </Badge>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground font-medium">Join Date</p>
                <p className="font-semibold text-foreground">
                  {selectedMember.createdAt
                    ? new Date(selectedMember.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground font-medium">Reports To</p>
                <p className="font-semibold text-foreground">
                  {(() => {
                    if (!selectedMember.managerId) return "CEO / Top-level";
                    if (typeof selectedMember.managerId === "object" && selectedMember.managerId.name) {
                      return selectedMember.managerId.name;
                    }
                    const mId = typeof selectedMember.managerId === "object" ? selectedMember.managerId._id : selectedMember.managerId;
                    const found = users.find((u: any) => u._id === mId);
                    return found?.name || "CEO / Top-level";
                  })()}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
                {isAdmin && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="HR">HR</option>
                      <option value="OPS">OPS (SubAdmin)</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Skills (comma separated)</label>
                <Input value={editSkillsText} onChange={(e) => setEditSkillsText(e.target.value)} placeholder="React, Node.js, Design" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Bio / Description</label>
                <textarea
                  value={editBioText}
                  onChange={(e) => setEditBioText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Tell us about this team member..."
                />
              </div>

              {/* Social Media Profiles in Edit Modal */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-share-nodes text-primary text-xs" /> Social Media Profiles
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-brands fa-linkedin text-sky-600" /> LinkedIn
                    </label>
                    <Input value={editSocialLinkedin} onChange={(e) => setEditSocialLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-brands fa-x-twitter text-foreground" /> Twitter / X
                    </label>
                    <Input value={editSocialTwitter} onChange={(e) => setEditSocialTwitter(e.target.value)} placeholder="https://x.com/..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-brands fa-github text-foreground" /> GitHub
                    </label>
                    <Input value={editSocialGithub} onChange={(e) => setEditSocialGithub(e.target.value)} placeholder="https://github.com/..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-solid fa-globe text-emerald-500" /> Website
                    </label>
                    <Input value={editSocialWebsite} onChange={(e) => setEditSocialWebsite(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-brands fa-instagram text-pink-500" /> Instagram
                    </label>
                    <Input value={editSocialInstagram} onChange={(e) => setEditSocialInstagram(e.target.value)} placeholder="https://instagram.com/..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <i className="fa-brands fa-facebook text-blue-600" /> Facebook
                    </label>
                    <Input value={editSocialFacebook} onChange={(e) => setEditSocialFacebook(e.target.value)} placeholder="https://facebook.com/..." className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedMember(null)}>
                  Close
                </Button>
                <Button color="primary" size="sm" type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Single Employee Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowAddForm(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-primary text-lg" /> Add New Employee
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {formError && <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{formError}</div>}
            {formSuccess && <div className="p-3 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">{formSuccess}</div>}
            {createdTempPassword && (
              <div className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md">
                <span className="font-semibold">Share this temporary password securely:</span>
                <div className="mt-1 font-mono text-base break-all bg-emerald-500/10 border border-emerald-500/20 rounded p-2">{createdTempPassword}</div>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Jane Doe" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email Address *</label>
                  <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="jane@example.com" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="HR">HR</option>
                    <option value="OPS">OPS (SubAdmin)</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Reporting Manager</label>
                  <select
                    value={addManagerId}
                    onChange={(e) => setAddManagerId(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None (Reports to CEO)</option>
                    {users.filter((u) => u.role === "HR").map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} (HR)
                      </option>
                    ))}
                    {users.filter((u) => u.role === "Manager").map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} (Manager)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Skills (comma-separated)</label>
                <Input value={addSkills} onChange={(e) => setAddSkills(e.target.value)} placeholder="React, Python, Design" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit">
                  Create Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Add Members Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowBulkAddModal(false)}>
          <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-people-group text-primary text-lg" /> Bulk Add Employees
              </h3>
              <button onClick={() => setShowBulkAddModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {bulkAddError && <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{bulkAddError}</div>}

            <form onSubmit={handleBulkAddSubmit} className="space-y-4">
              <div className="space-y-3">
                {bulkRows.map((row, index) => (
                  <div key={row.id} className="p-3 rounded-lg border border-border bg-accent/20 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: val } : r)));
                      }}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={row.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, email: val } : r)));
                      }}
                    />
                    <select
                      value={row.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role: val } : r)));
                      }}
                      className="h-9 px-2 text-xs bg-background border border-border rounded-md text-foreground"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="HR">HR</option>
                      <option value="Admin">Admin</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <select
                        value={row.managerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, managerId: val } : r)));
                        }}
                        className="h-9 px-2 text-xs bg-background border border-border rounded-md text-foreground flex-1"
                      >
                        <option value="">No Manager</option>
                        {users.filter((u) => u.role === "Manager").map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                      </select>

                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBulkRows((prev) => prev.filter((r) => r.id !== row.id))}
                          className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBulkRows((prev) => [
                      ...prev,
                      { id: String(Date.now()), name: "", email: "", role: "Employee", departments: ["Engineering"], managerId: "" },
                    ])
                  }
                  className="gap-1"
                >
                  <i className="fa-solid fa-plus" /> Add Row
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowBulkAddModal(false)}>
                    Cancel
                  </Button>
                  <Button color="primary" size="sm" type="submit" disabled={isSubmittingBulkAdd}>
                    {isSubmittingBulkAdd ? "Submitting..." : "Submit All Employees"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add / Edit Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowAddDeptModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-building text-primary text-lg" /> {editingDept ? "Edit Department" : "Create Department"}
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {deptFormError && <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{deptFormError}</div>}

            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Department Name *</label>
                <Input value={deptFormName} onChange={(e) => handleDeptNameChange(e.target.value)} placeholder="e.g. Engineering" required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Department Code</label>
                <Input value={deptFormCode} onChange={(e) => setDeptFormCode(e.target.value)} placeholder="e.g. ENG" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Department Manager / Head</label>
                <select
                  value={deptFormManagerId}
                  onChange={(e) => setDeptFormManagerId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None (Unassigned)</option>
                  <optgroup label="Managers & Leaders">
                    {users
                      .filter((u) => u.role === "Manager" || u.role === "OPS" || u.role === "Admin" || u.role === "HR")
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Other Members">
                    {users
                      .filter((u) => u.role === "Employee")
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} (Employee)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  value={deptFormDesc}
                  onChange={(e) => setDeptFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Describe department responsibilities..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddDeptModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" disabled={isSubmittingDept}>
                  {isSubmittingDept ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Bulk Assign Departments Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowBulkAssignModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground">Assign Departments</h3>
              <button onClick={() => setShowBulkAssignModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select departments to assign to <strong className="text-foreground">{selectedUserIds.length}</strong> selected members:
            </p>

            <form onSubmit={handleBulkAssignDepartments} className="space-y-4">
              <div className="space-y-2">
                {departmentsList.map((dept) => {
                  const isChecked = bulkAssignDepts.includes(dept.name);
                  return (
                    <label key={dept._id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-accent/20 cursor-pointer hover:bg-accent/40">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setBulkAssignDepts((prev) =>
                            isChecked ? prev.filter((d) => d !== dept.name) : [...prev, dept.name]
                          )
                        }
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm font-semibold text-foreground">{dept.name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowBulkAssignModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" disabled={isSubmittingBulkAssign}>
                  {isSubmittingBulkAssign ? "Assigning..." : "Assign Departments"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Single Member Delete Confirm */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setMemberToDelete(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-destructive">
              <i className="fa-solid fa-circle-exclamation text-xl shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Remove Employee</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong className="text-foreground">{memberToDelete.name}</strong> from your organization?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMemberToDelete(null)}>
                Cancel
              </Button>
              <Button color="destructive" size="sm" onClick={handleConfirmDeleteMember} disabled={isDeletingMember}>
                {isDeletingMember ? "Removing..." : "Remove Employee"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-destructive">
              <i className="fa-solid fa-circle-exclamation text-xl shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Confirm Bulk Removal</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong className="text-foreground">{selectedUserIds.length}</strong> selected employee(s)?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button color="destructive" size="sm" onClick={handleConfirmBulkDelete} disabled={isDeletingBulk}>
                {isDeletingBulk ? "Removing..." : "Confirm Removal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Delete Department Confirm */}
      {deptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setDeptToDelete(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-destructive">
              <i className="fa-solid fa-circle-exclamation text-xl shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Delete Department</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{deptToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeptToDelete(null)}>
                Cancel
              </Button>
              <Button color="destructive" size="sm" onClick={handleConfirmDeleteDepartment} disabled={isSubmittingDept}>
                {isSubmittingDept ? "Deleting..." : "Delete Department"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: View Department Members Modal */}
      {viewingDeptMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setViewingDeptMembers(null)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-users text-primary text-lg" /> {viewingDeptMembers.name} Members
              </h3>
              <button onClick={() => setViewingDeptMembers(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-2">
              {users
                .filter((u) => (u.departments || [u.department]).includes(viewingDeptMembers.name))
                .map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/20">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Badge color="primary" variant="soft">{member.status || "Active"}</Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

