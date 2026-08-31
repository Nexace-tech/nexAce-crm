import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatISTDate, formatISTTime, getISTDateString } from "./utils";

export interface PDFReportOptions {
  user: {
    name?: string;
    role?: string;
    department?: string;
    shiftName?: string;
    shiftTime?: string;
    tenantName?: string;
  };
  tasks?: any[];
  timesheets?: any[];
  shiftLogs?: any[];
  includeKpis?: boolean;
  includeTasks?: boolean;
  includeTimesheets?: boolean;
  includeShifts?: boolean;
  includeSignoff?: boolean;
  customNotes?: string;
  startDate?: string;
  endDate?: string;
}

export function generateAndDownloadPDF(options: PDFReportOptions) {
  const {
    user,
    tasks = [],
    timesheets = [],
    shiftLogs = [],
    includeKpis = true,
    includeTasks = true,
    includeTimesheets = true,
    includeShifts = true,
    includeSignoff = true,
    customNotes = "",
    startDate,
    endDate,
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let currentY = 12;

  const companyName = "NexAce CRM";
  const tenantTitle = (user.tenantName || "Corporate Workspace").slice(0, 32);
  const empName = (user.name || "Employee").slice(0, 28);
  const empRole = (user.role || "Team Member").slice(0, 20);
  const empDept = (user.department || "Operations").slice(0, 20);
  const empShift = (user.shiftName || "Standard Day Shift").slice(0, 26);
  const empShiftTime = (user.shiftTime || "09:00 AM - 05:00 PM").slice(0, 26);
  const dateRangeLabel =
    startDate && endDate
      ? `${startDate}  to  ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : "All Historical Records";

  // =========================================================================
  // 1. Executive Brand Header (Dark Slate with Teal Branding)
  // =========================================================================
  const headerHeight = 24;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 3, 3, "F");

  // Teal decorative bottom accent bar
  doc.setFillColor(0, 197, 160); // #00c5a0 primary teal
  doc.rect(marginX, currentY + headerHeight - 1.2, contentWidth, 1.2, "F");

  // Brand Logo Emblem
  doc.setFillColor(0, 197, 160);
  doc.roundedRect(marginX + 5, currentY + 4.5, 14, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("N", marginX + 12, currentY + 14, { align: "center" });

  // Brand Name & Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, marginX + 22, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("PERFORMANCE, TIMESHEET & ATTENDANCE AUDIT", marginX + 22, currentY + 16);

  // Right Metadata Details
  const metaRightX = pageWidth - marginX - 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 197, 160);
  doc.text(`TENANT: ${tenantTitle.toUpperCase()}`, metaRightX, currentY + 8, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Period: ${dateRangeLabel}`, metaRightX, currentY + 12.5, { align: "right" });
  doc.text(
    `Generated: ${formatISTDate(new Date())} ${formatISTTime(new Date())} IST`,
    metaRightX,
    currentY + 17,
    { align: "right" }
  );

  currentY += headerHeight + 4.5;

  // =========================================================================
  // 2. Employee Profile Metadata Card
  // =========================================================================
  const profileHeight = 15;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, currentY, contentWidth, profileHeight, 2, 2, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, profileHeight, 2, 2, "S");

  const chipWidth = contentWidth / 4; // 45.5mm each

  // Col 1: Employee Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("EMPLOYEE", marginX + 4, currentY + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(empName, marginX + 4, currentY + 11);

  // Col 2: Role & Department
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DESIGNATION & DEPT", marginX + chipWidth + 4, currentY + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${empRole} · ${empDept}`, marginX + chipWidth + 4, currentY + 11);

  // Col 3: Shift Name
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ASSIGNED SHIFT", marginX + chipWidth * 2 + 4, currentY + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(empShift, marginX + chipWidth * 2 + 4, currentY + 11);

  // Col 4: Timing & Schedule
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SHIFT SCHEDULE", marginX + chipWidth * 3 + 4, currentY + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(empShiftTime, marginX + chipWidth * 3 + 4, currentY + 11);

  currentY += profileHeight + 4.5;

  // Helper to accurately compute regular, overtime, and total shift hours
  const getLogHours = (log: any) => {
    let reg = log.regularHours || 0;
    let ot = log.overtimeHours || 0;
    if ((reg === 0 && ot === 0 && log.clockIn) || !log.clockOut || log.clockOut === "Active") {
      if (log.clockIn) {
        const startMs = new Date(log.clockIn).getTime();
        const endMs = log.clockOut && log.clockOut !== "Active" ? new Date(log.clockOut).getTime() : Date.now();
        const diffHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
        reg = Math.min(diffHours, 8.0);
        ot = Math.max(0, diffHours - 8.0);
      }
    }
    return { reg, ot, total: reg + ot };
  };

  // =========================================================================
  // 3. Executive KPI Overview Stat Cards
  // =========================================================================
  if (includeKpis) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalHours = timesheets.reduce((acc, t) => acc + (t.hours || 0), 0);
    const billableHours = timesheets.filter((t) => t.isBillable).reduce((acc, t) => acc + (t.hours || 0), 0);
    const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 100;
    
    const totalShifts = shiftLogs.length;
    const totalShiftWorked = shiftLogs.reduce((acc, l) => acc + getLogHours(l).total, 0);
    const totalShiftOvertime = shiftLogs.reduce((acc, l) => acc + getLogHours(l).ot, 0);

    const kpiCardWidth = (contentWidth - 9) / 4; // ~43.25mm
    const kpiCardHeight = 20;

    const kpis = [
      {
        label: "PROJECT TASKS",
        val: `${totalTasks}`,
        sub: `${completedTasks} Done (${taskPct}%)`,
        barPct: taskPct,
        color: [245, 158, 11], // Amber
      },
      {
        label: "TIMESHEET LOGS",
        val: `${totalHours}h`,
        sub: `${billableHours}h Billable`,
        barPct: billablePct,
        color: [2, 132, 199], // Sky
      },
      {
        label: "TOTAL SHIFTS WORKED",
        val: `${totalShifts} Days`,
        sub: `${totalShiftWorked.toFixed(1)}h (+${totalShiftOvertime.toFixed(1)}h OT)`,
        barPct: totalShifts > 0 ? 100 : 0,
        color: [16, 185, 129], // Emerald
      },
      {
        label: "BILLABLE RATIO",
        val: `${billablePct}%`,
        sub: `${timesheets.length} Time entries`,
        barPct: billablePct,
        color: [139, 92, 246], // Purple
      },
    ];

    kpis.forEach((kpi, idx) => {
      const cardX = marginX + idx * (kpiCardWidth + 3);

      // Card Box Background & Border
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX, currentY, kpiCardWidth, kpiCardHeight, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, currentY, kpiCardWidth, kpiCardHeight, 2, 2, "S");

      // Left Color Accent Strip
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.roundedRect(cardX, currentY, 2.5, kpiCardHeight, 1, 1, "F");

      // Card Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, cardX + 5, currentY + 4.5);

      // Card Value
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.val, cardX + 5, currentY + 10.5);

      // Progress Bar Track
      const barX = cardX + 5;
      const barY = currentY + 12.8;
      const barW = kpiCardWidth - 10;
      const barH = 1.6;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barX, barY, barW, barH, 0.8, 0.8, "F");

      // Progress Bar Fill
      const fillW = Math.max(1, (barW * Math.min(100, kpi.barPct)) / 100);
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.roundedRect(barX, barY, fillW, barH, 0.8, 0.8, "F");

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.sub, cardX + 5, currentY + 17.5);
    });

    currentY += kpiCardHeight + 5;
  }

  // Section Header Renderer
  const drawSectionHeader = (title: string, countLabel: string, color: [number, number, number]) => {
    // Check if we need to break page before drawing section header
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 14;
    }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, currentY, contentWidth, 6.5, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 6.5, 1.5, 1.5, "S");

    // Indicator bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(marginX + 2, currentY + 1.2, 2.5, 4.1, 0.8, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginX + 7, currentY + 4.4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(countLabel, pageWidth - marginX - 4, currentY + 4.4, { align: "right" });

    currentY += 8.5;
  };

  // =========================================================================
  // 4. Section 1: Detailed Project Tasks Table
  // =========================================================================
  if (includeTasks) {
    drawSectionHeader("1. PROJECT TASKS & DELIVERABLES", `${tasks.length} RECORDS`, [245, 158, 11]);

    const taskRows = tasks.map((t, idx) => {
      const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
      const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
      const subtaskStr = subtasksTotal > 0 ? `${subtasksDone}/${subtasksTotal}` : "--";
      const projName = t.projectId?.name || t.project || "General";
      const titleStr = t.description
        ? `${t.title || "Untitled Task"}\n${t.description.slice(0, 70)}${t.description.length > 70 ? "..." : ""}`
        : (t.title || "Untitled Task");

      return [
        idx + 1,
        titleStr,
        projName,
        t.priority || "Medium",
        t.status || "To Do",
        t.dueDate ? formatISTDate(t.dueDate) : "--",
        t.estimatedHours ? `${t.estimatedHours}h` : "--",
        subtaskStr,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["#", "TASK TITLE & DESCRIPTION", "PROJECT", "PRIORITY", "STATUS", "DUE DATE", "EST. HRS", "SUBTASKS"]],
      body: taskRows.length > 0 ? taskRows : [["--", "No project tasks found in the selected range", "--", "--", "--", "--", "--", "--"]],
      theme: "plain",
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
        textColor: [30, 41, 59],
        overflow: "linebreak",
        lineWidth: 0.15,
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [15, 23, 42], // Slate-900
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.8,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: "center", fontStyle: "bold", textColor: [100, 116, 139] },
        1: { cellWidth: 55 },
        2: { cellWidth: 26, fontStyle: "bold" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 20 },
        6: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        7: { cellWidth: 18, halign: "center" },
      },
      margin: { top: 14, bottom: 16, left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === "body" && taskRows.length > 0) {
          // Priority Column (Col 3) Native Pill Coloring
          if (data.column.index === 3) {
            const priority = String(data.cell.raw);
            if (priority === "Urgent" || priority === "High") {
              data.cell.styles.fillColor = [255, 228, 230];
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = "bold";
            } else if (priority === "Medium") {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = "bold";
            } else if (priority === "Low") {
              data.cell.styles.fillColor = [224, 242, 254];
              data.cell.styles.textColor = [2, 132, 199];
              data.cell.styles.fontStyle = "bold";
            }
          }
          // Status Column (Col 4) Native Pill Coloring
          else if (data.column.index === 4) {
            const status = String(data.cell.raw);
            if (status === "Done") {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [21, 128, 61];
              data.cell.styles.fontStyle = "bold";
            } else if (status === "In Progress") {
              data.cell.styles.fillColor = [224, 242, 254];
              data.cell.styles.textColor = [3, 105, 161];
              data.cell.styles.fontStyle = "bold";
            } else if (status === "Review") {
              data.cell.styles.fillColor = [237, 233, 254];
              data.cell.styles.textColor = [109, 40, 217];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 5. Section 2: Timesheets Report Table
  // =========================================================================
  if (includeTimesheets) {
    const totalHoursVal = timesheets.reduce((acc, t) => acc + (t.hours || 0), 0);
    drawSectionHeader(
      "2. TIMESHEET HOURS & WORK DELIVERABLES",
      `${timesheets.length} RECORDS · TOTAL: ${totalHoursVal} HOURS`,
      [2, 132, 199]
    );

    const tsRows = timesheets.map((e) => [
      e.date ? formatISTDate(e.date) : "--",
      e.project || "General",
      e.taskName || "Deliverable Work",
      `${e.hours || 0}h`,
      e.isBillable ? "Billable" : "Non-Billable",
      e.status || "Draft",
      (e.comment || "--").slice(0, 60),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["DATE (IST)", "PROJECT", "TASK DELIVERABLE", "HOURS", "BILLABLE", "STATUS", "WORK NOTES"]],
      body: tsRows.length > 0 ? tsRows : [["--", "No timesheet records found in the selected range", "--", "--", "--", "--", "--"]],
      theme: "plain",
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
        textColor: [30, 41, 59],
        overflow: "linebreak",
        lineWidth: 0.15,
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.8,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 28, fontStyle: "bold" },
        2: { cellWidth: 42 },
        3: { cellWidth: 16, halign: "center", fontStyle: "bold", textColor: [2, 132, 199] },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: "auto", textColor: [100, 116, 139] },
      },
      margin: { top: 14, bottom: 16, left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === "body" && tsRows.length > 0) {
          // Billable Column (Col 4) Native Styling
          if (data.column.index === 4) {
            const billable = String(data.cell.raw);
            if (billable === "Billable") {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [21, 128, 61];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.textColor = [100, 116, 139];
            }
          }
          // Status Column (Col 5) Native Styling
          else if (data.column.index === 5) {
            const status = String(data.cell.raw);
            if (status === "Approved") {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [21, 128, 61];
              data.cell.styles.fontStyle = "bold";
            } else if (status === "Pending") {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 6. Section 3: Shift Attendance Logs Table
  // =========================================================================
  if (includeShifts) {
    const totalShiftWorked = shiftLogs.reduce((acc, l) => acc + getLogHours(l).total, 0);
    const totalShiftOvertime = shiftLogs.reduce((acc, l) => acc + getLogHours(l).ot, 0);

    drawSectionHeader(
      "3. SHIFT ATTENDANCE & PUNCH LOG HISTORY",
      `${shiftLogs.length} DAYS · ${totalShiftWorked.toFixed(1)}H WORKED (+${totalShiftOvertime.toFixed(1)}H OT)`,
      [16, 185, 129]
    );

    const shiftRows = shiftLogs.map((log) => {
      const empObj = typeof log.userId === "object" ? log.userId : null;
      const shiftT = empObj?.shiftTime || user.shiftTime || "09:00 AM - 05:00 PM";
      const { reg, ot, total } = getLogHours(log);

      return [
        log.date ? formatISTDate(log.date) : "--",
        shiftT,
        log.clockIn ? formatISTTime(log.clockIn) : "--",
        log.clockOut && log.clockOut !== "Active" ? formatISTTime(log.clockOut) : log.clockIn ? "Active" : "--",
        `${total.toFixed(2)}h`,
        `${reg.toFixed(2)}h`,
        ot > 0 ? `+${ot.toFixed(2)}h` : "0h",
        log.status || (log.clockIn && !log.clockOut ? "Active" : "Present"),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["DATE (IST)", "SHIFT TIMING", "CLOCK IN", "CLOCK OUT", "DURATION", "REGULAR", "OVERTIME", "STATUS"]],
      body: shiftRows.length > 0 ? shiftRows : [["--", "No attendance records found in the selected range", "--", "--", "--", "--", "--", "--"]],
      theme: "plain",
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
        textColor: [30, 41, 59],
        overflow: "linebreak",
        lineWidth: 0.15,
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.8,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 38 },
        2: { cellWidth: 20, fontStyle: "bold", textColor: [16, 185, 129] },
        3: { cellWidth: 20 },
        4: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 16, halign: "center" },
        6: { cellWidth: 16, halign: "center", textColor: [217, 119, 6] },
        7: { cellWidth: 20, halign: "center" },
      },
      margin: { top: 14, bottom: 16, left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === "body" && shiftRows.length > 0 && data.column.index === 7) {
          const status = String(data.cell.raw);
          if (status === "Present" || status === "Active") {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = "bold";
          } else if (status === "Late" || status === "Half Day") {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = "bold";
          } else if (status === "Absent") {
            data.cell.styles.fillColor = [255, 228, 230];
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 7. Executive Supervisor Remarks Box
  // =========================================================================
  if (customNotes) {
    if (currentY > pageHeight - 32) {
      doc.addPage();
      currentY = 14;
    }
    doc.setFillColor(255, 251, 235); // amber-50
    doc.roundedRect(marginX, currentY, contentWidth, 13, 2, 2, "F");
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 13, 2, 2, "S");

    // Left Amber Accent Strip
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(marginX, currentY, 2.5, 13, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(180, 83, 9);
    doc.text("EXECUTIVE / SUPERVISOR REMARKS:", marginX + 5.5, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 53, 15);
    const splitNotes = doc.splitTextToSize(customNotes, contentWidth - 11);
    doc.text(splitNotes, marginX + 5.5, currentY + 8.8);

    currentY += 16;
  }

  // =========================================================================
  // 8. Formal Verification & Sign-off Block
  // =========================================================================
  if (includeSignoff) {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 14;
    } else {
      currentY += 2;
    }

    const boxWidth = (contentWidth - 8) / 2;
    const boxHeight = 20;

    // Card 1: Employee Verification Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, currentY, boxWidth, boxHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, boxWidth, boxHeight, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("EMPLOYEE ACKNOWLEDGEMENT", marginX + 5, currentY + 4.5);

    // Signature dotted line
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX + 5, currentY + 12.5, marginX + boxWidth - 5, currentY + 12.5);
    doc.setLineDashPattern([], 0); // reset

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(empName, marginX + 5, currentY + 16.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text("Signature & Date Verified", marginX + boxWidth - 5, currentY + 16.5, { align: "right" });

    // Card 2: Manager Approval Box
    const mgrX = marginX + boxWidth + 8;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(mgrX, currentY, boxWidth, boxHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(mgrX, currentY, boxWidth, boxHeight, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("AUTHORIZED OPERATIONS / HR MANAGER", mgrX + 5, currentY + 4.5);

    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(mgrX + 5, currentY + 12.5, mgrX + boxWidth - 5, currentY + 12.5);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Manager Approval Signature", mgrX + 5, currentY + 16.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text("Seal / Verification Stamp", mgrX + boxWidth - 5, currentY + 16.5, { align: "right" });
  }

  // =========================================================================
  // 9. Running Header & Footer Across All Pages
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Top Header for Pages 2+
    if (i > 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 7.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(0, 7.5, pageWidth, 7.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${companyName} · Performance & Operations Report`, marginX, 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${empName} (${empRole}) · ${tenantTitle}`, pageWidth - marginX, 5, { align: "right" });
    }

    // Running Bottom Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generated by ${companyName} · Confidential Workplace Document · Ref: NX-REP-${Date.now().toString().slice(-6)}`,
      marginX,
      pageHeight - 5
    );

    // Page Number Indicator
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  // Direct File Download Trigger
  const sanitizedName = empName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `NexAce_Report_${sanitizedName}_${getISTDateString()}_IST.pdf`;
  doc.save(fileName);
}
