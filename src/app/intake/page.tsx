"use client";

/**
 * RCS Client Intake Form — Next.js App Router page
 *
 * Drop this file into a Next.js 13+ project at: app/intake/page.tsx
 * Requirements: Tailwind CSS (default install). No other deps.
 *
 * Visit /intake to use it.
 */

import {
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createClient } from "@/lib/supabase/client";

type FormData = Record<string, any>;

const STEPS = [
  { id: "client", title: "Client Information", hint: "Tell us who you are" },
  { id: "preferences", title: "About You", hint: "Your ideal day & DSP" },
  { id: "schedule", title: "Schedule", hint: "When services work for you" },
  { id: "risk", title: "Risk Assessment", hint: "Optional — if applicable" },
  { id: "service", title: "Service Type & Team", hint: "Who supports you" },
  { id: "agreement", title: "Service Agreement", hint: "Authorize services" },
  { id: "emergency", title: "Emergency Preparedness", hint: "DDD acuity level" },
];

const RISK_QUESTIONS = [
  ["aggression", "Have you ever displayed aggressive behavior?"],
  ["depression", "Do you ever get depressed or withdrawn?"],
  ["paranoia", "Have you ever suffered from paranoia or delusions?"],
  ["anxiety", "Do you ever become anxious or fearful?"],
  ["voices", "Do you ever hear voices or become disoriented?"],
  ["changes", "Have there been any recent significant changes in your behavior?"],
  ["meds", "Are you currently taking prescription medications?"],
] as const;

const STORAGE_KEY = "rcs_intake_draft_v1";

