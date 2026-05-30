// @ts-nocheck
'use client'

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { dspSupabase as supabase } from '@/lib/dsp-supabase'
import { useProgress, markComplete } from '@/lib/dsp-progress'
import {
  PlayCircle, Award, ClipboardCheck, ArrowRight, Lock, CheckCircle2,
  FileText, VideoOff, BookOpen, Download, ArrowLeft, RotateCcw,
  Printer, ChevronRight,
} from 'lucide-react'

// ─── colour tokens (matching yayracare brand) ───────────────────────────────
const C = {
  primary:   '#004050',
  accent:    '#008080',
  success:   '#30B060',
  gold:      '#c9a227',
  gold2:     '#e8c84a',
  bg:        '#f4f5f7',
  card:      '#ffffff',
  border:    '#e5e7eb',
  text:      '#111827',
  muted:     '#6b7280',
  danger:    '#ef4444',
  warn:      '#BA7517',
  secondary: '#f3f4f6',
}

// ─── types ───────────────────────────────────────────────────────────────────
type Module = {
  id: string; title: string; description: string | null; cover_emoji: string | null
  sort_order: number; category: string | null; duration_seconds: number | null
  video_url: string | null; document_url: string | null; handout_md: string | null
}

type Question = { id: string; question: string; options: string[]; correct_index: number; explanation: string | null }

type NavState =
  | { screen: 'modules' }
  | { screen: 'module-detail'; moduleId: string }
  | { screen: 'assessment' }
  | { screen: 'certificate' }

type CertStored = {
  attemptId: string; certNumber: string
  intake: { employee_name: string; employee_id: string; assessment_date: string; admin_email: string }
}

