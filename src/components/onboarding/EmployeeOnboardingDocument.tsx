'use client'

import { forwardRef, useEffect, useRef, useState } from "react";

const FILLABLE_PDF_URL = '/employee-onboarding-document-fillable.pdf';

export type EmployeeOnboardingData = {
  employeeName: string;
  employeeSignDate: string;
  employerName: string;
  employerTitle: string;
  evaluatorSignDate: string;
  pdfFields?: Record<string, unknown>;
};

export const DEFAULT_EMPLOYEE_ONBOARDING_DATA: EmployeeOnboardingData = {
  employeeName: "",
  employeeSignDate: "",
  employerName: "",
  employerTitle: "",
  evaluatorSignDate: "",
  pdfFields: {},
};

function fmt(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

type Props = {
  value: EmployeeOnboardingData;
  editable?: boolean;
  role?: "admin" | "employee";
  onChange?: (next: EmployeeOnboardingData) => void;
  employeeSignature?: string;
  evaluatorSignature?: string;
};

type AdminOnlyMask = { page: number; rect: [number, number, number, number] };
type AdminOnlyField = {
  key: string;
  label: string;
  page: number;
  rect: [number, number, number, number];
  kind?: "text" | "textarea" | "checkbox";
  defaultValue?: (data: EmployeeOnboardingData) => string;
};

type AnnotationStorageLike = {
  setValue: (key: string, value: unknown) => void;
  getAll: () => Record<string, unknown> | undefined;
};

type PdfViewportLike = {
  width: number;
  height: number;
  scale: number;
  clone: (options: { dontFlip: boolean }) => unknown;
  convertToViewportRectangle: (rect: [number, number, number, number]) => number[];
};

type PdfPageLike = {
  getViewport: (options: { scale: number }) => PdfViewportLike;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewportLike }) => {
    promise: Promise<void>;
  };
  getAnnotations: (options: { intent: string }) => Promise<Array<{ subtype?: string }>>;
};

type PdfDocumentLike = {
  annotationStorage: AnnotationStorageLike;
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};

function alignFormFieldToUnderline(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
) {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return;
  const height =
    el.getBoundingClientRect().height || el.offsetHeight || parseFloat(el.style.height) || 18;
  const isTallTextarea = el instanceof HTMLTextAreaElement && height > 36;
  const fontSize = Math.max(9, Math.min(14, Math.floor(height - 3)));
  const controlHeight = isTallTextarea ? height : Math.min(height, fontSize + 4);

  el.style.boxSizing = "border-box";
  el.style.fontFamily = "Arial, Helvetica, sans-serif";
  el.style.fontSize = `${fontSize}px`;
  el.style.setProperty("height", isTallTextarea ? `${height}px` : `${controlHeight}px`, "important");
  el.style.setProperty("line-height", `${controlHeight}px`, "important");
  el.style.margin = "0";
  el.style.setProperty("padding", isTallTextarea ? "2px 3px 0 3px" : "0 3px", "important");
  el.style.overflow = "hidden";
  el.style.verticalAlign = "bottom";
  if (!isTallTextarea) {
    el.style.setProperty("position", "absolute", "important");
    el.style.setProperty("left", "0", "important");
    el.style.setProperty("right", "0", "important");
    el.style.setProperty("top", "auto", "important");
    el.style.setProperty("bottom", "-1px", "important");
    el.style.setProperty("width", "100%", "important");
  }
}

function alignAnnotationFields(container: HTMLElement) {
  container.querySelectorAll("input, textarea, select").forEach((node) => {
    if (
      node instanceof HTMLInputElement ||
      node instanceof HTMLTextAreaElement ||
      node instanceof HTMLSelectElement
    ) {
      alignFormFieldToUnderline(node);
    }
  });
}

const ADMIN_ONLY_MASKS: AdminOnlyMask[] = [
  { page: 3, rect: [25, 18, 590, 112] },
  { page: 8, rect: [70, 32, 565, 78] },
  { page: 9, rect: [35, 28, 580, 90] },
  { page: 14, rect: [20, 536, 595, 556] },
  { page: 17, rect: [35, 45, 580, 405] },
];

