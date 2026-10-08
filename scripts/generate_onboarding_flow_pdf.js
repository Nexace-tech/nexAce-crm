const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");
const fs = require("fs");
const path = require("path");

function generatePDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Colors
  const primaryColor = [37, 99, 235]; // #2563eb Blue
  const darkNavy = [15, 23, 42]; // #0f172a Slate 900
  const emeraldColor = [16, 185, 129]; // #10b981
  const amberColor = [245, 158, 11]; // #f59e0b
  const purpleColor = [139, 92, 246]; // #8b5cf6
  const lightBg = [248, 250, 252];
  const borderGray = [226, 232, 240];

  // ================= PAGE 1 =================
  // Header Banner
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Accent Stripe
  doc.setFillColor(...primaryColor);
  doc.rect(0, 32, pageWidth, 2.5, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NexAce CRM - Enterprise HR Operations", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text("Employee Registration to Onboarding Flowchart & Architecture Guide", margin, 22);

  const nowStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${nowStr}  |  Version: 2.4.0  |  Status: Production Verified`, pageWidth - margin, 22, { align: "right" });

  let yPos = 42;

  // Executive Overview Card
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, "FD");

  doc.setTextColor(...darkNavy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PROCESS OVERVIEW", margin + 5, yPos + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const overviewText =
    "This document specifies the lifecycle workflow for onboarding new employees within NexAce CRM, incorporating Admin-controlled HR Data Isolation, audit tracking of designated onboarding HR personnel, document upload & verification pipelines, and status transition gates.";
  const splitOverview = doc.splitTextToSize(overviewText, pageWidth - margin * 2 - 10);
  doc.text(splitOverview, margin + 5, yPos + 13);

  yPos += 28;

  // Visual Process Diagram Steps (6 Cards with flow connectors)
  const steps = [
    {
      num: "01",
      title: "Employee Registration & Intake",
      actor: "EMPLOYEE / ADMIN",
      badgeColor: primaryColor,
      details: [
        "• Employee accepts Workspace Invite or submits self-signup form.",
        "• User account created in MongoDB with status: 'Pending'.",
        "• documentsSubmitted defaults to false; account remains restricted.",
      ],
    },
    {
      num: "02",
      title: "HR Assignment & Scope Isolation",
      actor: "WORKSPACE ADMIN",
      badgeColor: purpleColor,
      details: [
        "• Admin assigns Department, Job Title, and designated HR Manager (hrId).",
        "• If 'HR Data Isolation' toggle is active, other HRs cannot see this employee.",
        "• Scoped access ensures each HR manages only their assigned cohorts.",
      ],
    },
    {
      num: "03",
      title: "Checklist Creation & Audit Timestamp",
      actor: "DESIGNATED HR",
      badgeColor: darkNavy,
      details: [
        "• HR initializes Onboarding Checklist (NDA, Offer Letter, IT Setup).",
        "• System writes onboardedBy: { hrId, hrName, date } to User & Checklist.",
        "• Admin can review which specific HR onboarded each employee at any time.",
      ],
    },
    {
      num: "04",
      title: "Document Requests & Upload Portal",
      actor: "HR & EMPLOYEE",
      badgeColor: amberColor,
      details: [
        "• HR requests required documents (ID Proof, Tax Forms, Certificates).",
        "• Employee logs in; sees 'My Required Documents' with live statuses.",
        "• Employee uploads files (PDF/IMG/DOCX) -> Status moves to 'Submitted'.",
      ],
    },
    {
      num: "05",
      title: "HR Document Verification & Toggle",
      actor: "DESIGNATED HR",
      badgeColor: emeraldColor,
      details: [
        "• HR inspects uploaded files; marks each document 'Verified' or 'Rejected'.",
        "• HR flips the employee card toggle button to 'Docs: Confirmed'.",
        "• System logs documentsConfirmedBy: { hrId, hrName, confirmedAt }.",
      ],
    },
    {
      num: "06",
      title: "Activation & Full Workspace Unlock",
      actor: "HR / ADMIN / SYSTEM",
      badgeColor: primaryColor,
      details: [
        "• User status updated from 'Pending' to 'Active'.",
        "• Onboarding checklist status automatically marked as 'Completed'.",
        "• Full employee capabilities unlocked (Punch Clock, Sprints, Projects, Chat).",
      ],
    },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text("END-TO-END WORKFLOW ARCHITECTURE", margin, yPos);
  yPos += 5;

  const cardWidth = (pageWidth - margin * 2 - 8) / 2;
  const cardHeight = 31;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardWidth + 8);
    const y = yPos + row * (cardHeight + 6);

    // Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2.5, 2.5, "FD");

    // Header badge
    doc.setFillColor(...s.badgeColor);
    doc.roundedRect(x + 3, y + 3, 7, 7, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(s.num, x + 6.5, y + 7.5, { align: "center" });

    // Step Title
    doc.setTextColor(...darkNavy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(s.title, x + 12, y + 7.5);

    // Actor Tag
    doc.setFontSize(6);
    doc.setTextColor(...s.badgeColor);
    doc.text(`[${s.actor}]`, x + cardWidth - 4, y + 7.5, { align: "right" });

    // Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);

    let detailY = y + 13;
    s.details.forEach((line) => {
      const splitLine = doc.splitTextToSize(line, cardWidth - 8);
      doc.text(splitLine, x + 4, detailY);
      detailY += 4.2;
    });
  }

  yPos += 3 * (cardHeight + 6) + 6;

  // Transition Matrix Table (AutoTable)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text("LIFECYCLE STATE & API SPECIFICATION", margin, yPos);
  yPos += 4;

  const tableData = [
    [
      "Phase 1: Registration",
      "Candidate / Admin",
      "/api/auth/register\n/api/invite",
      "User.status = 'Pending'\ndocumentsSubmitted = false",
      "Restricted login; no project or payroll access until approved.",
    ],
    [
      "Phase 2: Assignment",
      "Workspace Admin",
      "/api/team/[id]\n/api/settings/hr-isolation",
      "User.hrId = ObjectId\nTenant.isolateHRData = boolean",
      "Assigns HR cohort. If isolation active, other HRs cannot view employee.",
    ],
    [
      "Phase 3: Checklist",
      "Designated HR",
      "/api/hr/checklists",
      "User.onboardedBy = { hrId, hrName, date }\nHROnboarding.items[]",
      "Creates onboarding checklist items (NDA, contract, orientation).",
    ],
    [
      "Phase 4: Docs Upload",
      "Employee",
      "/api/hr/documents/upload",
      "HRDocument.status = 'Submitted'\nHRDocument.fileUrl",
      "Employee accesses portal to submit required credentials and proofs.",
    ],
    [
      "Phase 5: Doc Verification",
      "Designated HR",
      "/api/hr/documents\n/api/team/[id]",
      "HRDocument.status = 'Verified'\nUser.documentsSubmitted = true",
      "HR validates submissions and flips confirmation toggle on employee card.",
    ],
    [
      "Phase 6: Activation",
      "HR / Admin",
      "/api/team/[id]\n/api/hr/checklists",
      "User.status = 'Active'\nHROnboarding.status = 'Completed'",
      "Unlocks attendance punch clock, sprints, chat, leaves, and deliverables.",
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [["Stage", "Actor", "API Endpoint", "Database Fields Updated", "Governance & Security"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 26 },
      2: { cellWidth: 34, font: "courier" },
      3: { cellWidth: 46 },
      4: { cellWidth: 44 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer on page 1
  const page1Total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= page1Total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderGray);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("NexAce CRM - Confidential & Proprietary  |  HR System Specification", margin, pageHeight - 7);
    doc.text(`Page ${i} of ${page1Total}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  // Save to primary output locations
  const projectPdfPath = path.join(process.cwd(), "Employee_Registration_to_Onboarding_Flow.pdf");
  const artifactDir = "C:\\Users\\Linux\\.gemini\\antigravity-ide\\brain\\fcb3251b-010f-4eeb-be6f-777dd4152853";
  const artifactPdfPath = path.join(artifactDir, "Employee_Registration_to_Onboarding_Flow.pdf");

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(projectPdfPath, pdfBuffer);
  console.log("PDF created successfully at:", projectPdfPath);

  try {
    if (fs.existsSync(artifactDir)) {
      fs.writeFileSync(artifactPdfPath, pdfBuffer);
      console.log("PDF mirrored to artifact directory at:", artifactPdfPath);
    }
  } catch (err) {
    console.warn("Could not mirror to artifact dir:", err);
  }
}

generatePDF();