// ─── resource list ───────────────────────────────────────────────────────────
const BASE_RES = '/resources'
const RESOURCE_CATEGORIES = [
  {
    name: 'Core Training', items: [
      { title: 'Training Manual', file: 'training-manual.pdf' },
      { title: 'CPR-AED for Professional Rescuers Handbook', file: 'cpr-aed-professional-rescuers-handbook.pdf' },
      { title: 'OSHA Handbook', file: 'osha-handbook.pdf' },
      { title: 'OSHA Factsheet — Bloodborne Pathogens Standard', file: 'osha-bloodborne-pathogens-factsheet.pdf' },
      { title: 'When to Use Universal Precautions', file: 'universal-precautions.pdf' },
      { title: 'Direct Support Professionals and Identifiers', file: 'direct-support-professionals-identifiers.pdf' },
      { title: 'Direct Support Poster', file: 'direct-support-poster.pdf' },
      { title: 'Provider Orientation Manual', file: 'provider-orientation-manual.pdf' },
    ],
  },
  {
    name: "Danielle's Law", items: [
      { title: "Danielle's Law — Presentation", file: 'danielles-law-presentation.pdf' },
      { title: "Danielle's Law — FAQ", file: 'danielles-law-faq.pdf' },
      { title: "Danielle's Law — Scenarios", file: 'danielles-law-scenarios.pdf' },
      { title: "Danielle's Law — Bulletin (LTE)", file: 'danielles-law-bulletin-lte.pdf' },
      { title: "Danielle's Law — Flyer", file: 'danielles-law-flyer.pdf' },
      { title: "Danielle — Her Story", file: 'danielle-her-story.pdf' },
      { title: 'Chapter Law 191', file: 'chapter-law-191.pdf' },
    ],
  },
  {
    name: "Stephen Komninos' Law", items: [
      { title: "SKL — It's The Law", file: 'skl-its-the-law.pdf' },
      { title: 'SKL — Fact Sheet', file: 'skl-fact-sheet.pdf' },
    ],
  },
  {
    name: 'DDD Prevention Bulletins', items: [
      { title: 'Aspiration Prevention', file: 'ddd-aspiration-prevention-bulletin.pdf' },
      { title: 'Choking', file: 'ddd-choking-bulletin.pdf' },
      { title: 'Constipation', file: 'ddd-constipation-bulletin.pdf' },
      { title: 'Dehydration Prevention', file: 'ddd-dehydration-prevention-bulletin.pdf' },
      { title: 'GERD Prevention', file: 'ddd-gerd-prevention-bulletin.pdf' },
      { title: 'Infection Prevention', file: 'ddd-infection-prevention-bulletin.pdf' },
      { title: 'Pressure Ulcers Prevention', file: 'ddd-pressure-ulcers-prevention-bulletin.pdf' },
      { title: 'Seizure Prevention', file: 'ddd-seizure-prevention-bulletin.pdf' },
      { title: 'Pica Bulletin', file: 'ddd-pica-bulletin.pdf' },
      { title: 'DDD Lesson References', file: 'ddd-lesson-references.pdf' },
      { title: 'DDD Direct Service Required', file: 'ddd-direct-service-required.xlsx' },
    ],
  },
  {
    name: 'Forms & Checklists', items: [
      { title: 'Seizure Observation Form', file: 'ddd-seizure-observation-form.pdf' },
      { title: 'Bowel Movement Chart', file: 'DDD-bowel-movement-chart.pdf' },
      { title: 'Input / Output Form', file: 'DDD-input-output-form.pdf' },
      { title: 'Initial Incident Report', file: 'initial-incident-report.docx' },
      { title: 'Walkaway Checklist', file: 'walkaway-checklist.docx' },
      { title: 'Incident Reporting Levels & Categories Grid', file: 'incident-reporting-levels-categories-grid.pdf' },
    ],
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

// ─── shared card styles ───────────────────────────────────────────────────────
const card: CSSProperties = { background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12 }
const scrollable: CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px 24px' }

// ─── root component ───────────────────────────────────────────────────────────
export default function DSPTrainingAcademy({ onBack }: { onBack: () => void }) {
  const [nav, setNav] = useState<NavState>({ screen: 'modules' })

  const go = {
    modules: () => setNav({ screen: 'modules' }),
    module: (id: string) => setNav({ screen: 'module-detail', moduleId: id }),
    assessment: () => setNav({ screen: 'assessment' }),
    certificate: () => setNav({ screen: 'certificate' }),
  }

  if (nav.screen === 'modules')
    return <ModulesScreen onBack={onBack} onModule={go.module} onAssessment={go.assessment} onCertificate={go.certificate} />
  if (nav.screen === 'module-detail')
    return <ModuleDetailScreen moduleId={nav.moduleId} onBack={go.modules} onModule={go.module} />
  if (nav.screen === 'assessment')
    return <AssessmentScreen onBack={go.modules} onCertificate={go.certificate} />
  if (nav.screen === 'certificate')
    return <CertificateScreen onBack={go.modules} />
  return null
}

// ─── ModulesScreen ────────────────────────────────────────────────────────────
function ModulesScreen({ onBack, onModule, onAssessment, onCertificate }: {
  onBack: () => void; onModule: (id: string) => void
  onAssessment: () => void; onCertificate: () => void
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const progress = useProgress()

  useEffect(() => {
    supabase.from('modules').select('id,title,description,cover_emoji,sort_order,category,duration_seconds,video_url,document_url,handout_md').order('sort_order')
      .then(({ data }) => { setModules(data ?? []); setLoading(false) })
  }, [])

  const watched = modules.filter(m => progress.has(m.id)).length
  const total   = modules.length
  const allDone = total > 0 && watched === total

  const statCards = [
    { icon: PlayCircle,    label: 'Modules completed', value: loading ? '…' : `${watched} / ${total}` },
    { icon: ClipboardCheck, label: 'Final assessment',  value: allDone ? 'Unlocked' : 'Locked' },
    { icon: Award,         label: 'Certificate',        value: allDone ? 'Available on pass' : 'Pending' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* header bar */}
      <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={backBtn}>
          <ArrowLeft size={13} /> Modules
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>DSP Training Academy</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Reliance Care Services · Required for all DSP staff</div>
        </div>
      </div>

      <div style={scrollable}>
        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                  <s.icon size={18} />
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* module grid */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>Training modules</h2>
          {loading ? (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 32 }}>Loading modules…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              {modules.map((m, idx) => {
                const done    = progress.has(m.id)
                const prevDone = idx === 0 || progress.has(modules[idx - 1]?.id)
                const locked  = !done && !prevDone
                return (
                  <ModuleCard key={m.id} index={idx + 1} module={m} done={done} locked={locked}
                    onClick={() => !locked && onModule(m.id)} />
                )
              })}
            </div>
          )}
        </div>

        {/* assessment banner */}
        <div style={{ ...card, padding: 20, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Final assessment</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              32 questions drawn from a 60-question bank · 80% to pass · Certificate on success
            </div>
          </div>
          {allDone ? (
            <button onClick={onAssessment} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardCheck size={14} /> Start assessment
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, padding: '8px 14px', borderRadius: 8, border: `0.5px solid ${C.border}`, background: C.secondary }}>
              <Lock size={13} /> Complete all {total} modules to unlock
            </div>
          )}
        </div>

        {/* additional resources */}
        <div style={{ ...card, padding: 20, marginTop: 16, borderColor: `${C.accent}30` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, flexShrink: 0 }}>
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Additional Resources</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: C.secondary, color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>Optional</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Reference materials, bulletins, forms and handbooks. Not required — use as needed.
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
            {RESOURCE_CATEGORIES.map(cat => (
              <div key={cat.name} style={{ borderRadius: 10, border: `0.5px solid ${C.border}`, background: 'rgba(255,255,255,0.6)', padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: C.accent, marginBottom: 8 }}>{cat.name}</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cat.items.map(r => (
                    <li key={r.file}>
                      <a href={`${BASE_RES}/${encodeURIComponent(r.file)}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 6px', borderRadius: 6, fontSize: 12, color: C.text, textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.secondary)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <FileText size={13} style={{ marginTop: 1, flexShrink: 0, color: C.muted }} />
                        <span style={{ lineHeight: 1.4 }}>{r.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ index, module: m, done, locked, onClick }: {
  index: number; module: Module; done: boolean; locked: boolean; onClick: () => void
}) {
  const mins = Math.max(1, Math.round((m.duration_seconds ?? 60) / 60))
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...card, padding: 16, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.55 : 1,
        border: hover && !locked ? `0.5px solid ${C.accent}` : `0.5px solid ${C.border}`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover && !locked ? '0 2px 8px rgba(0,128,128,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 30, width: 44, height: 44, borderRadius: 10, background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {m.cover_emoji ?? '📘'}
        </div>
        {done ? (
          <StatusPill color={C.success} bg={`${C.success}18`}><CheckCircle2 size={11} /> Complete</StatusPill>
        ) : locked ? (
          <StatusPill color={C.muted} bg={C.secondary}><Lock size={11} /> Locked</StatusPill>
        ) : (
          <StatusPill color={C.accent} bg={`${C.accent}18`}>Ready</StatusPill>
        )}
      </div>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        Module {index} · {m.category} · {mins} min
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.title}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {m.description}
      </div>
      {!locked && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.primary, display: 'flex', alignItems: 'center', gap: 4 }}>
            {done ? 'Review' : 'Watch now'} <ArrowRight size={13} />
          </span>
          <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> Handout
          </span>
        </div>
      )}
      {!locked && !m.video_url && (
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${C.warn}15`, color: C.warn }}>
          <VideoOff size={11} /> Video pending
        </div>
      )}
    </div>
  )
}

// ─── ModuleDetailScreen ───────────────────────────────────────────────────────
function ModuleDetailScreen({ moduleId, onBack, onModule }: {
  moduleId: string; onBack: () => void; onModule: (id: string) => void
}) {
  const [module, setModule] = useState<Module | null>(null)
  const [allModules, setAllModules] = useState<Pick<Module, 'id' | 'title' | 'sort_order'>[]>([])
  const [videoEnded, setVideoEnded] = useState(false)
  const [marked, setMarked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progress = useProgress()

  useEffect(() => {
    supabase.from('modules').select('*').eq('id', moduleId).single()
      .then(({ data }) => setModule(data))
    supabase.from('modules').select('id,title,sort_order').order('sort_order')
      .then(({ data }) => setAllModules(data ?? []))
  }, [moduleId])

  const idx = allModules.findIndex(m => m.id === moduleId)
  const prev = idx > 0 ? allModules[idx - 1] : null
  const next = idx >= 0 ? allModules[idx + 1] : null
  const isDone = progress.has(moduleId) || marked
  const prevDone = !prev || progress.has(prev.id)
  const locked = !isDone && !prevDone

  const hasVideo = Boolean(module?.video_url)
  const canMark  = videoEnded || isDone || !hasVideo

  function handleMark() {
    markComplete(moduleId)
    setMarked(true)
  }

  if (!module) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Training</button>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Loading…</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>Loading module…</div>
      </div>
    )
  }

  if (locked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Training</button>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{module.title}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32 }}>
          <Lock size={36} color={C.muted} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Module locked</div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
            Complete the previous module first: <strong>{prev?.title}</strong>
          </div>
          <button onClick={onBack} style={{ ...secondaryBtn, marginTop: 8 }}>← Back to training</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* header */}
      <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Training</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{module.title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Module {module.sort_order} · {module.category}</div>
        </div>
        {isDone && <StatusPill color={C.success} bg="rgba(48,176,96,0.2)"><CheckCircle2 size={11} /> Complete</StatusPill>}
      </div>

      <div style={scrollable}>
        {/* video section */}
        <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
          {module.video_url ? (
            <video
              ref={videoRef}
              src={module.video_url}
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onEnded={() => setVideoEnded(true)}
              style={{ width: '100%', display: 'block', background: C.primary }}
            />
          ) : (
            <div style={{ background: C.primary, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
              <VideoOff size={44} color="rgba(255,255,255,0.6)" />
              <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Training video pending</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 360 }}>
                A video has not been added for this module yet. Review the training document below.
              </div>
            </div>
          )}
        </div>

        {/* mark complete */}
        <div style={{ ...card, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {isDone ? 'Module complete' : !hasVideo ? 'Document review available' : canMark ? 'Video finished' : 'Watch the full video to continue'}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {isDone ? 'You can move to the next module.'
                : !hasVideo ? 'Review the handout, then mark complete.'
                : canMark ? 'Mark this module complete to unlock the next one.'
                : 'The next module unlocks once this video plays through.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isDone && (
              <button onClick={handleMark} disabled={!canMark} style={{ ...primaryBtn, opacity: canMark ? 1 : 0.45, cursor: canMark ? 'pointer' : 'not-allowed' }}>
                Mark complete
              </button>
            )}
            {next && isDone && (
              <button onClick={() => onModule(next.id)} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                Next module <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* document embed */}
        {module.document_url && (
          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.card, border: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                  <FileText size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Training Document</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Official handout</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={module.document_url} target="_blank" rel="noreferrer" style={secondaryBtn as CSSProperties}>
                  <FileText size={13} /> Open
                </a>
                <a href={module.document_url} download style={primaryBtn as CSSProperties}>
                  <Download size={13} /> Download
                </a>
              </div>
            </div>
            {module.document_url.toLowerCase().endsWith('.pdf') && (
              <iframe src={module.document_url} title={`${module.title} document`} style={{ width: '100%', height: '70vh', border: 'none', display: 'block', background: C.secondary }} />
            )}
          </div>
        )}

        {/* handout markdown */}
        {module.handout_md && (
          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.card, border: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                  <FileText size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Quick Reference Notes</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Printable summary</div>
                </div>
              </div>
              <button onClick={() => window.print()} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={13} /> Print / Save PDF
              </button>
            </div>
            <article style={{ padding: 20, fontSize: 13, lineHeight: 1.8, color: C.text }}>
              {renderHandout(module.handout_md)}
            </article>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AssessmentScreen ─────────────────────────────────────────────────────────
type Intake = { employee_name: string; employee_id: string; assessment_date: string; admin_email: string }
type AssessmentResult = { score: number; total: number; passed: boolean; attemptId: string; certNumber?: string; intake: Intake }

function AssessmentScreen({ onBack, onCertificate }: { onBack: () => void; onCertificate: () => void }) {
  const progress = useProgress()
  const [modCount, setModCount] = useState(12)
  const [bank, setBank] = useState<Question[]>([])

  const [intake, setIntake] = useState<Intake>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
    const parsed = saved ? JSON.parse(saved) : null
    return { employee_name: parsed?.employee_name ?? '', employee_id: parsed?.employee_id ?? '', assessment_date: todayISO(), admin_email: '' }
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Intake, string>>>({})
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('question_bank').select('id,question,options,correct_index,explanation')
      .then(({ data }) => setBank((data ?? []).map(q => ({ ...q, options: q.options as string[] }))))
    supabase.from('modules').select('id', { count: 'exact', head: true })
      .then(({ count }) => setModCount(count ?? 12))
  }, [])

  const unlocked = (progress.size ?? 0) >= modCount

  function validate(): boolean {
    const errs: Partial<Record<keyof Intake, string>> = {}
    if (!intake.employee_name.trim()) errs.employee_name = 'Full name required'
    else if (intake.employee_name.trim().length > 120) errs.employee_name = 'Too long'
    if (!intake.employee_id.trim()) errs.employee_id = 'Employee ID required'
    if (!intake.assessment_date) errs.assessment_date = 'Date required'
    if (intake.admin_email && !/^[^@]+@[^@]+\.[^@]+$/.test(intake.admin_email)) errs.admin_email = 'Invalid email'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function beginAssessment() {
    if (!validate() || !bank.length) return
    sessionStorage.setItem('rcs-dsp-employee-v1', JSON.stringify({ employee_name: intake.employee_name, employee_id: intake.employee_id }))
    const picked = shuffle(bank).slice(0, 32).map(q => {
      const indices = shuffle(q.options.map((_, i) => i))
      const newOptions = indices.map(i => q.options[i])
      const newCorrect = indices.indexOf(q.correct_index)
      return { ...q, options: newOptions, correct_index: newCorrect }
    })
    setQuestions(picked)
    setAnswers({})
    setResult(null)
    setStarted(true)
  }

  async function submitAssessment() {
    if (submitting) return
    setSubmitting(true)
    try {
      const total = questions.length
      const score = questions.reduce((s, q) => s + (answers[q.id] === q.correct_index ? 1 : 0), 0)
      const passed = score / total >= 0.8

      const { data: attempt, error: aErr } = await supabase.from('assessment_attempts').insert({
        employee_name: intake.employee_name,
        employee_id: intake.employee_id,
        assessment_date: intake.assessment_date,
        admin_email: intake.admin_email || null,
        question_ids: questions.map(q => q.id),
        answers,
        score, total, passed,
      }).select('id').single()
      if (aErr) throw aErr

      let certNumber: string | undefined
      if (passed) {
        const { data: cert, error: cErr } = await supabase.from('certificates').insert({
          attempt_id: attempt.id,
          employee_name: intake.employee_name,
          employee_id: intake.employee_id,
        }).select('certificate_number').single()
        if (cErr) throw cErr
        certNumber = cert.certificate_number
      }

      const res: AssessmentResult = { score, total, passed, attemptId: attempt.id, certNumber, intake }
      setResult(res)
      setStarted(false)
      if (passed) {
        sessionStorage.setItem('rcs-dsp-last-cert', JSON.stringify({ attemptId: attempt.id, certNumber, intake }))
      }
    } catch (e) {
      alert('Failed to submit: ' + (e instanceof Error ? e.message : String(e)))
    }
    setSubmitting(false)
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined)

  // ── locked ──
  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="RCS DSP Academy" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Lock size={40} color={C.muted} />
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Assessment locked</div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 380 }}>
            Complete all {modCount} training modules to unlock. You've completed {progress.size}.
          </div>
          <button onClick={onBack} style={{ ...primaryBtn, marginTop: 8 }}>Go to training</button>
        </div>
      </div>
    )
  }

  // ── result ──
  if (result) {
    const pct = Math.round((result.score / result.total) * 100)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="RCS DSP Academy" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 500, width: '100%', ...card, padding: 40, textAlign: 'center', border: `2px solid ${result.passed ? C.success + '50' : C.danger + '50'}`, background: result.passed ? `${C.success}08` : `${C.danger}08` }}>
            {result.passed ? <Award size={48} color={C.success} style={{ margin: '0 auto 16px' }} /> : <ClipboardCheck size={48} color={C.danger} style={{ margin: '0 auto 16px' }} />}
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{result.passed ? 'You passed!' : 'Not quite — try again'}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
              You scored <strong style={{ color: C.text }}>{result.score} / {result.total}</strong> ({pct}%). Passing score is 80%.
            </div>
            {result.passed && result.certNumber && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                Certificate <code style={{ fontWeight: 600, color: C.text }}>{result.certNumber}</code> has been issued.
              </div>
            )}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {result.passed ? (
                <button onClick={onCertificate} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} /> View certificate
                </button>
              ) : (
                <button onClick={() => { setResult(null); setStarted(false) }} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={14} /> Retake assessment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── intake form ──
  if (!started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="RCS DSP Academy" />
        <div style={scrollable}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ ...card, padding: 36, borderRadius: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <ClipboardCheck size={44} color={C.primary} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Final Assessment</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 400, margin: '8px auto 0' }}>
                  32 randomly selected questions from a 60-question bank. You need <strong>26 correct</strong> (80%) to pass and earn your Certificate of Completion.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <FormField label="Employee Full Name" required error={errors.employee_name}>
                  <input type="text" value={intake.employee_name}
                    onChange={e => setIntake(s => ({ ...s, employee_name: e.target.value }))}
                    placeholder="Enter your full name" style={inputStyle} />
                </FormField>
                <FormField label="Employee ID" required error={errors.employee_id}>
                  <input type="text" value={intake.employee_id}
                    onChange={e => setIntake(s => ({ ...s, employee_id: e.target.value }))}
                    placeholder="Enter your Employee ID" style={inputStyle} />
                </FormField>
                <FormField label="Date" error={errors.assessment_date}>
                  <input type="date" value={intake.assessment_date}
                    onChange={e => setIntake(s => ({ ...s, assessment_date: e.target.value }))}
                    style={inputStyle} />
                </FormField>
                <FormField label="Admin Notification Email" hint="Results sent to this email after submission" error={errors.admin_email} optional>
                  <input type="email" value={intake.admin_email}
                    onChange={e => setIntake(s => ({ ...s, admin_email: e.target.value }))}
                    placeholder="admin@reliancecareservicesllc.com" style={inputStyle} />
                </FormField>
              </div>
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button onClick={beginAssessment} disabled={!bank.length}
                  style={{ ...primaryBtn, fontSize: 14, padding: '12px 32px', borderRadius: 10, opacity: bank.length ? 1 : 0.5 }}>
                  Begin Assessment →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── questions ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <HeaderBar onBack={onBack} title="Final Assessment" subtitle={`${intake.employee_name} · ${intake.employee_id}`} />
      <div style={{ background: C.card, borderBottom: `0.5px solid ${C.border}`, padding: '10px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, color: C.muted }}>
          <span>{Object.keys(answers).length} of {questions.length} answered</span>
          <span>{questions.length - Object.keys(answers).length} left</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: C.secondary, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: C.primary, width: `${(Object.keys(answers).length / questions.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ ...scrollable, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 6 }}>
              Question {i + 1} of {questions.length}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12, lineHeight: 1.6 }}>{q.question}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi
                return (
                  <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${selected ? C.primary : C.border}`, background: selected ? `${C.primary}08` : C.card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: C.text, transition: 'all 0.1s' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? C.primary : C.border}`, background: selected ? C.primary : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>
            {allAnswered ? 'All questions answered. Ready to submit.' : `${questions.length - Object.keys(answers).length} questions remaining`}
          </div>
          <button onClick={submitAssessment} disabled={!allAnswered || submitting}
            style={{ ...primaryBtn, opacity: (allAnswered && !submitting) ? 1 : 0.45, cursor: (allAnswered && !submitting) ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Submitting…' : 'Submit assessment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CertificateScreen ────────────────────────────────────────────────────────
function CertificateScreen({ onBack }: { onBack: () => void }) {
  const [stored, setStored] = useState<CertStored | null>(null)
  const [cert, setCert] = useState<{ certificate_number: string; issued_at: string; employee_name: string; employee_id: string } | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('rcs-dsp-last-cert')
      if (raw) {
        const s: CertStored = JSON.parse(raw)
        setStored(s)
        supabase.from('certificates').select('certificate_number,issued_at,employee_name,employee_id')
          .eq('attempt_id', s.attemptId).maybeSingle()
          .then(({ data }) => { if (data) setCert(data) })
      }
    } catch { /* ignore */ }
  }, [])

  if (!stored) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <HeaderBar onBack={onBack} title="Certificate" subtitle="RCS DSP Academy" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Award size={40} color={C.muted} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No certificate yet</div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
            Complete all 12 modules and pass the final assessment to earn your certificate.
          </div>
          <button onClick={onBack} style={{ ...primaryBtn, marginTop: 8 }}>Go to training</button>
        </div>
      </div>
    )
  }

  const name     = cert?.employee_name ?? stored.intake.employee_name
  const empId    = cert?.employee_id ?? stored.intake.employee_id
  const number   = cert?.certificate_number ?? stored.certNumber
  const issuedAt = cert?.issued_at ?? new Date().toISOString()
  const date     = new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <HeaderBar onBack={onBack} title="Your Certificate" subtitle="RCS DSP Academy" />
      <div style={{ ...scrollable }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: C.accent }}>Achievement</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>Your certificate</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Awarded for completing the RCS DSP Training & Assessment program.</div>
          </div>

          {/* The certificate */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1.414 / 1', borderRadius: 16, overflow: 'hidden', background: C.primary, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', backgroundImage: `radial-gradient(ellipse at top left, rgba(201,162,39,0.25) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(0,128,128,0.35) 0%, transparent 55%)` }}>
            {/* Gold double border */}
            <div style={{ position: 'absolute', inset: 12, borderRadius: 10, border: `2px solid rgba(201,162,39,0.65)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 20, borderRadius: 8, border: `1px solid rgba(201,162,39,0.35)`, pointerEvents: 'none' }} />

            {/* Corner flourishes */}
            {(['6px 6px', '6px auto 6px 6px', 'auto 6px 6px', 'auto auto 6px auto'] as const).map((inset, i) => (
              <svg key={i} style={{ position: 'absolute', top: i < 2 ? 24 : 'auto', bottom: i >= 2 ? 24 : 'auto', left: i % 2 === 0 ? 24 : 'auto', right: i % 2 === 1 ? 24 : 'auto', width: 32, height: 32, color: C.gold, transform: `rotate(${i * 90}deg)` }} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 14 V2 H14" /><path d="M2 22 V8 M8 2 H22" opacity="0.5" />
              </svg>
            ))}

            <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(16px, 6%, 48px) clamp(24px, 8%, 64px)', textAlign: 'center' }}>
              {/* header */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 'clamp(11px, 1.6vw, 18px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: C.gold }}>
                  Reliance Care Services
                </div>
                <div style={{ fontSize: 'clamp(9px, 1.1vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  RCS DSP Academy
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span style={{ height: 1, width: 60, background: 'linear-gradient(to right, transparent, rgba(201,162,39,0.7))' }} />
                  <span style={{ color: C.gold, fontSize: 8 }}>✦</span>
                  <span style={{ height: 1, width: 60, background: 'linear-gradient(to left, transparent, rgba(201,162,39,0.7))' }} />
                </div>
                <div style={{ fontSize: 'clamp(20px, 4vw, 44px)', color: C.gold, fontFamily: '"Georgia", serif', fontStyle: 'italic', fontWeight: 700, marginTop: 4, lineHeight: 1 }}>
                  Certificate of Completion
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ height: 1, width: 48, background: 'linear-gradient(to right, transparent, rgba(201,162,39,0.5))' }} />
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.5)' }}>Awarded with distinction</span>
                  <span style={{ height: 1, width: 48, background: 'linear-gradient(to left, transparent, rgba(201,162,39,0.5))' }} />
                </div>
              </div>

              {/* body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{ fontSize: 'clamp(9px, 1.1vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.65)' }}>This certifies that</div>
                <div style={{ fontSize: 'clamp(18px, 3.5vw, 46px)', fontWeight: 700, color: 'white', lineHeight: 1.1, marginTop: 4 }}>{name}</div>
                <div style={{ width: 100, height: 1, background: 'rgba(201,162,39,0.55)', marginTop: 4 }} />
                <div style={{ fontSize: 'clamp(9px, 1.1vw, 12px)', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                  Employee ID: <span style={{ fontFamily: 'monospace', color: C.gold }}>{empId}</span>
                </div>
                <div style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', color: 'rgba(255,255,255,0.75)', marginTop: 12 }}>has successfully completed the</div>
                <div style={{ fontSize: 'clamp(12px, 2vw, 22px)', fontWeight: 600, color: C.gold, marginTop: 4 }}>
                  Direct Support Professional Training & Assessment
                </div>
                <div style={{ fontSize: 'clamp(8px, 0.9vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  12 training modules · 32-question final assessment · 80% pass standard
                </div>
              </div>

              {/* footer */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-end', gap: 16 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.gold }}>Issued</div>
                  <div style={{ borderTop: `1px solid rgba(201,162,39,0.35)`, paddingTop: 6, marginTop: 4, fontSize: 'clamp(9px, 1.1vw, 13px)', fontWeight: 500, color: 'white' }}>{date}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto', background: 'radial-gradient(circle at 30% 30%, rgba(201,162,39,0.6), rgba(201,162,39,0.2) 50%, transparent 75%)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: '1px solid rgba(201,162,39,0.6)', pointerEvents: 'none' }} />
                    <img src="/rcs-logo-seal.png" alt="RCS" style={{ width: '75%', height: '75%', objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(72%) sepia(45%) saturate(520%) hue-rotate(2deg) brightness(96%) contrast(92%)' }} />
                  </div>
                  <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Official Seal</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.gold }}>Certificate No.</div>
                  <div style={{ borderTop: `1px solid rgba(201,162,39,0.35)`, paddingTop: 6, marginTop: 4, fontSize: 'clamp(9px, 1.1vw, 12px)', fontFamily: 'monospace', fontWeight: 500, color: 'white' }}>{number}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => window.print()} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Download PDF
            </button>
            <button onClick={() => window.print()} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── shared sub-components ────────────────────────────────────────────────────