const i9ListRows = [
  ["documentTitle1", "Document Title 1", 343, 358],
  ["issuingAuthority1", "Issuing Authority 1", 325, 340],
  ["documentNumber1", "Document Number 1", 307, 322],
  ["expirationDate1", "Expiration Date 1", 290, 304],
  ["documentTitle2", "Document Title 2", 272, 286],
  ["issuingAuthority2", "Issuing Authority 2", 254, 268],
  ["documentNumber2", "Document Number 2", 236, 250],
  ["expirationDate2", "Expiration Date 2", 218, 232],
  ["documentTitle3", "Document Title 3", 200, 214],
  ["issuingAuthority3", "Issuing Authority 3", 182, 196],
  ["documentNumber3", "Document Number 3", 164, 178],
  ["expirationDate3", "Expiration Date 3", 146, 160],
] as const;

const ADMIN_ONLY_FIELDS: AdminOnlyField[] = [
  { key: "admin.registry.performedBy", label: "Registry Check Performed By", page: 3, rect: [165, 43, 354, 62] },
  { key: "admin.registry.date", label: "Registry Check Date", page: 3, rect: [385, 43, 456, 62] },
  { key: "admin.registry.listedYes", label: "Listed on Registry Yes", page: 3, rect: [500, 44, 512, 56], kind: "checkbox" },
  { key: "admin.registry.listedNo", label: "Listed on Registry No", page: 3, rect: [546, 44, 558, 56], kind: "checkbox" },
  { key: "admin.drug.rcsRepresentative", label: "Employer Representative", page: 8, rect: [160, 58, 360, 73] },
  { key: "admin.drug.signatureDate", label: "Employer Signature and Date", page: 8, rect: [425, 58, 560, 73], defaultValue: (data) => [data.employerName, data.evaluatorSignDate].filter(Boolean).join(" / ") },
  { key: "admin.w4.employerNameAddress", label: "W-4 Employer Name and Address", page: 9, rect: [97, 36, 390, 57], kind: "textarea" },
  { key: "admin.w4.firstEmploymentDate", label: "W-4 First Date of Employment", page: 9, rect: [394, 36, 468, 54] },
  { key: "admin.w4.ein", label: "W-4 Employer Identification Number", page: 9, rect: [471, 36, 576, 54] },
  { key: "admin.njw4.employerNameAddress", label: "NJ-W4 Employer Name and Address", page: 14, rect: [22, 539, 365, 553] },
  { key: "admin.njw4.ein", label: "NJ-W4 Employer Identification Number", page: 14, rect: [376, 539, 592, 553] },
  ...i9ListRows.map(([key, label, y1, y2]) => ({
    key: `admin.i9.listA.${key}`,
    label: `I-9 List A ${label}`,
    page: 17,
    rect: [132, y1, 270, y2] as [number, number, number, number],
  })),
  ...i9ListRows.slice(0, 4).flatMap(([key, label, y1, y2]) => [
    { key: `admin.i9.listB.${key}`, label: `I-9 List B ${label}`, page: 17, rect: [290, y1, 432, y2] as [number, number, number, number] },
    { key: `admin.i9.listC.${key}`, label: `I-9 List C ${label}`, page: 17, rect: [435, y1, 575, y2] as [number, number, number, number] },
  ]),
  { key: "admin.i9.additionalInformation", label: "I-9 Additional Information", page: 17, rect: [278, 163, 575, 286], kind: "textarea" },
  { key: "admin.i9.firstDayEmployment", label: "I-9 First Day of Employment", page: 17, rect: [482, 112, 575, 126] },
  { key: "admin.i9.employerNameTitle", label: "I-9 Employer Name and Title", page: 17, rect: [38, 80, 300, 95], defaultValue: (data) => [data.employerName, data.employerTitle].filter(Boolean).join(", ") },
  { key: "admin.i9.employerSignature", label: "I-9 Employer Signature", page: 17, rect: [305, 80, 499, 95], defaultValue: (data) => data.employerName },
  { key: "admin.i9.todayDate", label: "I-9 Today's Date", page: 17, rect: [503, 80, 575, 95], defaultValue: (data) => data.evaluatorSignDate },
  { key: "admin.i9.organizationName", label: "I-9 Employer Business or Organization Name", page: 17, rect: [38, 55, 250, 70] },
  { key: "admin.i9.organizationAddress", label: "I-9 Employer Business or Organization Address", page: 17, rect: [255, 55, 575, 70] },
];

