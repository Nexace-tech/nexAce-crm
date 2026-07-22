"use client";

import React, { useState } from "react";
import styles from "../../app/dashboard/team/team.module.css";

// Interface mapping the Mongoose User data structures
export interface OrgNode {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  photoUrl?: string;
  status: string;
  managerId?: string;
  reports: OrgNode[];
}

interface OrgChartNodeProps {
  node: OrgNode;
  onReassign: (employeeId: string, managerId: string | null) => Promise<void>;
  isAdmin: boolean;
  onSelectMember: (memberId: string) => void;
}

export function OrgChartNode({ node, onReassign, isAdmin, onSelectMember }: OrgChartNodeProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Drag start handler: records the employee ID being dragged
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/nexace-employee-id", node._id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Drag over handler: allow drop and show highlight
  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Drop handler: reassign the dragged employee to report to this node
  const handleDrop = async (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragOver(false);
    
    const draggedId = e.dataTransfer.getData("application/nexace-employee-id");
    if (draggedId && draggedId !== node._id) {
      await onReassign(draggedId, node._id);
    }
  };

  const initials = node.name
    ? node.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className={styles.treeContainer}>
      {/* Node Card */}
      <div
        draggable={isAdmin && node.role !== "Admin"} // CEO/Admin cannot report to anyone else
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelectMember(node._id)}
        className="glass-panel"
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          width: "220px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          border: isDragOver ? "2px dashed var(--color-primary)" : "1px solid var(--border-color)",
          boxShadow: isDragOver ? "0 0 15px var(--color-primary-glow)" : "var(--shadow-sm)",
          transform: isDragOver ? "scale(1.03)" : "none",
          transition: "all 0.2s ease",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {node.photoUrl ? (
            <img src={node.photoUrl} alt={node.name} className={styles.avatar} style={{ width: "38px", height: "38px" }} />
          ) : (
            <div className={styles.avatar} style={{ width: "38px", height: "38px", fontSize: "0.85rem" }}>{initials}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.name}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.role}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
          <span className={styles.departmentBadge} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
            {node.department}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <div
              className={styles.statusIndicator}
              style={{
                width: "6px",
                height: "6px",
                backgroundColor:
                  node.status === "Active"
                    ? "var(--color-success)"
                    : node.status === "On Leave"
                    ? "var(--color-warning)"
                    : "var(--color-danger)",
              }}
            />
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
              {node.status}
            </span>
          </div>
        </div>
      </div>

      {/* Render children nodes recursively with connection lines */}
      {node.reports && node.reports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: "100%" }}>
          {/* Vertical line from manager card down */}
          <div
            style={{
              width: "2px",
              height: "20px",
              backgroundColor: "var(--border-color)",
              position: "absolute",
              top: "-20px",
            }}
          />

          {/* Children container wrapper */}
          <div className={styles.treeNodeChildren} style={{ marginTop: "20px" }}>
            {/* Horizontal line connector connecting all children */}
            {node.reports.length > 1 && (
              <div
                style={{
                  height: "2px",
                  backgroundColor: "var(--border-color)",
                  position: "absolute",
                  top: "0",
                  left: "110px", // Align to center of first child card
                  right: "110px", // Align to center of last child card
                }}
              />
            )}

            {node.reports.map((report) => (
              <div key={report._id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Vertical line down to child card */}
                <div
                  style={{
                    width: "2px",
                    height: "20px",
                    backgroundColor: "var(--border-color)",
                    position: "absolute",
                    top: "0",
                  }}
                />
                
                <div style={{ paddingTop: "20px" }}>
                  <OrgChartNode
                    node={report}
                    onReassign={onReassign}
                    isAdmin={isAdmin}
                    onSelectMember={onSelectMember}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
