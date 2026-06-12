'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Eraser, CheckCircle2, Printer, Save, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  EmployeeOnboardingDocument,
  DEFAULT_EMPLOYEE_ONBOARDING_DATA,
  type EmployeeOnboardingData,
} from "./EmployeeOnboardingDocument";
import { createLetterPdfBlob } from "@/lib/pdf-export";

export type AssessmentRow = {
  id: string;
  employee_id: string;
  assessment_type: string;
  status: string;
  data: unknown;
  employee_signature: string | null;
  employee_sign_date: string | null;
  evaluator_signature: string | null;
  evaluator_sign_date: string | null;
  file_path: string | null;
};

type Role = "admin" | "employee";

export function OnboardingModal({
  row,
  role,
  onClose,
  onSaved,
}: {
  row: AssessmentRow;
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<EmployeeOnboardingData>(() => ({
    ...DEFAULT_EMPLOYEE_ONBOARDING_DATA,
    ...((row.data as Partial<EmployeeOnboardingData>) ?? {}),
  }));

  const [empSig, setEmpSig] = useState<string>(row.employee_signature ?? "");
  const [evalSig, setEvalSig] = useState<string>(row.evaluator_signature ?? "");
  const empSigRef = useRef<SignatureCanvas | null>(null);
  const evalSigRef = useRef<SignatureCanvas | null>(null);
  const docRef = useRef<HTMLElement | null>(null);
  const pdfRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState<"save" | "complete" | "print" | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const completed = row.status === "completed";
  const adminOverride = completed && role === "admin";
  const editable = !completed || adminOverride;
  const employeeHasSigned = !!row.employee_signature;

  // Auto-populate employee name from users table
  useEffect(() => {
    if (completed) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", row.employee_id)
        .maybeSingle();
      const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
      if (!name || cancelled) return;
      setForm((prev) => (prev.employeeName ? prev : { ...prev, employeeName: name }));
    })();
    return () => { cancelled = true; };
  }, [row.employee_id, completed]);

  const captureEmp = () => {
    if (empSigRef.current && !empSigRef.current.isEmpty())
      setEmpSig(empSigRef.current.toDataURL("image/png"));
  };
  const captureEval = () => {
    if (evalSigRef.current && !evalSigRef.current.isEmpty())
      setEvalSig(evalSigRef.current.toDataURL("image/png"));
  };

  const todaySig = (existing: string | null | undefined) =>
    existing || new Date().toISOString().slice(0, 10);

  const saveDraft = async () => {
    setBusy("save");
    try {
      const update: Record<string, unknown> = { data: form };

      if (role === "employee") {
        if (empSig) {
          update.employee_signature = empSig;
          update.employee_sign_date = todaySig(form.employeeSignDate);
        }
      } else {
        if (evalSig) {
          update.evaluator_signature = evalSig;
          update.evaluator_sign_date = todaySig(form.evaluatorSignDate);
        }
        if (empSig && !row.employee_signature) {
          update.employee_signature = empSig;
          update.employee_sign_date = todaySig(form.employeeSignDate);
        }
      }
      const { error } = await supabase
        .from("assessments")
        .update(update as never)
        .eq("id", row.id);
      if (error) throw error;

      // Mark onboarding forms signed in billing_staff_data when employee signs
      if (role === "employee" && empSig) {
        const { data: existing } = await supabase
          .from("billing_staff_data")
          .select("data")
          .eq("staff_id", row.employee_id)
          .maybeSingle();
        const merged = {
          ...((existing?.data as Record<string, string>) ?? {}),
          onboarding_forms_signed: "true",
          onboarding_forms_signed_at: new Date().toISOString(),
          onboarding_forms_revoked: "false",
        };
        await supabase
          .from("billing_staff_data")
          .upsert({ staff_id: row.employee_id, data: merged });
      }

      if (adminOverride && pdfRef.current) {
        try {
          await new Promise((r) => setTimeout(r, 50));
          const blob = await createLetterPdfBlob(pdfRef.current, { onboarding: true });
          const filename = `${row.employee_id}/${Date.now()}-employee-onboarding.pdf`;
          const { error: upErr } = await supabase.storage
            .from("assessments")
            .upload(filename, blob, { contentType: "application/pdf", upsert: false });
          if (!upErr) {
            await supabase
              .from("assessments")
              .update({ file_path: filename } as never)
              .eq("id", row.id);
          }
        } catch {
          /* best-effort */
        }
      }

      toast.success(adminOverride ? "Changes saved (admin override)" : "Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    if (role !== "admin") return;
    if (!row.employee_signature && !empSig) return toast.error("Employee must sign first.");
    if (!evalSig) return toast.error("Employer signature required.");
    if (!pdfRef.current) return;
    setBusy("complete");
    try {
      await new Promise((r) => setTimeout(r, 50));
      const blob = await createLetterPdfBlob(pdfRef.current, { onboarding: true });
      const filename = `${row.employee_id}/${Date.now()}-employee-onboarding.pdf`;
      const { error: upErr } = await supabase.storage
        .from("assessments")
        .upload(filename, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("assessments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          data: form as never,
          employee_signature: empSig || row.employee_signature,
          employee_sign_date: todaySig(form.employeeSignDate),
          evaluator_signature: evalSig,
          evaluator_sign_date: todaySig(form.evaluatorSignDate),
          file_path: filename,
        } as never)
        .eq("id", row.id);
      if (updErr) throw updErr;
      toast.success("Onboarding completed.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete.");
    } finally {
      setBusy(null);
    }
  };

  const print = useCallback(async () => {
    setBusy("print");
    try {
      if (!pdfRef.current) return;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const blob = await createLetterPdfBlob(pdfRef.current, { onboarding: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employee-onboarding.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("PDF downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to prepare PDF");
    } finally {
      setBusy(null);
    }
  }, []);

  const showEmpPad = editable && !row.employee_signature;
  const showEvalPad = editable && role === "admin" && !row.evaluator_signature;
  const canComplete = role === "admin" && (employeeHasSigned || !!empSig) && !!evalSig;

  const renderDoc = (refTarget: React.MutableRefObject<HTMLElement | null>, isEditable: boolean) => (
    <EmployeeOnboardingDocument
      ref={refTarget}
      value={form}
      editable={isEditable}
      role={role}
      onChange={isEditable ? setForm : undefined}
      employeeSignature={empSig || undefined}
      evaluatorSignature={evalSig || undefined}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-[10in] rounded-lg bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-lg border-b border-border bg-card px-4 py-3">
          <h4 className="font-serif text-base font-bold">
            Employee Onboarding Document{" "}
            {completed
              ? adminOverride
                ? "(Completed — Admin Override)"
                : "(Completed)"
              : role === "admin"
                ? "— Employer"
                : "— Employee"}
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1 py-1">
              <button onClick={zoomOut} title="Zoom out" className="rounded p-1 hover:bg-secondary">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={zoomReset}
                title="Reset zoom"
                className="min-w-[3rem] rounded px-1 text-xs font-medium hover:bg-secondary"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={zoomIn} title="Zoom in" className="rounded p-1 hover:bg-secondary">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button onClick={zoomReset} title="Reset" className="rounded p-1 hover:bg-secondary">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            {completed && (
              <button
                onClick={print}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                {busy === "print" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                {busy === "print" ? "Preparing…" : "Print"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: `${100 / zoom}%` }}>
            {renderDoc(docRef, editable)}
          </div>

          <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 w-[8.5in] bg-white">
            {renderDoc(pdfRef, false)}
          </div>

          {role === "admin" && !employeeHasSigned && (
            <p className="mx-auto mt-4 max-w-[8.5in] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Waiting on the employee to sign before this onboarding can be completed.
            </p>
          )}

          {editable && (
            <div className="mx-auto mt-6 max-w-[8.5in] space-y-4 rounded-md border border-border bg-card p-4">
              {showEmpPad && (
                <SignaturePad
                  label="Employee Signature"
                  sigRef={empSigRef}
                  onCapture={captureEmp}
                  onClear={() => { empSigRef.current?.clear(); setEmpSig(""); }}
                />
              )}
              {!showEmpPad && row.employee_signature && (
                <p className="text-xs text-muted-foreground">✓ Employee signature on file.</p>
              )}

              {showEvalPad && (
                <SignaturePad
                  label="Employer Signature"
                  sigRef={evalSigRef}
                  onCapture={captureEval}
                  onClear={() => { evalSigRef.current?.clear(); setEvalSig(""); }}
                />
              )}
              {!showEvalPad && row.evaluator_signature && (
                <p className="text-xs text-muted-foreground">✓ Employer signature on file.</p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={saveDraft}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                {role === "admin" && !completed && (
                  <button
                    onClick={complete}
                    disabled={busy !== null || !canComplete}
                    title={!employeeHasSigned && !empSig ? "Employee must sign first" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Complete &amp; Generate PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignaturePad({
  label,
  sigRef,
  onCapture,
  onClear,
}: {
  label: string;
  sigRef: React.MutableRefObject<SignatureCanvas | null>;
  onCapture: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-secondary"
        >
          <Eraser className="h-3 w-3" /> Clear
        </button>
      </div>
      <div className="rounded border border-input bg-white">
        <SignatureCanvas
          ref={(r) => { sigRef.current = r; }}
          penColor="#0a2540"
          onEnd={onCapture}
          canvasProps={{ className: "w-full h-20 sm:h-24" }}
        />
      </div>
    </div>
  );
}
