'use client'

import { useEffect, useRef, useState } from "react";
import { FileSignature, Plus, Eye, Download, Loader2, CheckCircle2, Clock, Trash2, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { OnboardingModal, type AssessmentRow } from "./OnboardingModal";
import {
  DEFAULT_EMPLOYEE_ONBOARDING_DATA,
  EmployeeOnboardingDocument,
  type EmployeeOnboardingData,
} from "./EmployeeOnboardingDocument";
import { createLetterPdfBlob } from "@/lib/pdf-export";

type Mode = "admin" | "employee";

const COLS =
  "id, employee_id, assessment_type, status, data, employee_signature, employee_sign_date, evaluator_signature, evaluator_sign_date, file_path";

export function EmployeeOnboardingSection({
  employeeId,
  mode,
  onSigned,
}: {
  employeeId: string;
  mode: Mode;
  onSigned?: () => void;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AssessmentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [exportRow, setExportRow] = useState<AssessmentRow | null>(null);
  const exportRef = useRef<HTMLElement | null>(null);
  const autoCreateRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessments")
      .select(COLS)
      .eq("employee_id", employeeId)
      .eq("assessment_type", "employee_onboarding")
      .order("created_at", { ascending: false });
    let list = (data as AssessmentRow[]) ?? [];
    if (mode === "employee" && list.length === 0 && !autoCreateRef.current) {
      autoCreateRef.current = true;
      const { data: created } = await supabase
        .from("assessments")
        .insert({ employee_id: employeeId, assessment_type: "employee_onboarding" } as never)
        .select(COLS)
        .single();
      if (created) list = [created as AssessmentRow];
    }
    if (mode === "employee") list = list.filter((r) => r.status !== "completed");
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const assign = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({ employee_id: employeeId, assessment_type: "employee_onboarding" } as never)
        .select(COLS)
        .single();
      if (error) throw error;
      toast.success("Onboarding document assigned");
      await load();
      setActive(data as AssessmentRow);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (row: AssessmentRow) => {
    const ok = window.confirm(
      "This will permanently delete the Employee Onboarding Document, including any saved signatures. Continue?",
    );
    if (!ok) return;
    if (row.file_path) await supabase.storage.from("assessments").remove([row.file_path]);
    const { error } = await supabase.from("assessments").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    await load();
  };

  useEffect(() => {
    if (!exportRow) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!exportRef.current) throw new Error("Document is not ready");
        const blob = await createLetterPdfBlob(exportRef.current, { onboarding: true });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-onboarding-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
      } finally {
        if (!cancelled) setExportRow(null);
      }
    })();
    return () => { cancelled = true; };
  }, [exportRow]);

  if (mode === "employee" && !loading && rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold">
          <FileSignature className="h-4 w-4 text-primary" /> Employee Onboarding Document
        </h3>
        {mode === "admin" && (
          <button
            onClick={assign}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Assign
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {mode === "admin" ? "No onboarding document assigned yet." : "No onboarding document assigned."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const done = r.status === "completed";
            const needsEmployeeSig = !done && !r.employee_signature;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Employee Onboarding Document</p>
                  <p className="text-xs text-muted-foreground">
                    {r.employee_signature ? "Employee signed" : "Awaiting employee"} ·{" "}
                    {r.evaluator_signature ? "Employer signed" : "Awaiting employer"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {done ? "Completed" : mode === "employee" && needsEmployeeSig ? "Action required" : "Pending"}
                  </span>
                  {(mode === "admin" || !done) && (
                    <button
                      onClick={() => setActive(r)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {mode === "employee" && needsEmployeeSig ? (
                        <><PenLine className="h-3.5 w-3.5" /> Fill &amp; Sign</>
                      ) : (
                        <><Eye className="h-3.5 w-3.5" /> {done ? "View" : "Open"}</>
                      )}
                    </button>
                  )}
                  {done && r.file_path && (
                    <button
                      onClick={() => setExportRow(r)}
                      disabled={exportRow?.id === r.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {exportRow?.id === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}{" "}
                      PDF
                    </button>
                  )}
                  {mode === "admin" && (
                    <button
                      onClick={() => remove(r)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <OnboardingModal
          row={active}
          role={mode}
          onClose={() => setActive(null)}
          onSaved={async () => {
            setActive(null);
            await load();
            onSigned?.();
          }}
        />
      )}
      {exportRow && (
        <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 w-[8.5in] bg-white">
          <EmployeeOnboardingDocument
            key={exportRow.id}
            ref={exportRef}
            value={{
              ...DEFAULT_EMPLOYEE_ONBOARDING_DATA,
              ...((exportRow.data as Partial<EmployeeOnboardingData>) ?? {}),
            }}
            editable={false}
            role="admin"
            employeeSignature={exportRow.employee_signature ?? undefined}
            evaluatorSignature={exportRow.evaluator_signature ?? undefined}
          />
        </div>
      )}
    </section>
  );
}