function HeaderBar({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle?: string }) {
  return (
    <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Training</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{subtitle}</div>}
      </div>
    </div>
  )
}

function StatusPill({ color, bg, children }: { color: string; bg: string; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: bg, color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {children}
    </span>
  )
}

function FormField({ label, required, optional, hint, error, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; error?: string; children: ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: C.danger }}>*</span>}
        {optional && <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>(optional)</span>}
      </label>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{error}</div>}
    </div>
  )
}

// ─── markdown renderer (lightweight) ─────────────────────────────────────────
function renderHandout(markdown: string) {
  const blocks: ReactNode[] = []
  const lines = markdown.trim().split('\n')
  let listItems: string[] = []
  let orderedItems: string[] = []

  const flushLists = () => {
    if (listItems.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} style={{ paddingLeft: 20, margin: '6px 0' }}>{listItems.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{renderInline(item)}</li>)}</ul>)
      listItems = []
    }
    if (orderedItems.length) {
      blocks.push(<ol key={`ol-${blocks.length}`} style={{ paddingLeft: 20, margin: '6px 0' }}>{orderedItems.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{renderInline(item)}</li>)}</ol>)
      orderedItems = []
    }
  }

  lines.forEach(raw => {
    const line = raw.trim()
    if (!line) { flushLists(); return }
    if (line.startsWith('# ')) { flushLists(); blocks.push(<h1 key={blocks.length} style={{ fontSize: 18, fontWeight: 700, marginTop: 12, color: C.text }}>{renderInline(line.slice(2))}</h1>) }
    else if (line.startsWith('## ')) { flushLists(); blocks.push(<h2 key={blocks.length} style={{ fontSize: 15, fontWeight: 600, marginTop: 10, color: C.text }}>{renderInline(line.slice(3))}</h2>) }
    else if (line.startsWith('- ')) { listItems.push(line.slice(2)) }
    else if (/^\d+\.\s/.test(line)) { orderedItems.push(line.replace(/^\d+\.\s/, '')) }
    else if (line.startsWith('> ')) { flushLists(); blocks.push(<blockquote key={blocks.length} style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 12, color: C.muted, fontStyle: 'italic', margin: '8px 0' }}>{renderInline(line.slice(2))}</blockquote>) }
    else { flushLists(); blocks.push(<p key={blocks.length} style={{ margin: '4px 0' }}>{renderInline(line)}</p>) }
  })
  flushLists()
  return blocks
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )
}

// ─── shared style objects ─────────────────────────────────────────────────────
const backBtn: CSSProperties = {
  fontSize: 12, padding: '5px 11px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.25)',
  background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
  gap: 5, fontFamily: 'inherit', flexShrink: 0,
}

const primaryBtn: CSSProperties = {
  fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none',
  background: C.primary, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
}

const secondaryBtn: CSSProperties = {
  fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `0.5px solid ${C.border}`,
  background: C.card, color: C.text, cursor: 'pointer', fontFamily: 'inherit',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
}

const inputStyle: CSSProperties = {
  width: '100%', borderRadius: 10, border: `0.5px solid ${C.border}`, background: C.bg,
  padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', color: C.text,
  outline: 'none', boxSizing: 'border-box',
}
