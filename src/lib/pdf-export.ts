import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForPdfReady(target: HTMLElement, timeoutMs = 20_000) {
  if (!target.hasAttribute("data-pdf-ready")) return;
  const start = Date.now();
  while (target.getAttribute("data-pdf-ready") !== "true" && Date.now() - start < timeoutMs) {
    await delay(150);
  }
  await delay(250);
}

async function waitForImages(target: HTMLElement) {
  const imgs = Array.from(target.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
}

function fieldText(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.text ?? el.value;
  return el.value;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let drawY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, drawY, maxWidth);
      line = word;
      drawY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, drawY, maxWidth);
}

function renderPdfCanvasSection(section: HTMLElement) {
  const pageCanvas = section.querySelector("canvas");
  const width = Math.ceil(section.offsetWidth || pageCanvas?.clientWidth || 612);
  const height = Math.ceil(section.offsetHeight || pageCanvas?.clientHeight || 792);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (pageCanvas) ctx.drawImage(pageCanvas, 0, 0, canvas.width, canvas.height);

  const sectionRect = section.getBoundingClientRect();
  section.querySelectorAll("img").forEach((img) => {
    if (!img.complete || img.naturalWidth === 0) return;
    const rect = img.getBoundingClientRect();
    ctx.drawImage(
      img,
      (rect.left - sectionRect.left) * scale,
      (rect.top - sectionRect.top) * scale,
      rect.width * scale,
      rect.height * scale,
    );
  });
  section.querySelectorAll("input, textarea, select").forEach((node) => {
    if (
      !(
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement ||
        node instanceof HTMLSelectElement
      )
    )
      return;
    const rect = node.getBoundingClientRect();
    const x = (rect.left - sectionRect.left) * scale;
    const y = (rect.top - sectionRect.top) * scale;
    const w = rect.width * scale;
    const h = rect.height * scale;

    if (node instanceof HTMLInputElement && (node.type === "checkbox" || node.type === "radio")) {
      const shouldDrawBox = node.dataset.adminCheckbox === "true";
      ctx.save();
      ctx.strokeStyle = "#111827";
      if (shouldDrawBox) {
        ctx.lineWidth = 1.2 * scale;
        ctx.strokeRect(x, y, w, h);
      }
      if (!node.checked) {
        ctx.restore();
        return;
      }
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.18, y + h * 0.55);
      ctx.lineTo(x + w * 0.42, y + h * 0.76);
      ctx.lineTo(x + w * 0.84, y + h * 0.22);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const text = fieldText(node).trim();
    if (!text) return;
    const style = window.getComputedStyle(node);
    const fontSize = (Number.parseFloat(style.fontSize) || 11) * scale;
    const lineHeight = (Number.parseFloat(style.lineHeight) || fontSize * 1.2) * scale;
    const padX = (Number.parseFloat(style.paddingLeft) || 2) * scale;
    const padY = (Number.parseFloat(style.paddingTop) || 1) * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = style.color && style.color !== "rgba(0, 0, 0, 0)" ? style.color : "#111827";
    ctx.font = `${style.fontStyle || "normal"} ${style.fontWeight || "400"} ${fontSize}px ${style.fontFamily || "Arial"}`;
    if (node instanceof HTMLTextAreaElement || h > lineHeight * 1.8) {
      ctx.textBaseline = "top";
      drawWrappedText(ctx, text, x + padX, y + padY, Math.max(1, w - padX * 2), lineHeight);
    } else {
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + padX, y + h / 2, Math.max(1, w - padX * 2));
    }
    ctx.restore();
  });

  return canvas;
}

async function renderSection(section: HTMLElement) {
  if (section.querySelector("canvas")) return renderPdfCanvasSection(section);
  return html2canvas(section, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    imageTimeout: 15000,
  });
}

export async function createLetterPdfBlob(
  target: HTMLElement,
  options: { onboarding?: boolean } = {},
) {
  await waitForPdfReady(target);
  await waitForImages(target);

  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const sectionNodes = Array.from(target.querySelectorAll("[data-pdf-section]")) as HTMLElement[];
  const sections = target.matches("[data-pdf-section]") ? [target, ...sectionNodes] : sectionNodes;

  if (sections.length > 0) {
    for (let i = 0; i < sections.length; i += 1) {
      const sectionCanvas = await renderSection(sections[i]);
      const imgData = sectionCanvas.toDataURL("image/jpeg", 0.94);
      if (i > 0) pdf.addPage();
      const isOriginalPdfPage =
        sections[i].querySelector("canvas") || sections[i].dataset.originalPage === "true";
      if (isOriginalPdfPage || (options.onboarding && sections[i].querySelector("canvas"))) {
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
      } else {
        const targetRect = target.getBoundingClientRect();
        const pxToPt = pageW / (targetRect.width || target.offsetWidth || 816);
        const targetStyle = window.getComputedStyle(target);
        const padLeft = (Number.parseFloat(targetStyle.paddingLeft) || 0) * pxToPt;
        const padTop = (Number.parseFloat(targetStyle.paddingTop) || 0) * pxToPt;
        const padRight = (Number.parseFloat(targetStyle.paddingRight) || 0) * pxToPt;
        const padBottom = (Number.parseFloat(targetStyle.paddingBottom) || 0) * pxToPt;
        const drawW = pageW - padLeft - padRight;
        const drawH = Math.min(
          pageH - padTop - padBottom,
          (sectionCanvas.height * drawW) / sectionCanvas.width,
        );
        pdf.addImage(imgData, "JPEG", padLeft, padTop, drawW, drawH);
      }
    }
  } else {
    const canvas = await renderSection(target);
    const sliceHeightPx = Math.floor((canvas.width * pageH) / pageW);
    let renderedPx = 0;
    let pageIndex = 0;
    while (renderedPx < canvas.height) {
      const sliceH = Math.min(sliceHeightPx, canvas.height - renderedPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const imgData = pageCanvas.toDataURL("image/jpeg", 0.94);
      const drawH = (sliceH * pageW) / canvas.width;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, drawH);
      renderedPx += sliceH;
      pageIndex += 1;
    }
  }

  return pdf.output("blob");
}
