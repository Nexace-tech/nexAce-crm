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
  managerName?: string;
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

  const roleAccent = node.role === "Admin"
    ? "border-t-rose-500/60"
    : node.role === "Manager"
    ? "border-t-amber-500/60"
    : node.role === "HR"
    ? "border-t-purple-500/60"
    : "border-t-primary/50";

  const roleBadgeClass = node.role === "Admin"
    ? "text-rose-500"
    : node.role === "Manager"
    ? "text-amber-500"
    : node.role === "HR"
    ? "text-purple-500"
    : "text-blue-400";

  return (
    <div className={styles.treeContainer}>
      {/* Node Card - Clean & Pleasing in both Light and Dark modes */}
      <div
        draggable={isAdmin && node.role !== "Admin"}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelectMember(node._id)}
        className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-primary/60 transition-all duration-200 cursor-pointer w-[240px] flex flex-col gap-3"
        style={{
          borderColor: isDragOver ? "var(--color-primary)" : undefined,
          boxShadow: isDragOver ? "0 0 20px rgba(99, 102, 241, 0.4)" : undefined,
          transform: isDragOver ? "scale(1.04)" : undefined,
          zIndex: 2,
        }}
      >
        {/* Subtle role-coloured accent border on top */}
        <div className={`absolute top-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r ${roleAccent} via-current to-transparent opacity-70 group-hover:opacity-100 transition-opacity`} />

        <div className="flex items-center gap-3">
          {node.photoUrl ? (
            <img 
              src={node.photoUrl} 
              alt={node.name} 
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-primary/40 shrink-0 shadow-xs" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 dark:border-primary/30 shrink-0 shadow-xs">
              {initials}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
              {node.name}
            </span>
            <span className={`text-xs font-semibold truncate ${roleBadgeClass}`}>
              {node.role}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-primary/20 text-slate-700 dark:text-blue-300 border border-slate-200/80 dark:border-primary/20">
            {node.department}
          </span>
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                node.status === "Active"
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : node.status === "On Leave"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-slate-500 dark:text-slate-400 capitalize text-[10px]">
              {node.status}
            </span>
          </div>
        </div>

        {node.managerName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-500">
            <i className="fa-solid fa-turn-up rotate-90 text-[9px] opacity-60" />
            <span>Reports to: <span className="font-semibold text-slate-700 dark:text-slate-300">{node.managerName}</span></span>
          </div>
        )}
      </div>

      {/* Render children nodes recursively with seamless single-element curved connectors */}
      {node.reports && node.reports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: "100%" }}>
          {/* Vertical stem line down from parent card */}
          <div
            className="bg-slate-300 dark:bg-indigo-500/40"
            style={{
              width: "2px",
              height: "20px",
              position: "absolute",
              top: "-20px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />

          {/* Children container wrapper */}
          <div className={styles.treeNodeChildren} style={{ marginTop: "0px" }}>
            {node.reports.map((report, index) => {
              const isFirst = index === 0;
              const isLast = index === node.reports.length - 1;
              const hasSiblings = node.reports.length > 1;

              return (
                <div key={report._id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {hasSiblings ? (
                    isFirst ? (
                      /* Seamless Top-Left Rounded Elbow Corner */
                      <div className="absolute top-0 left-1/2 right-[-1rem] h-[20px] pointer-events-none">
                        {/* Smooth L-shaped curved corner */}
                        <div 
                          className="absolute border-t-2 border-l-2 border-slate-300 dark:border-indigo-500/40 rounded-tl-xl"
                          style={{
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "20px",
                          }}
                        />
                      </div>
                    ) : isLast ? (
                      /* Seamless Top-Right Rounded Elbow Corner */
                      <div className="absolute top-0 right-1/2 left-[-1rem] h-[20px] pointer-events-none">
                        {/* Smooth L-shaped curved corner */}
                        <div 
                          className="absolute border-t-2 border-r-2 border-slate-300 dark:border-indigo-500/40 rounded-tr-xl"
                          style={{
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "20px",
                          }}
                        />
                      </div>
                    ) : (
                      /* Middle Sibling T-Junction Connector */
                      <div className="absolute top-0 left-[-1rem] right-[-1rem] h-[20px] pointer-events-none">
                        {/* Horizontal bar across middle */}
                        <div 
                          className="absolute top-0 left-0 right-0 bg-slate-300 dark:bg-indigo-500/40"
                          style={{ height: "2px" }}
                        />
                        {/* Vertical line down to middle child */}
                        <div 
                          className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-300 dark:bg-indigo-500/40"
                          style={{ width: "2px", height: "20px" }}
                        />
                      </div>
                    )
                  ) : (
                    /* Single Child Vertical Line Down */
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-300 dark:bg-indigo-500/40"
                      style={{ width: "2px", height: "20px" }}
                    />
                  )}
                  
                  <div style={{ paddingTop: "20px" }}>
                    <OrgChartNode
                      node={report}
                      onReassign={onReassign}
                      isAdmin={isAdmin}
                      onSelectMember={onSelectMember}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
