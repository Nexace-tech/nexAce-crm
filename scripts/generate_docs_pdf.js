const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

const CACHE_DIR = path.join(__dirname, 'diagram_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Pre-populate cache with already fetched diagrams if they exist
const preloaded = [
  { src: path.join(__dirname, 'test_diagram.png'), name: 'implementation_plan_arch.png' },
  { src: path.join(__dirname, 'test_prd_arch.png'), name: 'prd_arch.png' },
  { src: path.join(__dirname, 'test_prd_gantt.png'), name: 'prd_gantt.png' },
];
for (const p of preloaded) {
  if (fs.existsSync(p.src)) {
    try {
      fs.copyFileSync(p.src, path.join(CACHE_DIR, p.name));
    } catch {}
  }
}

async function getMermaidDiagramImage(mermaidCode) {
  const hash = crypto.createHash('md5').update(mermaidCode.trim()).digest('hex');
  const cachePath = path.join(CACHE_DIR, `mermaid_${hash}.png`);

  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }

  // Fallback checks for preloaded known diagrams
  if (mermaidCode.includes('Option A: Capacitor Native Shell') && fs.existsSync(path.join(CACHE_DIR, 'implementation_plan_arch.png'))) {
    return fs.readFileSync(path.join(CACHE_DIR, 'implementation_plan_arch.png'));
  }
  if (mermaidCode.includes('Native Mobile Shell') && fs.existsSync(path.join(CACHE_DIR, 'prd_arch.png'))) {
    return fs.readFileSync(path.join(CACHE_DIR, 'prd_arch.png'));
  }
  if (mermaidCode.includes('title NexAce CRM Mobile App Rollout Timeline') && fs.existsSync(path.join(CACHE_DIR, 'prd_gantt.png'))) {
    return fs.readFileSync(path.join(CACHE_DIR, 'prd_gantt.png'));
  }

  try {
    const base64 = Buffer.from(mermaidCode.trim()).toString('base64');
    const res = await fetch(`https://mermaid.ink/img/${base64}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(cachePath, buffer);
      return buffer;
    }
  } catch (err) {
    console.warn('Could not fetch Mermaid diagram from mermaid.ink:', err.message);
  }

  return null;
}

async function createPdfFromMarkdown(mdContent, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const marginTop = 24;
  const marginBottom = 20;
  const contentWidth = pageWidth - marginX * 2;

  let cursorY = marginTop;

  function checkPageBreak(requiredHeight) {
    if (cursorY + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
      return true;
    }
    return false;
  }

  const lines = mdContent.split('\n');
  let i = 0;

  // Render header banner on first page
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 11.5, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NEXACE CRM  ·  ENTERPRISE MOBILE PLATFORM SPECIFICATION', marginX, 7.5);
  doc.text('CONFIDENTIAL', pageWidth - marginX - 22, 7.5);

  cursorY = 22;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      cursorY += 2.5;
      i++;
      continue;
    }

    // Title (# )
    if (line.startsWith('# ')) {
      const titleText = line.replace(/^#\s+/, '').replace(/\*\*/g, '');
      checkPageBreak(25);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      const splitTitle = doc.splitTextToSize(titleText, contentWidth);
      doc.text(splitTitle, marginX, cursorY);
      cursorY += splitTitle.length * 7.5 + 2;

      // Decorative underline
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.8);
      doc.line(marginX, cursorY, marginX + 45, cursorY);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(marginX + 45, cursorY, marginX + contentWidth, cursorY);
      cursorY += 6;
      i++;
      continue;
    }

    // Horizontal rule (---)
    if (line === '---') {
      checkPageBreak(6);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginX, cursorY, marginX + contentWidth, cursorY);
      cursorY += 5;
      i++;
      continue;
    }

    // Section header (## )
    if (line.startsWith('## ')) {
      const headingText = line.replace(/^##\s+/, '').replace(/\*\*/g, '');
      checkPageBreak(16);
      cursorY += 3;

      // Background accent pill
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginX, cursorY - 4.5, contentWidth, 8, 1.5, 1.5, 'F');
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(marginX, cursorY - 4.5, 2.5, 8, 0.5, 0.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(headingText, marginX + 5, cursorY + 1.2);
      cursorY += 8.5;
      i++;
      continue;
    }

    // Subsection header (### )
    if (line.startsWith('### ')) {
      const subText = line.replace(/^###\s+/, '').replace(/\*\*/g, '');
      checkPageBreak(12);
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(67, 56, 202);
      doc.text(subText, marginX, cursorY);
      cursorY += 5.5;
      i++;
      continue;
    }

    // Sub-subsection header (#### )
    if (line.startsWith('#### ')) {
      const subsub = line.replace(/^####\s+/, '').replace(/\*\*/g, '');
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(subsub, marginX, cursorY);
      cursorY += 5;
      i++;
      continue;
    }

    // Callout alert (> [!TIP] or > [!IMPORTANT] or > [!NOTE])
    if (line.startsWith('> [!')) {
      const alertTypeMatch = line.match(/> \[!(\w+)\]/);
      const alertType = alertTypeMatch ? alertTypeMatch[1].toUpperCase() : 'NOTE';
      const calloutLines = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const cLine = lines[i].trim().replace(/^>\s?/, '');
        if (cLine) calloutLines.push(cLine);
        i++;
      }

      const rawAlertText = calloutLines.join(' ').replace(/\*\*/g, '');
      doc.setFontSize(8.5);
      const wrappedAlert = doc.splitTextToSize(rawAlertText, contentWidth - 14);
      const boxHeight = wrappedAlert.length * 4.2 + 9;

      checkPageBreak(boxHeight + 4);

      let boxColor = [248, 250, 252];
      let barColor = [99, 102, 241];
      let titleLabel = 'NOTE';

      if (alertType === 'TIP') {
        boxColor = [240, 253, 244];
        barColor = [16, 185, 129];
        titleLabel = 'KEY RECOMMENDATION / ARCHITECTURE TIP';
      } else if (alertType === 'IMPORTANT' || alertType === 'CAUTION' || alertType === 'WARNING') {
        boxColor = [254, 242, 242];
        barColor = [239, 68, 68];
        titleLabel = 'IMPORTANT DECISION REQUIRED';
      }

      doc.setFillColor(...boxColor);
      doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 1.5, 1.5, 'F');
      doc.setFillColor(...barColor);
      doc.roundedRect(marginX, cursorY, 2.5, boxHeight, 0.5, 0.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...barColor);
      doc.text(titleLabel, marginX + 6, cursorY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedAlert, marginX + 6, cursorY + 9);

      cursorY += boxHeight + 4;
      continue;
    }

    // Markdown Table
    if (line.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowStr = lines[i].trim();
        if (!/^[\|\s\-:]+$/.test(rowStr)) {
          const cells = rowStr
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim().replace(/\*\*/g, ''));
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const body = tableRows.slice(1);

        autoTable(doc, {
          startY: cursorY,
          head: [headers],
          body: body,
          margin: { left: marginX, right: marginX },
          theme: 'grid',
          headStyles: {
            fillColor: [67, 56, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 2.2,
          },
          bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8,
            cellPadding: 2,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          styles: {
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            overflow: 'linebreak',
          },
        });

        cursorY = doc.lastAutoTable.finalY + 5;
      }
      continue;
    }

    // Codeblock / Diagram (```...)
    if (line.startsWith('```')) {
      const lang = line.replace('```', '').trim().toLowerCase();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      const codeText = codeLines.join('\n');

      // Check if this is a Mermaid diagram
      if (lang === 'mermaid') {
        const diagramBuffer = await getMermaidDiagramImage(codeText);

        if (diagramBuffer) {
          try {
            const imgProps = doc.getImageProperties(diagramBuffer);
            const aspectRatio = imgProps.height / imgProps.width;

            // Fit within available content width
            let targetWidth = contentWidth;
            let targetHeight = targetWidth * aspectRatio;

            // Cap maximum height to fit comfortably on an A4 page
            const maxHeight = 110;
            if (targetHeight > maxHeight) {
              targetHeight = maxHeight;
              targetWidth = targetHeight / aspectRatio;
            }

            const totalBlockHeight = targetHeight + 12;
            checkPageBreak(totalBlockHeight + 4);

            // Container frame
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(marginX, cursorY, contentWidth, totalBlockHeight, 2, 2, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.4);
            doc.roundedRect(marginX, cursorY, contentWidth, totalBlockHeight, 2, 2, 'S');

            // Header bar on the diagram container
            doc.setFillColor(241, 245, 249);
            doc.rect(marginX, cursorY, contentWidth, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(67, 56, 202);
            doc.text('VISUAL ARCHITECTURAL SPECIFICATION & FLOW DIAGRAM', marginX + 4, cursorY + 4.2);

            // Center the diagram image horizontally inside the container
            const imgX = marginX + (contentWidth - targetWidth) / 2;
            const imgY = cursorY + 8;

            doc.addImage(diagramBuffer, imgProps.fileType, imgX, imgY, targetWidth, targetHeight);

            cursorY += totalBlockHeight + 5;
            continue;
          } catch (imgErr) {
            console.warn('Error embedding diagram image:', imgErr.message);
          }
        }
      }

      // Check if this is the Mobile Wireframe / Bottom Navigation Diagram
      if (codeText.includes('Workspace Logo') || codeText.includes('MAIN SCROLLABLE VIEW') || codeText.includes('fa-clock-in')) {
        const phoneBlockHeight = 92;
        checkPageBreak(phoneBlockHeight + 4);
        drawMobilePhoneWireframe(doc, marginX, cursorY, contentWidth);
        cursorY += phoneBlockHeight + 4;
        continue;
      }

      // Standard Codeblock fallback (sanitize box-drawing chars)
      const sanitizedCode = codeText
        .replace(/[┌┐└┘├┤┬┴┼]/g, '+')
        .replace(/[─━]/g, '-')
        .replace(/[│┃]/g, '|')
        .replace(/[·•]/g, '*');

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      const splitCode = doc.splitTextToSize(sanitizedCode, contentWidth - 8);
      const blockHeight = Math.min(splitCode.length * 3.4 + 7, 75);

      checkPageBreak(blockHeight + 4);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginX, cursorY, contentWidth, blockHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, cursorY, contentWidth, blockHeight, 1.5, 1.5, 'S');

      doc.setFillColor(226, 232, 240);
      doc.rect(marginX, cursorY, contentWidth, 4.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        lang ? lang.toUpperCase() + ' SPECIFICATION' : 'CODE / SPECIFICATION',
        marginX + 4,
        cursorY + 3.2
      );

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      const maxLines = Math.floor((blockHeight - 7) / 3.4);
      doc.text(splitCode.slice(0, maxLines), marginX + 4, cursorY + 8);

      cursorY += blockHeight + 4;
      continue;
    }

    // Checkbox task item (- [ ] or - [x])
    if (/^-\s+\[([ xX])\]/.test(line)) {
      const isChecked = line.includes('[x]') || line.includes('[X]');
      const taskText = line.replace(/^-\s+\[([ xX])\]\s+/, '').replace(/\*\*/g, '');
      doc.setFontSize(8.5);
      const splitTask = doc.splitTextToSize(taskText, contentWidth - 8);
      const taskHeight = splitTask.length * 4.2;

      checkPageBreak(taskHeight + 2);

      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.3);
      doc.rect(marginX + 1, cursorY - 2.8, 3, 3, isChecked ? 'FD' : 'S');
      if (isChecked) {
        doc.setFillColor(99, 102, 241);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(splitTask, marginX + 6, cursorY);
      cursorY += taskHeight + 1.5;
      i++;
      continue;
    }

    // Bullet item (- or *)
    if (/^[\-\*]\s+/.test(line)) {
      const bulletText = line.replace(/^[\-\*]\s+/, '').replace(/\*\*/g, '');
      doc.setFontSize(8.5);
      const splitBullet = doc.splitTextToSize(bulletText, contentWidth - 6);
      const bHeight = splitBullet.length * 4.2;

      checkPageBreak(bHeight + 2);

      doc.setFillColor(79, 70, 229);
      doc.circle(marginX + 2, cursorY - 1, 0.8, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(splitBullet, marginX + 6, cursorY);
      cursorY += bHeight + 1.2;
      i++;
      continue;
    }

    // Numbered list item (1. )
    if (/^\d+\.\s+/.test(line)) {
      const numMatch = line.match(/^(\d+\.)\s+(.*)/);
      const numLabel = numMatch ? numMatch[1] : '•';
      const itemText = (numMatch ? numMatch[2] : line).replace(/\*\*/g, '');
      doc.setFontSize(8.5);
      const splitItem = doc.splitTextToSize(itemText, contentWidth - 8);
      const itemHeight = splitItem.length * 4.2;

      checkPageBreak(itemHeight + 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text(numLabel, marginX + 1, cursorY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(splitItem, marginX + 7, cursorY);
      cursorY += itemHeight + 1.5;
      i++;
      continue;
    }

    // Metadata lines (e.g. **Document Version:** ...)
    if (line.startsWith('**') && line.includes(':**')) {
      checkPageBreak(6);
      const cleanLine = line.replace(/\*\*/g, '');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx !== -1) {
        const key = cleanLine.slice(0, colonIdx + 1);
        const val = cleanLine.slice(colonIdx + 1).trim();

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(key, marginX, cursorY);
        const keyWidth = doc.getTextWidth(key);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val, marginX + keyWidth + 2, cursorY);
      } else {
        doc.text(cleanLine, marginX, cursorY);
      }
      cursorY += 4.8;
      i++;
      continue;
    }

    // Standard Paragraph
    const cleanParagraph = line.replace(/\*\*/g, '');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitPara = doc.splitTextToSize(cleanParagraph, contentWidth);
    const pHeight = splitPara.length * 4.2;

    checkPageBreak(pHeight + 2);
    doc.text(splitPara, marginX, cursorY);
    cursorY += pHeight + 2.5;
    i++;
  }

  // Running headers and footers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    if (pageNum > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(options.docTitle || 'NexAce CRM · Mobile App Specification', marginX, 12);
      doc.text('CONFIDENTIAL', pageWidth - marginX - 22, 12);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 14.5, pageWidth - marginX, 14.5);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('NexAce CRM  ·  Enterprise Cross-Platform Architecture', marginX, pageHeight - 8);

    const pageStr = `Page ${pageNum} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - marginX - pageStrWidth, pageHeight - 8);
  }

  return doc;
}

function drawMobilePhoneWireframe(doc, containerX, cursorY, containerWidth) {
  const phoneWidth = 110;
  const phoneHeight = 78;
  const phoneX = containerX + (containerWidth - phoneWidth) / 2;
  const phoneY = cursorY + 2;

  // Outer container box with decorative title
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(containerX, cursorY, containerWidth, phoneHeight + 10, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(containerX, cursorY, containerWidth, phoneHeight + 10, 2, 2, 'S');

  // Header banner on container
  doc.setFillColor(241, 245, 249);
  doc.rect(containerX, cursorY, containerWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(67, 56, 202);
  doc.text('MOBILE UI/UX SPECIFICATION  ·  NATIVE 5-TAB BOTTOM NAVIGATION & VIEWPORT MOCKUP', containerX + 4, cursorY + 4.2);

  // Phone Chassis (Dark slate-900 chassis)
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(phoneX, phoneY + 4, phoneWidth, phoneHeight, 4, 4, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.roundedRect(phoneX, phoneY + 4, phoneWidth, phoneHeight, 4, 4, 'S');

  // Phone Screen Bezel
  const screenX = phoneX + 1.8;
  const screenY = phoneY + 5.8;
  const screenW = phoneWidth - 3.6;
  const screenH = phoneHeight - 3.6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(screenX, screenY, screenW, screenH, 2.5, 2.5, 'F');

  // Dynamic Island Pill
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(screenX + (screenW - 24) / 2, screenY + 1.2, 24, 3, 1.5, 1.5, 'F');

  // Phone Status Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('09:41', screenX + 4, screenY + 3.2);
  doc.text('5G  100%', screenX + screenW - 14, screenY + 3.2);

  // App Top Header Bar
  const appHeaderY = screenY + 5;
  doc.setFillColor(15, 23, 42);
  doc.rect(screenX, appHeaderY, screenW, 8.5, 'F');

  // Workspace Logo / Title
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(screenX + 3, appHeaderY + 1.8, 5, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NexAce CRM', screenX + 10, appHeaderY + 5.5);

  // Notification Bell with Badge (3)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(203, 213, 225);
  doc.text('ALERTS', screenX + screenW - 18, appHeaderY + 5.2);
  doc.setFillColor(239, 68, 68);
  doc.circle(screenX + screenW - 13, appHeaderY + 3.2, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text('3', screenX + screenW - 13.8, appHeaderY + 4.2);

  // User Avatar Circle
  doc.setFillColor(14, 165, 233);
  doc.circle(screenX + screenW - 5.5, appHeaderY + 4.3, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AS', screenX + screenW - 7, appHeaderY + 5.6);

  // Screen Content Area
  const bodyY = appHeaderY + 10.5;

  // Card 1: Attendance Live Clock-in
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(screenX + 3, bodyY, screenW - 6, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(screenX + 3, bodyY, screenW - 6, 12, 1.5, 1.5, 'S');

  doc.setFillColor(34, 197, 94);
  doc.circle(screenX + 6, bodyY + 4, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Daily Shift Attendance', screenX + 9, bodyY + 4.8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(79, 70, 229);
  doc.text('03:42:15 IST (Active)', screenX + 9, bodyY + 9.5);

  doc.setFillColor(22, 163, 74);
  doc.roundedRect(screenX + screenW - 25, bodyY + 3, 20, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.text('CHECK IN', screenX + screenW - 22, bodyY + 7);

  // Card 2: 3 KPI Metric Cards
  const kpiY = bodyY + 13.5;
  const kpiW = (screenW - 8) / 3;

  const kpis = [
    { label: 'Active Tasks', val: '14', col: [79, 70, 229] },
    { label: 'Pending Approvals', val: '3', col: [234, 88, 12] },
    { label: 'Unread Chats', val: '5', col: [14, 165, 233] },
  ];

  kpis.forEach((k, idx) => {
    const kX = screenX + 3 + idx * (kpiW + 1);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(kX, kpiY, kpiW, 10, 1, 1, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(kX, kpiY, kpiW, 10, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...k.col);
    doc.text(k.val, kX + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, kX + 3, kpiY + 8);
  });

  // Card 3: Sprint Task Mini-Bar
  const taskY = kpiY + 11.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(screenX + 3, taskY, screenW - 6, 9, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(screenX + 3, taskY, screenW - 6, 9, 1, 1, 'S');

  doc.setFillColor(79, 70, 229);
  doc.rect(screenX + 3, taskY, 1.5, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(30, 41, 59);
  doc.text('Sprint 24 · Checkout Flow Revamp', screenX + 7, taskY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.setTextColor(100, 116, 139);
  doc.text('Assigned to you · Due in 2 days', screenX + 7, taskY + 7.5);

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(screenX + screenW - 16, taskY + 2.5, 11, 4, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(220, 38, 38);
  doc.text('High Priority', screenX + screenW - 15, taskY + 5.2);

  // Bottom 5-Tab Navigation Bar Dock
  const navH = 13;
  const navY = screenY + screenH - navH;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(screenX, navY, screenW, navH, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(screenX, navY, screenX + screenW, navY);

  const tabWidth = screenW / 5;
  const tabs = [
    { label: 'Home', icon: 'fa-gauge', active: true },
    { label: 'Tasks', icon: 'fa-folder', active: false },
    { label: 'Check-In', icon: 'fa-clock', isCenter: true },
    { label: 'Chat', icon: 'fa-comment', badge: '2', active: false },
    { label: 'More', icon: 'fa-bars', active: false },
  ];

  tabs.forEach((tab, idx) => {
    const tX = screenX + idx * tabWidth;
    const centerX = tX + tabWidth / 2;

    if (tab.isCenter) {
      doc.setFillColor(79, 70, 229);
      doc.circle(centerX, navY + 3.5, 4.5, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.6);
      doc.circle(centerX, navY + 3.5, 4.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.8);
      doc.setTextColor(255, 255, 255);
      doc.text('GPS', centerX - 2.2, navY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.setTextColor(79, 70, 229);
      doc.text(tab.label, centerX - doc.getTextWidth(tab.label) / 2, navY + 10.5);
    } else {
      if (tab.active) {
        doc.setFillColor(79, 70, 229);
        doc.circle(centerX, navY + 2.5, 0.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.5);
        doc.setTextColor(79, 70, 229);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(100, 116, 139);
      }

      doc.text(tab.label, centerX - doc.getTextWidth(tab.label) / 2, navY + 7.5);

      doc.setFontSize(3.2);
      doc.setTextColor(148, 163, 184);
      doc.text(tab.icon, centerX - doc.getTextWidth(tab.icon) / 2, navY + 10);

      if (tab.badge) {
        doc.setFillColor(239, 68, 68);
        doc.circle(centerX + 3.5, navY + 4.5, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(3);
        doc.setTextColor(255, 255, 255);
        doc.text(tab.badge, centerX + 2.8, navY + 5.2);
      }
    }
  });

  // Home Gesture Indicator Pill
  doc.setFillColor(203, 213, 225);
  doc.roundedRect(screenX + (screenW - 24) / 2, screenY + screenH - 1.8, 24, 1, 0.5, 0.5, 'F');
}

async function main() {
  const brainDir = 'C:\\Users\\Linux\\.gemini\\antigravity-ide\\brain\\dc753f8a-a7ec-4637-b452-a8b971380faa';
  const workspaceDir = 'C:\\Users\\Linux\\Desktop\\Dev AI\\CRM\\NexAce CRM';

  const planMdPath = path.join(brainDir, 'implementation_plan.md');
  const prdMdPath = path.join(brainDir, 'mobile_app_prd.md');

  console.log('Generating Implementation Plan PDF with visual diagrams...');
  const planMd = fs.readFileSync(planMdPath, 'utf8');
  const planDoc = await createPdfFromMarkdown(planMd, {
    docTitle: 'NexAce CRM · Mobile App Conversion Strategy & Implementation Plan',
  });

  const planPdfBuffer = Buffer.from(planDoc.output('arraybuffer'));
  const planDest1 = path.join(workspaceDir, 'NexAce_CRM_Mobile_App_Implementation_Plan.pdf');
  const planDest2 = path.join(brainDir, 'NexAce_CRM_Mobile_App_Implementation_Plan.pdf');
  fs.writeFileSync(planDest1, planPdfBuffer);
  fs.writeFileSync(planDest2, planPdfBuffer);
  console.log('Saved Implementation Plan PDF to:', planDest1);

  console.log('Generating Mobile App PRD PDF with visual diagrams...');
  const prdMd = fs.readFileSync(prdMdPath, 'utf8');
  const prdDoc = await createPdfFromMarkdown(prdMd, {
    docTitle: 'NexAce CRM · Mobile Application Product Requirement Document (PRD)',
  });

  const prdPdfBuffer = Buffer.from(prdDoc.output('arraybuffer'));
  const prdDest1 = path.join(workspaceDir, 'NexAce_CRM_Mobile_App_PRD.pdf');
  const prdDest2 = path.join(brainDir, 'NexAce_CRM_Mobile_App_PRD.pdf');
  fs.writeFileSync(prdDest1, prdPdfBuffer);
  fs.writeFileSync(prdDest2, prdPdfBuffer);
  console.log('Saved Mobile App PRD PDF to:', prdDest1);

  console.log('Both PDFs updated successfully with visual diagrams!');
}

main().catch(console.error);