export const EmployeeOnboardingDocument = forwardRef<HTMLElement, Props>(
  function EmployeeOnboardingDocument(
    { value, editable, role = "employee", onChange, employeeSignature, evaluatorSignature },
    ref,
  ) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const storageRef = useRef<AnnotationStorageLike | null>(null);
    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);
    const editableRef = useRef(editable);
    const [pageCount, setPageCount] = useState(0);
    const [hasFormFields, setHasFormFields] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => { onChangeRef.current = onChange; });
    useEffect(() => {
      valueRef.current = value;
      const saved = (value.pdfFields ?? {}) as Record<string, unknown>;
      for (const [key, savedValue] of Object.entries(saved)) {
        try { storageRef.current?.setValue(key, savedValue as never); } catch { /* ignore */ }
      }

      const readSaved = (key: string) => {
        const entry = saved[key] as { value?: unknown } | string | boolean | undefined;
        return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
      };
      const escapeCss = (text: string) =>
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(text)
          : text.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

      ADMIN_ONLY_FIELDS.forEach((field) => {
        const el = viewerRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[data-admin-only-field="${escapeCss(field.key)}"]`,
        );
        if (!el) return;
        const storedValue = readSaved(field.key) || field.defaultValue?.(value) || "";
        if (field.kind === "checkbox" && el instanceof HTMLInputElement) {
          el.checked = Boolean(storedValue);
        } else {
          el.value = String(storedValue ?? "");
        }
      });
    }, [value, ready]);
    useEffect(() => { editableRef.current = editable; });

    const updateStoredFieldValue = (key: string, fieldValue: string | boolean) => {
      if (!onChangeRef.current) return;
      const pdfFields = {
        ...(valueRef.current.pdfFields ?? {}),
        ...(storageRef.current?.getAll?.() ?? {}),
        [key]: { value: fieldValue },
      };
      if (key === "admin.registry.listedYes" && fieldValue)
        pdfFields["admin.registry.listedNo"] = { value: false };
      if (key === "admin.registry.listedNo" && fieldValue)
        pdfFields["admin.registry.listedYes"] = { value: false };
      const next = { ...valueRef.current, pdfFields };
      valueRef.current = next;
      onChangeRef.current(next);
    };

    useEffect(() => {
      let cancelled = false;
      const viewer = viewerRef.current;
      if (!viewer) return;

      const linkService = {
        externalLinkEnabled: true,
        externalLinkRel: "noopener noreferrer nofollow",
        externalLinkTarget: 2,
        eventBus: null,
        getDestinationHash: () => "#",
        getAnchorUrl: () => "#",
        goToDestination: async () => {},
        executeNamedAction: () => {},
        executeSetOCGState: () => {},
        isInPresentationMode: false,
        addLinkAttributes: (link: HTMLAnchorElement, url: string) => {
          link.href = url || "#";
          link.target = "_blank";
          link.rel = "noopener noreferrer nofollow";
        },
      };

      (async () => {
        try {
          const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
          if (cancelled) return;
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

          const doc = (await pdfjs.getDocument({ url: FILLABLE_PDF_URL }).promise) as PdfDocumentLike & {
            annotationStorage: AnnotationStorageLike;
          };
          if (cancelled) return;
          storageRef.current = doc.annotationStorage;

          viewer.innerHTML = "";
          const containerWidth = viewer.clientWidth || 816;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          let anyFields = false;

          for (let n = 1; n <= doc.numPages; n++) {
            const page = await doc.getPage(n);
            if (cancelled) return;
            const base = page.getViewport({ scale: 1 });
            const scale = containerWidth / base.width;
            const viewport = page.getViewport({ scale });

            const pageDiv = document.createElement("div");
            pageDiv.className = "pdf-page";
            pageDiv.style.position = "relative";
            pageDiv.style.width = `${viewport.width}px`;
            pageDiv.style.height = `${viewport.height}px`;
            pageDiv.style.margin = "0 auto 12px auto";
            pageDiv.style.background = "#ffffff";
            pageDiv.style.boxShadow = "0 0 0 1px #e5e7eb";
            pageDiv.style.setProperty("--scale-factor", String(scale));
            pageDiv.style.setProperty("--total-scale-factor", String(scale));

            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.display = "block";
            pageDiv.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const renderViewport = page.getViewport({ scale: scale * dpr });
              await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
            }
            if (cancelled) return;

            const layerDiv = document.createElement("div");
            layerDiv.className = "annotationLayer";
            pageDiv.appendChild(layerDiv);
            try {
              const annotations = await page.getAnnotations({ intent: "display" });
              if (annotations.some((a) => a.subtype === "Widget")) anyFields = true;
              const AnnotationLayerCtor = pdfjs.AnnotationLayer;
              const layer = new AnnotationLayerCtor({
                div: layerDiv,
                page,
                viewport: viewport.clone({ dontFlip: true }),
                accessibilityManager: null,
                annotationCanvasMap: null,
                annotationEditorUIManager: null,
                structTreeLayer: null,
                linkService,
                annotationStorage: doc.annotationStorage,
              });
              await layer.render({
                annotations,
                imageResourcesPath: "",
                renderForms: true,
                linkService,
                annotationStorage: doc.annotationStorage,
                viewport: viewport.clone({ dontFlip: true }),
                div: layerDiv,
                page,
              });
            } catch (layerErr) {
              console.error("[pdf] annotation layer failed on page", n, layerErr);
            }

            const toCss = (rect: [number, number, number, number]) => {
              const r = viewport.convertToViewportRectangle(rect);
              const left = Math.min(r[0], r[2]);
              const top = Math.min(r[1], r[3]);
              return { left, top, width: Math.abs(r[2] - r[0]), height: Math.abs(r[3] - r[1]) };
            };

            if (role !== "admin") {
              ADMIN_ONLY_MASKS.filter((m) => m.page === n).forEach((m) => {
                const c = toCss(m.rect);
                const mask = document.createElement("div");
                mask.style.cssText = `position:absolute;left:${c.left}px;top:${c.top}px;width:${c.width}px;height:${c.height}px;background:#ffffff;z-index:4;`;
                pageDiv.appendChild(mask);
              });
            }

            if (role === "admin") {
              ADMIN_ONLY_FIELDS.filter((f) => f.page === n).forEach((field) => {
                const c = toCss(field.rect);
                const el =
                  field.kind === "textarea"
                    ? document.createElement("textarea")
                    : document.createElement("input");
                if (el instanceof HTMLInputElement) {
                  el.type = field.kind === "checkbox" ? "checkbox" : "text";
                  if (field.kind === "checkbox") el.dataset.adminCheckbox = "true";
                }
                el.dataset.adminOnlyField = field.key;
                el.setAttribute("aria-label", field.label);
                el.style.cssText = `position:absolute;left:${c.left}px;top:${c.top}px;width:${c.width}px;height:${c.height}px;z-index:5;background:transparent;border:0;outline:none;`;
                if (!(el instanceof HTMLInputElement && el.type === "checkbox")) {
                  alignFormFieldToUnderline(el);
                  el.style.position = "absolute";
                  el.style.left = `${c.left}px`;
                  el.style.top = `${c.top}px`;
                  el.style.width = `${c.width}px`;
                  el.style.height = `${c.height}px`;
                  el.style.zIndex = "5";
                }
                el.addEventListener("input", () => {
                  if (el instanceof HTMLInputElement && el.type === "checkbox") {
                    updateStoredFieldValue(field.key, el.checked);
                  } else {
                    updateStoredFieldValue(field.key, el.value);
                  }
                });
                const wrapper = document.createElement("div");
                wrapper.className = "annotationLayer";
                wrapper.style.zIndex = "5";
                wrapper.appendChild(el);
                pageDiv.appendChild(wrapper);
              });
            }

            viewer.appendChild(pageDiv);
            alignAnnotationFields(layerDiv);
            setPageCount(n);
          }

          if (cancelled) return;

          const saved = (valueRef.current.pdfFields ?? {}) as Record<string, unknown>;
          for (const [key, entry] of Object.entries(saved)) {
            try { doc.annotationStorage.setValue(key, entry as never); } catch { /* ignore */ }
            const raw =
              entry && typeof entry === "object" && "value" in (entry as object)
                ? (entry as { value?: unknown }).value
                : entry;
            const el = viewer.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              `[data-element-id="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key}"]`,
            );
            if (el) {
              if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
                el.checked = Boolean(raw);
              } else {
                el.value = String(raw ?? "");
              }
            }
          }

          const persist = () => {
            if (!onChangeRef.current || !editableRef.current) return;
            const all = storageRef.current?.getAll?.() ?? {};
            const serializable: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(all)) {
              const val = v && typeof v === "object" && "value" in (v as object)
                ? (v as { value?: unknown }).value
                : v;
              serializable[k] = { value: val };
            }
            const next = {
              ...valueRef.current,
              pdfFields: { ...(valueRef.current.pdfFields ?? {}), ...serializable },
            };
            valueRef.current = next;
            onChangeRef.current(next);
          };
          viewer.addEventListener("input", persist);
          viewer.addEventListener("change", persist);

          setHasFormFields(anyFields);
          setError(null);
          setReady(true);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load the document.");
            setReady(true);
          }
        }
      })();

      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    useEffect(() => {
      if (!ready) return;
      viewerRef.current
        ?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input, textarea, select",
        )
        .forEach((el) => { el.disabled = !editable; });
    }, [editable, ready]);

    void pageCount;
    void hasFormFields;

    const set = <K extends keyof EmployeeOnboardingData>(k: K, v: EmployeeOnboardingData[K]) =>
      onChange?.({ ...value, [k]: v });

    return (
      <article
        ref={ref as React.Ref<HTMLElement>}
        data-pdf-ready={ready ? "true" : "false"}
        className="letter print-page mx-auto w-full max-w-[8.5in] bg-white p-6 text-[13px] leading-relaxed text-black"
      >
        <style>{`
          .pdf-page .annotationLayer {
            position: absolute; inset: 0; pointer-events: none;
            transform-origin: 0 0; z-index: 3;
          }
          .annotationLayer section {
            position: absolute; pointer-events: auto;
            box-sizing: border-box; transform-origin: 0 0; text-align: initial;
          }
          .annotationLayer section[hidden], .annotationLayer .popupAnnotation { display: none; }
          .annotationLayer .textWidgetAnnotation input,
          .annotationLayer .textWidgetAnnotation textarea,
          .annotationLayer .choiceWidgetAnnotation select,
          .annotationLayer .buttonWidgetAnnotation.checkBox input,
          .annotationLayer .buttonWidgetAnnotation.radioButton input {
            width: 100%; height: 100%; pointer-events: auto;
          }
          .annotationLayer > input, .annotationLayer > textarea { pointer-events: auto; }
          .annotationLayer input, .annotationLayer textarea, .annotationLayer select,
          .annotationLayer .textWidgetAnnotation input,
          .annotationLayer .textWidgetAnnotation textarea,
          .annotationLayer .choiceWidgetAnnotation select,
          .annotationLayer .buttonWidgetAnnotation.checkBox input,
          .annotationLayer .buttonWidgetAnnotation.radioButton input {
            background-image: none !important; background-color: transparent !important;
            border: 0 !important; box-sizing: border-box !important;
            box-shadow: none !important; outline: none !important;
            appearance: none !important; -webkit-appearance: none !important;
            margin: 0 !important; overflow: hidden !important;
            vertical-align: bottom !important; text-align: left !important;
          }
          .annotationLayer .textWidgetAnnotation input:not([type="checkbox"]):not([type="radio"]),
          .annotationLayer .choiceWidgetAnnotation select {
            position: absolute !important; inset: auto 0 -1px 0 !important;
            width: 100% !important; min-height: 0 !important;
          }
          .annotationLayer section,
          .annotationLayer .textWidgetAnnotation,
          .annotationLayer .choiceWidgetAnnotation,
          .annotationLayer .buttonWidgetAnnotation {
            background: transparent !important; border: 0 !important;
            box-shadow: none !important; outline: none !important;
          }
          .annotationLayer .textWidgetAnnotation input,
          .annotationLayer .textWidgetAnnotation textarea,
          .annotationLayer .choiceWidgetAnnotation select,
          .annotationLayer > input[type="text"], .annotationLayer > textarea {
            background-color: rgba(59,130,246,0.12) !important;
            border-radius: 2px !important; cursor: text;
          }
          .annotationLayer .textWidgetAnnotation input:hover,
          .annotationLayer .textWidgetAnnotation textarea:hover,
          .annotationLayer .choiceWidgetAnnotation select:hover {
            background-color: rgba(59,130,246,0.2) !important;
          }
          .annotationLayer .textWidgetAnnotation input:focus,
          .annotationLayer .textWidgetAnnotation textarea:focus,
          .annotationLayer .choiceWidgetAnnotation select:focus {
            background-color: rgba(59,130,246,0.08) !important;
            outline: 1.5px solid rgba(59,130,246,0.7) !important;
          }
          .annotationLayer .buttonWidgetAnnotation.checkBox input,
          .annotationLayer .buttonWidgetAnnotation.radioButton input {
            display: grid !important; place-content: center !important;
            border: 1.25px solid #374151 !important;
            background-color: rgba(59,130,246,0.12) !important;
            cursor: pointer !important; padding: 0 !important;
          }
          .annotationLayer .buttonWidgetAnnotation.radioButton input { border-radius: 50% !important; }
          .annotationLayer .buttonWidgetAnnotation.checkBox input:checked {
            background-color: #ffffff !important;
          }
          .annotationLayer .buttonWidgetAnnotation.checkBox input:checked::after {
            content: "✓"; color: #111827; font-family: Arial, Helvetica, sans-serif;
            font-size: 12px; font-weight: 700; line-height: 1;
          }
          .annotationLayer .buttonWidgetAnnotation.radioButton input:checked::after {
            content: ""; width: 7px; height: 7px; border-radius: 50%; background: #111827;
          }
          .annotationLayer input:disabled, .annotationLayer textarea:disabled,
          .annotationLayer select:disabled {
            background-color: transparent !important; outline: none !important;
            color: #000000 !important; opacity: 1 !important;
          }
          .annotationLayer .buttonWidgetAnnotation.checkBox input:disabled,
          .annotationLayer .buttonWidgetAnnotation.radioButton input:disabled {
            border-color: transparent !important;
          }
          .annotationLayer input[data-admin-checkbox="true"] {
            appearance: none !important; -webkit-appearance: none !important;
            display: grid !important; place-content: center !important;
            border: 1.25px solid #111827 !important; background: #ffffff !important;
            cursor: pointer !important; padding: 0 !important;
          }
          .annotationLayer input[data-admin-checkbox="true"]:checked::after {
            content: "✓"; color: #111827; font-family: Arial, Helvetica, sans-serif;
            font-size: 11px; font-weight: 700; line-height: 10px;
          }
        `}</style>

        <header className="mb-4 border-b border-black pb-3">
          <h1 className="text-center font-serif text-[20px] font-bold">
            Employee Onboarding Document
          </h1>
          <p className="mt-1 text-center text-[12px] text-gray-700">
            Please review every page, complete your portion, and sign below.
          </p>
        </header>

        <section aria-label="Onboarding document pages" className="mb-6">
          <p className="mb-2 text-center text-[11px] text-gray-600">
            Fill in the form fields directly in the document below, then sign in the signature
            block at the bottom of the page.
          </p>
          <div className="overflow-hidden rounded border border-border bg-white p-2">
            {error ? (
              <p className="p-4 text-center text-[12px] text-red-600">
                The document could not be loaded: {error}
              </p>
            ) : !ready ? (
              <p className="p-4 text-center text-[12px] text-gray-500">Loading document…</p>
            ) : null}
            <div ref={viewerRef} />
          </div>
        </section>

        <section
          data-pdf-section="signatures"
          className="break-before-page border-t-2 border-black pt-4"
        >
          <h2 className="mb-3 text-center font-serif text-[16px] font-bold">
            Acknowledgement &amp; Signatures
          </h2>

          <p className="mb-4">
            I acknowledge that I have received, read, and understood the contents of this Employee
            Onboarding Document. By signing below, I certify the information I have provided is
            true and accurate to the best of my knowledge.
          </p>

          <p className="mt-4 mb-1 font-bold">Employee Portion</p>

          <div className="my-2 flex items-end gap-2">
            <span className="whitespace-nowrap font-semibold">Employee Name:</span>
            <span className="relative flex-1 border-b border-black">
              {editable ? (
                <input
                  value={value.employeeName}
                  onChange={(e) => set("employeeName", e.target.value)}
                  className="w-full bg-transparent px-1 pb-0.5 outline-none"
                />
              ) : (
                <span className="block px-1 pb-0.5">{value.employeeName || " "}</span>
              )}
            </span>
          </div>

          <div className="my-3 flex items-end gap-2">
            <span className="whitespace-nowrap font-semibold">Employee Signature:</span>
            <span className="relative h-7 flex-1 border-b border-black">
              {employeeSignature ? (
                <img
                  src={employeeSignature}
                  alt="Employee signature"
                  className="absolute bottom-0 left-1 h-6 max-w-[80%] w-auto object-contain"
                />
              ) : (
                <span className="block px-1 pb-0.5">&nbsp;</span>
              )}
            </span>
          </div>

          <div className="max-w-xs">
            <div className="my-2 flex items-end gap-2">
              <span className="whitespace-nowrap font-semibold">Date:</span>
              <span className="relative flex-1 border-b border-black">
                {editable ? (
                  <input
                    type="date"
                    value={value.employeeSignDate}
                    onChange={(e) => set("employeeSignDate", e.target.value)}
                    className="w-full bg-transparent px-1 pb-0.5 outline-none"
                  />
                ) : (
                  <span className="block px-1 pb-0.5">
                    {fmt(value.employeeSignDate) || " "}
                  </span>
                )}
              </span>
            </div>
          </div>

          {role === "admin" && (
            <>
              <p className="mt-6 mb-1 font-bold">
                Employer Portion{" "}
                <span className="font-normal italic">
                  (to be completed by the employer upon return)
                </span>
              </p>

              <div className="my-2 flex items-end gap-2">
                <span className="whitespace-nowrap font-semibold">Employer Representative Name:</span>
                <span className="relative flex-1 border-b border-black">
                  {editable ? (
                    <input
                      value={value.employerName}
                      onChange={(e) => set("employerName", e.target.value)}
                      className="w-full bg-transparent px-1 pb-0.5 outline-none"
                    />
                  ) : (
                    <span className="block px-1 pb-0.5">{value.employerName || " "}</span>
                  )}
                </span>
              </div>

              <div className="my-2 flex items-end gap-2">
                <span className="whitespace-nowrap font-semibold">Title:</span>
                <span className="relative flex-1 border-b border-black">
                  {editable ? (
                    <input
                      value={value.employerTitle}
                      onChange={(e) => set("employerTitle", e.target.value)}
                      className="w-full bg-transparent px-1 pb-0.5 outline-none"
                    />
                  ) : (
                    <span className="block px-1 pb-0.5">{value.employerTitle || " "}</span>
                  )}
                </span>
              </div>

              <div className="my-3 flex items-end gap-2">
                <span className="whitespace-nowrap font-semibold">Employer Signature:</span>
                <span className="relative h-7 flex-1 border-b border-black">
                  {evaluatorSignature ? (
                    <img
                      src={evaluatorSignature}
                      alt="Employer signature"
                      className="absolute bottom-0 left-1 h-6 max-w-[80%] w-auto object-contain"
                    />
                  ) : (
                    <span className="block px-1 pb-0.5">&nbsp;</span>
                  )}
                </span>
              </div>

              <div className="max-w-xs">
                <div className="my-2 flex items-end gap-2">
                  <span className="whitespace-nowrap font-semibold">Date:</span>
                  <span className="relative flex-1 border-b border-black">
                    {editable ? (
                      <input
                        type="date"
                        value={value.evaluatorSignDate}
                        onChange={(e) => set("evaluatorSignDate", e.target.value)}
                        className="w-full bg-transparent px-1 pb-0.5 outline-none"
                      />
                    ) : (
                      <span className="block px-1 pb-0.5">
                        {fmt(value.evaluatorSignDate) || " "}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      </article>
    );
  },
);
