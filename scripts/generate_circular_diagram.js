const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

// The 6 Onboarding steps tailored to NexAce CRM
const stepsData = [
  {
    num: "1",
    title: "Registration",
    line1: "Candidate signs up or accepts invite",
    line2: "Account created with 'Pending' status",
  },
  {
    num: "2",
    title: "HR Assignment",
    line1: "Admin assigns cohort & designated HR",
    line2: "HR Data Isolation hides other HRs",
  },
  {
    num: "3",
    title: "Checklist Setup",
    line1: "HR initializes onboarding checklist",
    line2: "Stamps 'onboardedBy' audit metadata",
  },
  {
    num: "4",
    title: "Document Upload",
    line1: "Employee views required documents",
    line2: "Uploads ID proofs & compliance files",
  },
  {
    num: "5",
    title: "HR Verification",
    line1: "HR audits files & verifies submissions",
    line2: "Flips 'Docs Confirmed' toggle switch",
  },
  {
    num: "6",
    title: "Active Status",
    line1: "Status promoted to 'Active'",
    line2: "Full workspace & deliverables unlocked",
  },
];

// ==========================================
// 1. GENERATE HIGH-RES SVG (Matching Reference Image)
// ==========================================
function generateSVG() {
  const width = 800;
  const height = 700;
  const cx = 400;
  const cy = 350;

  // Circle radius for step badges
  const badgeRadius = 225;
  // Radius for curved arrow arcs
  const arrowRadius = 175;

  // Angles for 6 steps:
  // Step 1: -90° (Top)
  // Step 2: -30° (Top-Right)
  // Step 3:  30° (Bottom-Right)
  // Step 4:  90° (Bottom)
  // Step 5: 150° (Bottom-Left)
  // Step 6: 210° (Top-Left)
  const anglesDeg = [-90, -30, 30, 90, 150, 210];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap');
      text { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      .center-title { font-size: 32px; font-weight: 800; fill: #1e3a8a; }
      .center-sub { font-size: 16px; font-weight: 500; fill: #64748b; }
      .step-num { font-size: 14px; font-weight: 700; fill: #1e3a8a; }
      .step-title { font-size: 15px; font-weight: 700; fill: #0f172a; }
      .step-desc { font-size: 11px; font-weight: 400; fill: #64748b; }
      .arrow-path { fill: none; stroke: #334155; stroke-width: 1.6; stroke-linecap: round; }
    </style>
    <!-- Arrowhead Marker -->
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#334155" />
    </marker>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="#ffffff" />

  <!-- Center Title & Subtitle -->
  <g text-anchor="middle">
    <text x="${cx}" y="${cy - 6}" class="center-title">Onboarding</text>
    <text x="${cx}" y="${cy + 22}" class="center-sub">Employee Lifecycle</text>
  </g>
`;

  // Draw 6 Curved Clockwise Arrows between steps
  // Each arrow spans ~34 degrees along the inner arc
  for (let i = 0; i < 6; i++) {
    const startAngleDeg = anglesDeg[i] + 16;
    const endAngleDeg = anglesDeg[(i + 1) % 6] - 16;

    const startRad = (startAngleDeg * Math.PI) / 180;
    const endRad = (endAngleDeg * Math.PI) / 180;

    const x1 = cx + arrowRadius * Math.cos(startRad);
    const y1 = cy + arrowRadius * Math.sin(startRad);
    const x2 = cx + arrowRadius * Math.cos(endRad);
    const y2 = cy + arrowRadius * Math.sin(endRad);

    // SVG arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    // sweep-flag = 1 for clockwise arc
    svg += `  <!-- Arrow ${i + 1} to ${(i % 6) + 1} -->\n`;
    svg += `  <path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${arrowRadius} ${arrowRadius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" class="arrow-path" marker-end="url(#arrowhead)" />\n`;
  }

  // Draw 6 Nodes (Circle badge + Title + 2-line Description)
  for (let i = 0; i < 6; i++) {
    const s = stepsData[i];
    const angleRad = (anglesDeg[i] * Math.PI) / 180;

    const nodeX = cx + badgeRadius * Math.cos(angleRad);
    const nodeY = cy + badgeRadius * Math.sin(angleRad);

    // Vertical layout adjustments based on position
    let textYOffset = 26;
    if (i === 0) textYOffset = 26; // top
    if (i === 3) textYOffset = 26; // bottom

    svg += `
  <!-- Node ${s.num}: ${s.title} -->
  <g transform="translate(${nodeX.toFixed(2)}, ${nodeY.toFixed(2)})">
    <!-- Number Badge -->
    <circle cx="0" cy="0" r="15" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5" />
    <text x="0" y="5" text-anchor="middle" class="step-num">${s.num}</text>

    <!-- Step Title -->
    <text x="0" y="${textYOffset}" text-anchor="middle" class="step-title">${s.title}</text>

    <!-- Subtitle lines -->
    <text x="0" y="${textYOffset + 16}" text-anchor="middle" class="step-desc">${s.line1}</text>
    <text x="0" y="${textYOffset + 30}" text-anchor="middle" class="step-desc">${s.line2}</text>
  </g>
`;
  }

  svg += `</svg>`;
  return svg;
}

// ==========================================
// 2. GENERATE MATCHING CLEAN PDF
// ==========================================
function generatePDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cx = pageWidth / 2;
  const cy = 135; // Center of circle on A4 page
  const badgeRadius = 70; // mm
  const arrowRadius = 52; // mm

  const anglesDeg = [-90, -30, 30, 90, 150, 210];

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFillColor(37, 99, 235); // Blue stripe
  doc.rect(0, 28, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("NexAce CRM - Employee Onboarding Lifecycle", pageWidth / 2, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Interactive Circular Process Flowchart", pageWidth / 2, 20, { align: "center" });

  // Center Circle Text
  doc.setTextColor(30, 58, 138); // Dark Navy/Blue
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Onboarding", cx, cy - 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Employee Lifecycle", cx, cy + 6, { align: "center" });

  // Draw 6 Curved Clockwise Arrows (using multiple small line segments along arc)
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.4);

  for (let i = 0; i < 6; i++) {
    const startAngleDeg = anglesDeg[i] + 18;
    const endAngleDeg = anglesDeg[(i + 1) % 6] - 18;
    const segments = 12;
    const stepDeg = (endAngleDeg - startAngleDeg) / segments;

    for (let j = 0; j < segments; j++) {
      const a1 = ((startAngleDeg + j * stepDeg) * Math.PI) / 180;
      const a2 = ((startAngleDeg + (j + 1) * stepDeg) * Math.PI) / 180;
      doc.line(cx + arrowRadius * Math.cos(a1), cy + arrowRadius * Math.sin(a1), cx + arrowRadius * Math.cos(a2), cy + arrowRadius * Math.sin(a2));
    }

    // Arrow tip
    const endRad = (endAngleDeg * Math.PI) / 180;
    const tipX = cx + arrowRadius * Math.cos(endRad);
    const tipY = cy + arrowRadius * Math.sin(endRad);
    const tangentRad = endRad + Math.PI / 2; // direction of travel

    const arrowHeadLen = 2.4;
    const barbAngle = 0.5; // ~28 degrees

    const barb1X = tipX - arrowHeadLen * Math.cos(tangentRad - barbAngle);
    const barb1Y = tipY - arrowHeadLen * Math.sin(tangentRad - barbAngle);
    const barb2X = tipX - arrowHeadLen * Math.cos(tangentRad + barbAngle);
    const barb2Y = tipY - arrowHeadLen * Math.sin(tangentRad + barbAngle);

    doc.triangle(tipX, tipY, barb1X, barb1Y, barb2X, barb2Y, "FD");
  }

  // Draw 6 Nodes
  for (let i = 0; i < 6; i++) {
    const s = stepsData[i];
    const angleRad = (anglesDeg[i] * Math.PI) / 180;

    const nx = cx + badgeRadius * Math.cos(angleRad);
    const ny = cy + badgeRadius * Math.sin(angleRad);

    // Number Badge Circle
    doc.setFillColor(224, 242, 254); // light sky blue
    doc.setDrawColor(56, 189, 248); // sky 400
    doc.setLineWidth(0.35);
    doc.circle(nx, ny, 4.8, "FD");

    // Number inside badge
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(s.num, nx, ny + 1.2, { align: "center" });

    // Step Title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(s.title, nx, ny + 9, { align: "center" });

    // Step Subtitle lines
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(s.line1, nx, ny + 13.5, { align: "center" });
    doc.text(s.line2, nx, ny + 17.5, { align: "center" });
  }

  // Bottom Summary Box
  const boxY = 230;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, pageWidth - 28, 45, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("LIFECYCLE HIGHLIGHTS & SECURITY GOVERNANCE", 18, boxY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const notes = [
    "1. Data Isolation: With Admin HR Isolation enabled, HR personnel are strictly restricted to their own assigned employee cohorts.",
    "2. Onboarder Tracking: The system stamps onboardedBy: { hrId, hrName, date } for complete audit trails visible to Workspace Admins.",
    "3. Verification Gate: HR reviews submitted files and flips the 'Docs: Confirmed' toggle before employee accounts are promoted to Active.",
  ];
  notes.forEach((n, idx) => {
    doc.text(n, 18, boxY + 14 + idx * 6);
  });

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("NexAce CRM Architecture Documentation", 14, pageHeight - 6);
  doc.text("Confidential & Proprietary", pageWidth - 14, pageHeight - 6, { align: "right" });

  return doc;
}

// Write SVG & PDF files
const svgContent = generateSVG();
const svgPath = path.join(process.cwd(), "Employee_Onboarding_Circular_Diagram.svg");
fs.writeFileSync(svgPath, svgContent, "utf8");
console.log("SVG generated at:", svgPath);

const pdfDoc = generatePDF();
const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
const pdfPath = path.join(process.cwd(), "Employee_Onboarding_Circular_Diagram.pdf");
fs.writeFileSync(pdfPath, pdfBuffer);
console.log("PDF generated at:", pdfPath);

// Mirror to artifacts directory
const artifactDir = "C:\\Users\\Linux\\.gemini\\antigravity-ide\\brain\\fcb3251b-010f-4eeb-be6f-777dd4152853";
try {
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, "Employee_Onboarding_Circular_Diagram.svg"), svgContent, "utf8");
    fs.writeFileSync(path.join(artifactDir, "Employee_Onboarding_Circular_Diagram.pdf"), pdfBuffer);
    console.log("Mirrored files to artifact dir successfully!");
  }
} catch (e) {
  console.warn("Mirror error:", e);
}
