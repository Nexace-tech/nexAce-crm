import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

export interface DomPdfOptions {
  fileName?: string;
  marginMm?: number;
  widthPx?: number;
}

/**
 * Captures an HTML element in high fidelity (retina 2x) and saves it as an A4 PDF document.
 * Ensures desktop layout, correct font loading, and clean paper rendering.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  options: DomPdfOptions = {}
): Promise<void> {
  const {
    fileName = "Invoice.pdf",
    marginMm = 8,
    widthPx = 860,
  } = options;

  // Wait for web fonts (Inter, Dancing Script, FontAwesome, etc.) to be ready
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font wait errors
    }
  }

  // Create an offscreen container to isolate and standardize rendering
  // This guarantees:
  // 1. Fixed desktop width (e.g. 860px) regardless of whether user is on mobile/narrow screen
  // 2. Forced light theme (no dark mode inversion on printed paper)
  // 3. No layout shifts or screen flashes for the user
  const container = document.createElement("div");
  container.className = "light";
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = `${widthPx}px`;
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.zIndex = "-99999";
  container.style.pointerEvents = "none";
  container.style.opacity = "0";

  // Deep clone the invoice card
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${widthPx}px`;
  clone.style.maxWidth = `${widthPx}px`;
  clone.style.minWidth = `${widthPx}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#0f172a";
  clone.style.boxShadow = "none";

  // Strip any lingering dark class from clone
  clone.classList.remove("dark");
  clone.classList.add("light");

  // Strip elements marked to be excluded from PDF download (e.g. shift attendance, audit logs)
  const excludedElements = clone.querySelectorAll(
    ".no-pdf, .pdf-exclude, .pdf-exclude-shift, [data-pdf-exclude]"
  );
  excludedElements.forEach((el) => el.remove());

  // Strip all icon tags from clone so no broken icon glyph boxes appear in PDF
  const iconElements = clone.querySelectorAll("i, .fa-solid, .fa-regular, .fa-brands, [class*='fa-']");
  iconElements.forEach((el) => el.remove());

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Render the clone to high-resolution canvas (2x pixel ratio for retina sharpness)
    // NOTE: skipFonts: true is essential to prevent browser SecurityError when accessing
    // cross-origin CDN stylesheets (like FontAwesome or Google Fonts)
    let canvas: HTMLCanvasElement;
    try {
      canvas = await toCanvas(clone, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        skipFonts: true,
      });
    } catch (renderErr) {
      console.warn("toCanvas failed, retrying with pixelRatio: 1.5", renderErr);
      canvas = await toCanvas(clone, {
        pixelRatio: 1.5,
        backgroundColor: "#ffffff",
        skipFonts: true,
      });
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // A4 dimensions in millimeters
    const a4WidthMm = 210;
    const a4HeightMm = 297;

    const contentWidthMm = a4WidthMm - marginMm * 2;
    const contentHeightMm = (canvasHeight * contentWidthMm) / canvasWidth;
    const maxPageContentHeightMm = a4HeightMm - marginMm * 2;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    if (contentHeightMm <= maxPageContentHeightMm) {
      // ── Single Page: Fits neatly on one A4 sheet at full size ──
      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(
        imgData,
        "PNG",
        marginMm,
        marginMm,
        contentWidthMm,
        contentHeightMm,
        undefined,
        "FAST"
      );
    } else if (contentHeightMm <= maxPageContentHeightMm * 1.45) {
      // ── Auto-Fit to 1 Page: If invoice is slightly taller than 1 A4 page (up to 45% overflow),
      // scale it proportionally so it fits on a single page instead of splitting! ──
      const scaleFactor = maxPageContentHeightMm / contentHeightMm;
      const scaledWidthMm = contentWidthMm * scaleFactor;
      const scaledHeightMm = maxPageContentHeightMm;
      // Center horizontally on page
      const offsetX = marginMm + (contentWidthMm - scaledWidthMm) / 2;
      const offsetY = marginMm;

      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(
        imgData,
        "PNG",
        offsetX,
        offsetY,
        scaledWidthMm,
        scaledHeightMm,
        undefined,
        "FAST"
      );
    } else {
      // ── Multi-Page: Clean pixel slice without clipped borders or overlap ──
      const pageHeightInPx = Math.floor((canvasWidth * maxPageContentHeightMm) / contentWidthMm);
      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvasHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sliceHeight = Math.min(pageHeightInPx, canvasHeight - renderedHeight);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvasWidth, sliceHeight);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvasWidth,
            sliceHeight,
            0,
            0,
            canvasWidth,
            sliceHeight
          );

          const sliceData = pageCanvas.toDataURL("image/png", 1.0);
          const sliceHeightMm = (sliceHeight * contentWidthMm) / canvasWidth;
          pdf.addImage(
            sliceData,
            "PNG",
            marginMm,
            marginMm,
            contentWidthMm,
            sliceHeightMm,
            undefined,
            "FAST"
          );
        }

        renderedHeight += sliceHeight;
        pageIndex++;
      }
    }

    pdf.save(fileName);
  } finally {
    // Clean up temporary DOM container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