export default function IntakePage() {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [data, setData] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { date: new Date().toISOString().slice(0, 10) };
  });

  const set = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const flash = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      flash("success", "Draft saved in this browser.");
    } catch {
      flash("error", "Could not save draft.");
    }
  };

  const printForm = () => window.print();

  const submit = async () => {
    if (!data.signature || !data.signatureDate) {
      flash("error", "Please sign and date the agreement.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("client_intakes").insert({
      form_data: data,
      client_name: [data.name].filter(Boolean).join(" ") || null,
      client_email: data.email || null,
      submitted_at: new Date().toISOString(),
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      flash("error", "Could not save your submission. Please try again.");
      return;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-10 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">Intake Submitted!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Thank you, <strong>{data.name || "valued client"}</strong>. Your intake form has been received by Reliance Care Services.
            A care coordinator will be in touch shortly.
          </p>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm hover:bg-slate-50 mr-2"
          >
            Print / Save PDF
          </button>
          <a
            href="/login"
            className="inline-block rounded-lg bg-[#008080] px-5 py-2 text-sm font-medium text-white hover:bg-[#006666]"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg print:hidden ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-700/80">RCS · Client Intake</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Let&apos;s get you set up for care.</h1>
          <p className="mt-3 max-w-xl text-sm text-slate-600">
            A short, guided form covering your goals, schedule, risk assessment, service agreement, and emergency plan.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-medium">{STEPS[step].title}</p>
            <p className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{STEPS[step].hint}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <Section title="Client Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Today's Date"><Input type="date" value={data.date || ""} onChange={(e) => set("date", e.target.value)} /></Field>
                <Field label="Full Name"><Input value={data.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" /></Field>
                <Field label="Date of Birth"><Input type="date" value={data.dob || ""} onChange={(e) => set("dob", e.target.value)} /></Field>
                <Field label="Phone Number"><Input type="tel" value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" /></Field>
                <Field label="Email"><Input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
                <Field label="Home Phone Number"><Input type="tel" value={data.homePhone || ""} onChange={(e) => set("homePhone", e.target.value)} /></Field>
                <Field label="Home Address" className="sm:col-span-2"><Input value={data.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Street, City, State, ZIP" /></Field>
                <Field label="Guardian (if applicable)" className="sm:col-span-2"><Input value={data.guardian || ""} onChange={(e) => set("guardian", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section title="About You">
              <Field label="Please describe your ideal day" hint="What types of activities would you like to do with your DSP?">
                <Textarea rows={4} value={data.idealDay || ""} onChange={(e) => set("idealDay", e.target.value)} />
              </Field>
              <Field label="Traits I want my DSP to have" hint="To better understand me, my DSP should have these qualities">
                <Textarea rows={4} value={data.dspTraits || ""} onChange={(e) => set("dspTraits", e.target.value)} />
              </Field>
              <Field label="Things I would like to learn">
                <Textarea rows={4} value={data.learn || ""} onChange={(e) => set("learn", e.target.value)} />
              </Field>
            </Section>
          )}

          {step === 2 && (
            <Section title="Schedule">
              <Field label="Preferred days & times for services">
                <Textarea rows={3} value={data.schedule || ""} onChange={(e) => set("schedule", e.target.value)} placeholder="e.g. Mon–Fri, 9am–1pm" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Anticipated weekly hours"><Input type="number" min={0} value={data.weeklyHours || ""} onChange={(e) => set("weeklyHours", e.target.value)} /></Field>
                <Field label="Anticipated start date"><Input type="date" value={data.startDate || ""} onChange={(e) => set("startDate", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="Risk Assessment" subtitle="If applicable. Answer yes or no and add comments where helpful.">
              <div className="space-y-4">
                {RISK_QUESTIONS.map(([key, q]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <YesNo label={q} value={data[`risk_${key}`]} onChange={(v) => set(`risk_${key}`, v)} />
                    <div className="mt-3">
                      <Textarea
                        rows={2}
                        placeholder="Comments (optional)"
                        value={data[`risk_${key}_c`] || ""}
                        onChange={(e) => set(`risk_${key}_c`, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Service Type & Team">
              <Field label="Type of service best suited">
                <div className="flex flex-wrap gap-3">
                  <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${data.serviceType === "DSP" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}>
                    <input type="radio" name="serviceType" className="accent-indigo-600" checked={data.serviceType === "DSP"} onChange={() => set("serviceType", "DSP")} />
                    DSP
                  </label>
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Support Coordinator"><Input value={data.supportCoord || ""} onChange={(e) => set("supportCoord", e.target.value)} /></Field>
                <Field label="Agency"><Input value={data.agency || ""} onChange={(e) => set("agency", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {step === 5 && (
            <Section title="Service Agreement" subtitle="Please review and authorize the terms below.">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
                <Clause n={1} title="Services Authorization">
                  I consent to all services authorized by the Support Coordinator and rendered by authorized RCS personnel. Consent is voluntary and services may be stopped at any time.
                </Clause>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Hours of service per week"><Input type="number" value={data.agreementHours || ""} onChange={(e) => set("agreementHours", e.target.value)} /></Field>
                <Field label="Days per week"><Input type="number" min={1} max={7} value={data.agreementDays || ""} onChange={(e) => set("agreementDays", e.target.value)} /></Field>
              </div>

              <Checkbox
                checked={!!data.billOfRights}
                onChange={(v) => set("billOfRights", v)}
                label="I acknowledge receipt of the Participant's Bill of Rights and the contents have been explained to me."
              />

              <div className="grid gap-5 pt-2 sm:grid-cols-2">
                <Field label="Signature (type full name)"><Input value={data.signature || ""} onChange={(e) => set("signature", e.target.value)} placeholder="Full legal name" /></Field>
                <Field label="Date"><Input type="date" value={data.signatureDate || ""} onChange={(e) => set("signatureDate", e.target.value)} /></Field>
                <Field label="Authorized Representative (if applicable)"><Input value={data.repName || ""} onChange={(e) => set("repName", e.target.value)} /></Field>
                <Field label="Relationship"><Input value={data.repRelation || ""} onChange={(e) => set("repRelation", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {step === 6 && (
            <Section title="Emergency Preparedness Plan" subtitle="DDD — Select the participant's acuity level.">
              <div className="grid gap-3">
                {[
                  { id: "I", title: "Level I", desc: "High functioning, recognizes emergencies, can self-evacuate, or lives with 24/7 supervision / in a licensed setting." },
                  { id: "II", title: "Level II", desc: "High-to-moderate functioning; needs assistance with feeding, transfer/ambulation, or communication during emergencies." },
                  { id: "III", title: "Level III", desc: "Relies on others for decisions and/or requires skilled intervention (ventilator, oxygen, IV, trach, insulin dependent)." },
                ].map((lv) => (
                  <label key={lv.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${data.acuity === lv.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                    <input type="radio" name="acuity" className="mt-1 accent-indigo-600" checked={data.acuity === lv.id} onChange={() => set("acuity", lv.id)} />
                    <div>
                      <p className="font-medium">{lv.title}</p>
                      <p className="text-sm text-slate-600">{lv.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <Field label="Authorize release of name, address, phone, and medical needs to county OEM?">
                <div className="flex gap-3">
                  {["Yes", "No"].map((o) => (
                    <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${data.oem === o ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                      <input type="radio" name="oem" className="accent-indigo-600" checked={data.oem === o} onChange={() => set("oem", o)} />
                      {o}
                    </label>
                  ))}
                </div>
              </Field>

              <Checkbox
                checked={!!data.epAck}
                onChange={(v) => set("epAck", v)}
                label="I have read and understand the Emergency Preparedness Plan."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Caregiver print name"><Input value={data.caregiverName || ""} onChange={(e) => set("caregiverName", e.target.value)} /></Field>
                <Field label="Relationship to participant"><Input value={data.caregiverRel || ""} onChange={(e) => set("caregiverRel", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {/* Nav */}
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 print:hidden sm:flex-row sm:items-center sm:justify-between">
            <button onClick={prev} disabled={step === 0} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40">← Back</button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={saveDraft} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">Save draft</button>
              <button onClick={printForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">Print / Save PDF</button>
              {step < STEPS.length - 1 ? (
                <button onClick={next} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Continue →</button>
              ) : (
                <button onClick={submit} disabled={submitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? "Submitting…" : "Submit Intake"}
                </button>
              )}
            </div>
          </div>
        </div>

        <PrintSummary data={data} />

        <p className="mt-6 text-center text-xs text-slate-500 print:hidden">
          Your information is kept confidential and used only to coordinate your care.
        </p>
      </div>
    </div>
  );
}

/* ---------- Inline UI primitives ---------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className || ""}`} />;
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none ${props.className || ""}`} />;
}

function YesNo({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p className="text-sm">{label}</p>
      <div className="flex gap-2">
        {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((o) => (
          <button
            type="button"
            key={o.l}
            onClick={() => onChange(o.v)}
            className={`min-w-[64px] rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              value === o.v ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
      <span>{label}</span>
    </label>
  );
}

function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <p>
      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{n}</span>
      <span className="font-medium text-slate-900">{title}.</span> {children}
    </p>
  );
}

/* ---------- Print summary ---------- */

function PrintSummary({ data }: { data: FormData }) {
  const rows: [string, any][] = [
    ["Date", data.date], ["Full Name", data.name], ["Date of Birth", data.dob],
    ["Phone", data.phone], ["Email", data.email], ["Home Phone", data.homePhone],
    ["Address", data.address], ["Guardian", data.guardian],
    ["Ideal Day", data.idealDay], ["DSP Traits", data.dspTraits], ["Things to Learn", data.learn],
    ["Schedule", data.schedule],
    ["Weekly Hours", data.weeklyHours], ["Start Date", data.startDate],
    ["Service Type", data.serviceType], ["Support Coordinator", data.supportCoord],
    ["Agency", data.agency],
    ["Agreement Hours/Week", data.agreementHours], ["Agreement Days/Week", data.agreementDays],
    ["Bill of Rights Acknowledged", data.billOfRights ? "Yes" : "No"],
    ["Signature", data.signature], ["Signature Date", data.signatureDate],
    ["Authorized Representative", data.repName], ["Relationship", data.repRelation],
    ["Acuity Level", data.acuity], ["OEM Release Authorization", data.oem],
    ["Emergency Plan Acknowledged", data.epAck ? "Yes" : "No"],
    ["Caregiver Name", data.caregiverName], ["Caregiver Relationship", data.caregiverRel],
  ];
  const risk: [string, string][] = [
    ["Aggression", "aggression"], ["Depression", "depression"], ["Paranoia", "paranoia"],
    ["Anxiety", "anxiety"], ["Voices/Disorientation", "voices"], ["Recent Changes", "changes"],
    ["Prescription Medications", "meds"],
  ];
  return (
    <div className="hidden print:block">
      <h2 className="mb-2 text-xl font-semibold">RCS Client Intake — Summary</h2>
      <p className="mb-4 text-sm">Reliance Care Services · Generated {new Date().toLocaleString()}</p>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.filter(([, v]) => v !== undefined && v !== "" && v !== null).map(([k, v]) => (
            <tr key={k} className="border-b border-gray-300">
              <td className="w-1/3 py-1 pr-3 align-top font-medium">{k}</td>
              <td className="py-1">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mb-2 mt-6 text-base font-semibold">Risk Assessment</h3>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {risk.map(([label, key]) => {
            const answer = data[`risk_${key}`];
            const comment = data[`risk_${key}_c`];
            if (answer === undefined && !comment) return null;
            return (
              <tr key={key} className="border-b border-gray-300">
                <td className="w-1/3 py-1 pr-3 align-top font-medium">{label}</td>
                <td className="py-1">{answer === true ? "Yes" : answer === false ? "No" : "—"}{comment ? ` · ${comment}` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
