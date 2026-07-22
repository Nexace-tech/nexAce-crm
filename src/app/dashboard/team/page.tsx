"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OrgChartNode, OrgNode } from "@/components/features/OrgChartNode";
import styles from "./team.module.css";

export default function TeamDashboardPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"directory" | "orgchart" | "manager">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  
  // Profile self-edit states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState("");
  const [editSkillsText, setEditSkillsText] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Add Employee Form States (Admin only)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("Employee");
  const [addDept, setAddDept] = useState("Engineering");
  const [addManagerId, setAddManagerId] = useState("");
  const [addSkills, setAddSkills] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const departments = ["All", "Management", "Engineering", "Design", "Marketing"];

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
    }
  }, [departmentFilter, searchQuery, mounted]);

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
        // Refresh local data
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

  // Profile update action (Self edit bio/skills)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      const parsedSkills = editSkillsText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const response = await fetch(`/api/team/${selectedMember._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: editBioText, skills: parsedSkills, photoUrl: editPhotoUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMember(data.user);
        setIsEditingBio(false);
        await fetchTeam();
        showToast("Profile updated successfully!", "success");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile.", "error");
    }
  };

  // Add new employee record (Admin only)
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
          department: addDept,
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

  const handleSelectMember = (memberId: string) => {
    const member = users.find((u) => u._id === memberId);
    if (member) {
      setSelectedMember(member);
      setEditBioText(member.bio || "");
      setEditSkillsText(member.skills ? member.skills.join(", ") : "");
      setEditPhotoUrl(member.photoUrl || "");
      setIsEditingBio(false);
    }
  };

  // Map users into Org tree structure
  const buildOrgTree = (): OrgNode[] => {
    const userMap: { [key: string]: OrgNode } = {};
    const rootNodes: OrgNode[] = [];

    // Initialize map
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

    // Populate hierarchy
    users.forEach((u) => {
      const node = userMap[u._id];
      const managerId = u.managerId?._id || u.managerId;
      if (managerId && userMap[managerId]) {
        userMap[managerId].reports.push(node);
      } else {
        // No manager found in this tenant list: make root
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
      {/* Title & Actions */}
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>My Team</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage organization members, departments, and reporting connections.
          </p>
        </div>

        {isAdmin && (
          <button className={styles.btnPrimary} onClick={() => setShowAddForm(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: "0.25rem" }}></i> Add Employee
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "directory" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("directory"))}
        >
          <i className="fa-solid fa-folder-open" style={{ marginRight: "0.25rem" }}></i> Directory
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
                placeholder="Search name, email, skills..."
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
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept} Department</option>
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

                return (
                  <div
                    key={member._id}
                    className={`${styles.memberCard} glass-panel`}
                    onClick={() => handleSelectMember(member._id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.cardHeader}>
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatar}>{initials}</div>
                      )}
                      <div className={styles.memberMeta}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberRole}>{member.role}</span>
                      </div>
                    </div>

                    <span className={styles.departmentBadge}>{member.department || "General"}</span>

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
                    <th className={styles.th}>Employee</th>
                    <th className={styles.th}>Department</th>
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Reporting Line</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <tr
                        key={member._id}
                        className={styles.tr}
                        onClick={() => handleSelectMember(member._id)}
                        style={{ cursor: "pointer" }}
                      >
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
                          <span className={styles.departmentBadge}>{member.department || "General"}</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

          {/* Right panel: approvals and direct report KPI status */}
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

              <div style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  <i className="fa-solid fa-bullseye" style={{ marginRight: "0.25rem", color: "var(--color-danger)" }}></i> Key Result Areas (KRAs)
                </h3>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span>Sprint velocity (Q3 target: 90%)</span>
                    <strong>85%</strong>
                  </div>
                  <div style={{ height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: "85%", height: "100%", background: "var(--color-primary)" }} />
                  </div>
                </div>
              </div>
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{selectedMember.name}</h2>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  {selectedMember.role} • {selectedMember.department || "General"}
                </span>
                <span className={styles.departmentBadge} style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                  {selectedMember.status}
                </span>
              </div>
            </div>

            {/* Profile Body */}
            {isEditingBio ? (
              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Biography</label>
                  <textarea
                    value={editBioText}
                    onChange={(e) => setEditBioText(e.target.value)}
                    className={styles.input}
                    style={{ width: "100%", height: "80px", resize: "none" }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={editSkillsText}
                    onChange={(e) => setEditSkillsText(e.target.value)}
                    placeholder="e.g. Next.js, Figma, TypeScript"
                    className={styles.input}
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
                    <label className={styles.btnSecondary} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
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

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setIsEditingBio(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={uploadingPhoto}>
                    Save Changes
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

                {/* Edit Profile Button (Visible if Self or Admin) */}
                {(selectedMember._id === currentUser?._id || isAdmin) && (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingBio(true)}
                    style={{ alignSelf: "flex-end", marginTop: "0.5rem" }}
                  >
                    <i className="fa-solid fa-pen-to-square" style={{ marginRight: "0.25rem" }}></i> Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- Add Employee Modal (Admin Only) ----------------- */}
      {showAddForm && isAdmin && (
        <div className={styles.modalOverlay} onClick={() => setShowAddForm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowAddForm(false)}>
              ×
            </span>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              <i className="fa-solid fa-user-plus" style={{ marginRight: "0.5rem", color: "var(--color-primary)" }}></i> Add New Employee
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Create a record inside the Acme Corp tenant. Hashed default password is `password123`.
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Department</label>
                  <select
                    className={styles.select}
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                  >
                    <option value="Management">Management</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

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
