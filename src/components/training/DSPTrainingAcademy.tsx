// @ts-nocheck
'use client'

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { dspSupabase as supabase } from '@/lib/dsp-supabase'
import { useProgress, markComplete } from '@/lib/dsp-progress'
import { MANUAL_META, MANUAL_SECTIONS, type ManualBlock } from '@/lib/orientation-manual'
import { TRAINING_SECTIONS } from '@/lib/training-manual'
import {
  PlayCircle, Award, ClipboardCheck, ArrowRight, Lock, CheckCircle2,
  FileText, VideoOff, BookOpen, Download, ArrowLeft, RotateCcw,
  Printer, ChevronRight, LayoutGrid, GraduationCap,
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
  | { screen: 'landing' }
  | { screen: 'poster' }
  | { screen: 'modules' }
  | { screen: 'module-detail'; moduleId: string }
  | { screen: 'assessment' }
  | { screen: 'certificate' }
  | { screen: 'orientation' }

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
  const [nav, setNav] = useState<NavState>({ screen: 'landing' })

  const go = {
    landing:     () => setNav({ screen: 'landing' }),
    poster:      () => setNav({ screen: 'poster' }),
    modules:     () => setNav({ screen: 'modules' }),
    module:      (id: string) => setNav({ screen: 'module-detail', moduleId: id }),
    assessment:  () => setNav({ screen: 'assessment' }),
    certificate: () => setNav({ screen: 'certificate' }),
    orientation: () => setNav({ screen: 'orientation' }),
  }

  if (nav.screen === 'landing')
    return <LandingScreen onBack={onBack} onPoster={go.poster} onModules={go.modules} onAssessment={go.assessment} />
  if (nav.screen === 'poster')
    return <PosterScreen onBack={go.landing} onAssessment={go.assessment} />
  if (nav.screen === 'modules')
    return <ModulesScreen onBack={go.landing} onModule={go.module} onAssessment={go.assessment} onCertificate={go.certificate} onOrientation={go.orientation} />
  if (nav.screen === 'module-detail')
    return <ModuleDetailScreen moduleId={nav.moduleId} onBack={go.modules} onModule={go.module} />
  if (nav.screen === 'assessment')
    return <AssessmentScreen onBack={go.modules} onCertificate={go.certificate} />
  if (nav.screen === 'certificate')
    return <CertificateScreen onBack={go.modules} />
  if (nav.screen === 'orientation')
    return <OrientationScreen onBack={go.modules} />
  return null
}

// ─── LandingScreen ───────────────────────────────────────────────────────────
const HERO_NAVY  = '#0c1b2e'
const HERO_BLUE  = '#1a60e6'

function LandingScreen({ onBack, onPoster, onModules, onAssessment }: {
  onBack: () => void; onPoster: () => void; onModules: () => void; onAssessment: () => void
}) {
  const [name, setName] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_name ?? '') : ''
    } catch { return '' }
  })
  const [empId, setEmpId] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_id ?? '') : ''
    } catch { return '' }
  })
  const [date, setDate] = useState(todayISO)
  const [adminEmail, setAdminEmail] = useState('')
  const [errors, setErrors] = useState<{ name?: string; empId?: string; adminEmail?: string }>({})
  const enrollRef = useRef<HTMLDivElement>(null)

  function scrollToEnroll() {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function begin() {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Full name required'
    if (!empId.trim()) errs.empId = 'Employee ID required'
    if (adminEmail && !/^[^@]+@[^@]+\.[^@]+$/.test(adminEmail)) errs.adminEmail = 'Invalid email'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      sessionStorage.setItem('rcs-dsp-employee-v1', JSON.stringify({ employee_name: name.trim(), employee_id: empId.trim() }))
    } catch { /* ignore */ }
    onPoster()
  }

  const fi: CSSProperties = {
    width: '100%', borderRadius: 14, border: '1.5px solid #e2e8f0',
    background: '#ffffff', padding: '14px 18px', fontSize: 14,
    fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box',
  }

  const featureCards = [
    { Icon: GraduationCap, title: '12 training modules',    desc: 'Video-gated curriculum covering ethics, safety, rights, and documentation.' },
    { Icon: ClipboardCheck, title: '32-question assessment', desc: 'Randomized from a 60-question bank. 80% to pass.' },
    { Icon: Award,          title: 'Certificate on pass',   desc: 'Branded certificate of completion issued immediately.' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ══ Section 1: Dark hero ══════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, minHeight: '88%', display: 'flex', flexDirection: 'column', background: HERO_NAVY, backgroundImage: 'radial-gradient(ellipse at 80% 15%, rgba(26,96,230,0.18) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(0,64,80,0.4) 0%, transparent 45%)' }}>

        {/* top nav (white bar) */}
        <div style={{ background: 'white', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: HERO_NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GraduationCap size={21} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: HERO_NAVY, letterSpacing: '-0.3px', lineHeight: 1.2 }}>YC DSP Academy</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Yayra Care</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onBack} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', marginRight: 8 }}>
            ← Exit
          </button>
          <button onClick={scrollToEnroll} style={{ fontSize: 14, padding: '10px 22px', borderRadius: 10, border: 'none', background: HERO_NAVY, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            Start training
          </button>
        </div>

        {/* hero content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(48px, 7%, 80px) clamp(36px, 7%, 96px)' }}>
          {/* badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', marginBottom: 28, alignSelf: 'flex-start' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: HERO_BLUE, flexShrink: 0, boxShadow: `0 0 6px ${HERO_BLUE}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.85)' }}>Direct Support Professional Training</span>
          </div>

          {/* headline */}
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 72px)', fontWeight: 800, color: '#ffffff', lineHeight: 1.04, letterSpacing: '-2px', margin: '0 0 20px', maxWidth: 860 }}>
            Training that honors the<br />people you support.
          </h1>

          {/* subtext */}
          <p style={{ fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: '0 0 44px', maxWidth: 540 }}>
            Twelve video-gated modules followed by a final assessment. Complete it and earn your YC Certificate of Completion.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={scrollToEnroll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 15, padding: '14px 28px', borderRadius: 12, border: 'none', background: HERO_BLUE, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: `0 4px 20px rgba(26,96,230,0.45)` }}>
              <PlayCircle size={19} /> Begin training →
            </button>
            <button onClick={onAssessment}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, padding: '13px 26px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.92)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
              Go to assessment
            </button>
          </div>
        </div>
      </div>

      {/* ══ Section 2: Enrollment form ════════════════════════════════════════ */}
      <div ref={enrollRef} style={{ background: '#f0f4f8', padding: '64px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* heading */}
        <div style={{ textAlign: 'center', marginBottom: 32, maxWidth: 640 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#64748b', marginBottom: 10 }}>Get Started</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: HERO_NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Enroll & begin your training
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Enter your details below to begin the 12-module training program.
          </p>
        </div>

        {/* form card */}
        <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '36px 40px', width: '100%', maxWidth: 700, boxShadow: '0 2px 14px rgba(0,0,0,0.06)', marginBottom: 28 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 20, marginBottom: 28 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: HERO_NAVY, marginBottom: 8 }}>Employee Full Name <span style={{ color: C.danger }}>*</span></label>
              <input type="text" value={name}
                onChange={e => { setName(e.target.value); setErrors(r => ({ ...r, name: undefined })) }}
                placeholder="Enter your full name"
                style={{ ...fi, borderColor: errors.name ? C.danger : '#e2e8f0' }} />
              {errors.name && <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{errors.name}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: HERO_NAVY, marginBottom: 8 }}>Employee ID <span style={{ color: C.danger }}>*</span></label>
              <input type="text" value={empId}
                onChange={e => { setEmpId(e.target.value); setErrors(r => ({ ...r, empId: undefined })) }}
                placeholder="Enter your Employee ID"
                style={{ ...fi, borderColor: errors.empId ? C.danger : '#e2e8f0' }} />
              {errors.empId && <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{errors.empId}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: HERO_NAVY, marginBottom: 8 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...fi }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: HERO_NAVY, marginBottom: 8 }}>Admin Notification Email</label>
              <input type="email" value={adminEmail}
                onChange={e => { setAdminEmail(e.target.value); setErrors(r => ({ ...r, adminEmail: undefined })) }}
                placeholder="info@yellowstrides.com"
                style={{ ...fi, background: '#f8fafc', borderColor: errors.adminEmail ? C.danger : '#e2e8f0' }} />
              {errors.adminEmail
                ? <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{errors.adminEmail}</div>
                : <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>Certificate will be sent to this address upon completion.</div>
              }
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={begin} style={{ fontSize: 15, padding: '14px 44px', borderRadius: 12, border: 'none', background: HERO_NAVY, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 18px rgba(13,27,46,0.32)' }}>
              Begin Training <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, width: '100%', maxWidth: 700, marginBottom: 36 }}>
          {featureCards.map(({ Icon, title, desc }, i) => (
            <div key={i} style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: HERO_NAVY }}>
                <Icon size={20} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: HERO_NAVY, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 700, paddingTop: 16, borderTop: '0.5px solid #e2e8f0' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} Yayra Care</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>YC DSP Academy</span>
        </div>
      </div>
    </div>
  )
}

// ─── PosterScreen ────────────────────────────────────────────────────────────
const POSTER_STEPS = [
  {
    title: 'Direct Support Poster',
    description: 'Required posting — this poster must be displayed at your worksite at all times.',
    preview: '/resources/direct-support-poster-preview.png',
    download: '/resources/direct-support-poster.pdf',
    downloadName: 'Direct Support Poster',
  },
  {
    title: "Stephen Komninos' Law",
    description: 'NJ mandatory awareness poster required for all direct support professionals.',
    preview: '/resources/skl-its-the-law-preview.png',
    download: '/resources/skl-its-the-law.pdf',
    downloadName: "SKL — It's The Law",
  },
  {
    title: "Danielle's Law Flyer",
    description: 'Required reading on NJ abuse and neglect reporting obligations.',
    preview: '/resources/danielles-law-flyer-preview.png',
    download: '/resources/danielles-law-flyer.pdf',
    downloadName: "Danielle's Law Flyer",
  },
]

function PosterScreen({ onBack, onAssessment }: { onBack: () => void; onAssessment: () => void }) {
  const [step, setStep] = useState(1)

  // Orientation Manual state (step 4)
  const [orientSectionIdx, setOrientSectionIdx] = useState(0)
  const [orientChecked, setOrientChecked] = useState(false)
  const [orientAck, setOrientAck] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('rcs-orientation-ack-v1') === '1' } catch { return false }
  })

  // Training Manual state (step 5)
  const [trainSectionIdx, setTrainSectionIdx] = useState(0)
  const [trainChecked, setTrainChecked] = useState(false)
  const [trainAck, setTrainAck] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('rcs-training-ack-v1') === '1' } catch { return false }
  })

  // Shared employee intake (pre-populated from sessionStorage)
  const [empName, setEmpName] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_name ?? '') : ''
    } catch { return '' }
  })
  const [empId, setEmpId] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_id ?? '') : ''
    } catch { return '' }
  })
  const [intakeError, setIntakeError] = useState('')
  const [ackSubmitting, setAckSubmitting] = useState(false)

  const orientContentRef = useRef<HTMLDivElement>(null)
  const trainContentRef  = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const TOTAL_STEPS = 5

  async function acknowledgeOrientation() {
    const name = empName.trim(); const id = empId.trim()
    if (!name || !id) { setIntakeError('Full name and Employee ID are required'); return }
    setIntakeError(''); setAckSubmitting(true)
    try {
      await supabase.from('orientation_acknowledgements').insert({ employee_name: name, employee_id: id })
      sessionStorage.setItem('rcs-dsp-employee-v1', JSON.stringify({ employee_name: name, employee_id: id }))
    } catch (e) { console.warn('orientation_acknowledgements insert failed:', e) }
    try { localStorage.setItem('rcs-orientation-ack-v1', '1') } catch { /* ignore */ }
    setOrientAck(true); setAckSubmitting(false)
  }

  async function acknowledgeTraining() {
    const name = empName.trim(); const id = empId.trim()
    if (!name || !id) { setIntakeError('Full name and Employee ID are required'); return }
    setIntakeError(''); setAckSubmitting(true)
    try {
      await supabase.from('training_acknowledgements').insert({ employee_name: name, employee_id: id })
      sessionStorage.setItem('rcs-dsp-employee-v1', JSON.stringify({ employee_name: name, employee_id: id }))
    } catch (e) { console.warn('training_acknowledgements insert failed:', e) }
    try { localStorage.setItem('rcs-training-ack-v1', '1') } catch { /* ignore */ }
    setTrainAck(true); setAckSubmitting(false)
  }

  // ── step indicator (reusable inline ──
  const stepIndicator = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const s = i + 1; const done = step > s; const active = step === s
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: done ? C.success : active ? C.primary : C.secondary,
              color: (done || active) ? 'white' : C.muted,
              border: `2px solid ${done ? C.success : active ? C.primary : C.border}`,
            }}>
              {done ? '✓' : s}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div style={{ width: 28, height: 2, background: step > s ? C.success : C.border, borderRadius: 1 }} />
            )}
          </div>
        )
      })}
    </div>
  )

  // ── Steps 1–3: poster/flyer previews ──
  if (step <= 3) {
    const ps = POSTER_STEPS[step - 1]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Exit</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Required Onboarding Materials</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Yayra Care · Step {step} of {TOTAL_STEPS}</div>
          </div>
        </div>

        <div style={scrollable}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {stepIndicator}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: C.accent }}>Step {step} of {TOTAL_STEPS}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>{ps.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{ps.description}</div>
            </div>

            <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
              <img src={ps.preview} alt={ps.title} style={{ width: '100%', maxHeight: 520, objectFit: 'contain', display: 'block', background: C.bg }} />
            </div>

            <div style={{ ...card, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ps.downloadName}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Download and save a copy for your records</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={ps.download} target="_blank" rel="noreferrer" style={secondaryBtn as CSSProperties}><FileText size={13} /> Open PDF</a>
                <a href={ps.download} download style={primaryBtn as CSSProperties}><Download size={13} /> Download</a>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(s => s + 1)} style={{ ...primaryBtn, fontSize: 14, padding: '11px 26px' }}>
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4: Provider Orientation Manual ──
  if (step === 4) {
    const section = MANUAL_SECTIONS[orientSectionIdx]
    const isLastSection = orientSectionIdx === MANUAL_SECTIONS.length - 1
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setStep(3)} style={backBtn}><ArrowLeft size={13} /> Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Provider Orientation Manual</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Step 4 of 5 · Read all sections, then acknowledge</div>
          </div>
          {orientAck && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: `${C.success}30`, color: C.success, flexShrink: 0 }}>
              <CheckCircle2 size={12} /> Acknowledged
            </span>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
          {/* sidebar */}
          <div style={{ width: isMobile ? '100%' : 200, maxHeight: isMobile ? 160 : 'none', flexShrink: 0, overflowY: 'auto', borderRight: isMobile ? 'none' : `0.5px solid ${C.border}`, borderBottom: isMobile ? `0.5px solid ${C.border}` : 'none', background: C.card, padding: '8px 0' }}>
            {MANUAL_SECTIONS.map((s, i) => {
              const isActive = orientSectionIdx === i
              return (
                <button key={s.id} onClick={() => { setOrientSectionIdx(i); if (orientContentRef.current) orientContentRef.current.scrollTop = 0 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: isActive ? `${C.primary}10` : 'transparent', borderLeft: `2.5px solid ${isActive ? C.primary : 'transparent'}` }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.secondary, border: `1px solid ${C.border}`, fontSize: 9, fontWeight: 600, color: C.muted }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 11, color: isActive ? C.text : C.muted, fontWeight: isActive ? 600 : 400, lineHeight: 1.3 }}>{s.title}</div>
                </button>
              )
            })}
          </div>

          {/* content */}
          <div ref={orientContentRef} style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: C.accent }}>{section.number}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 2 }}>{section.title}</div>
              </div>
              <div style={{ ...card, padding: 24, marginBottom: 16 }}>
                {section.blocks.map((block, i) => renderManualBlock(block, i))}
              </div>

              {/* section navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <button onClick={() => { setOrientSectionIdx(n => Math.max(0, n - 1)); if (orientContentRef.current) orientContentRef.current.scrollTop = 0 }}
                  disabled={orientSectionIdx === 0} style={{ ...secondaryBtn, opacity: orientSectionIdx === 0 ? 0.4 : 1 }}>
                  <ArrowLeft size={14} /> Previous
                </button>
                {!isLastSection && (
                  <button onClick={() => { setOrientSectionIdx(n => Math.min(MANUAL_SECTIONS.length - 1, n + 1)); if (orientContentRef.current) orientContentRef.current.scrollTop = 0 }}
                    style={{ ...primaryBtn }}>
                    Next section <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* acknowledgement panel — last section only */}
              {isLastSection && (
                <div style={{ ...card, padding: 24, border: orientAck ? `0.5px solid ${C.success}60` : `0.5px solid ${C.border}`, background: orientAck ? `${C.success}05` : C.card }}>
                  {orientAck ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <CheckCircle2 size={24} color={C.success} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Orientation manual acknowledged</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Your acknowledgement is recorded. Continue to the DSP Training Manual.</div>
                        </div>
                      </div>
                      <button onClick={() => setStep(5)} style={{ ...primaryBtn, fontSize: 14, padding: '11px 26px' }}>
                        Continue to Training Manual <ArrowRight size={15} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Acknowledge Orientation Manual</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>By acknowledging, you confirm you have read the Provider Orientation Manual and understand its contents.</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>Full Name <span style={{ color: C.danger }}>*</span></label>
                          <input type="text" value={empName} onChange={e => { setEmpName(e.target.value); setIntakeError('') }} placeholder="Your full name" style={{ ...inputStyle }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>Employee ID <span style={{ color: C.danger }}>*</span></label>
                          <input type="text" value={empId} onChange={e => { setEmpId(e.target.value); setIntakeError('') }} placeholder="Your Employee ID" style={{ ...inputStyle }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                        <input type="checkbox" checked={orientChecked} onChange={e => setOrientChecked(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.primary }} />
                        <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                          I have read the Provider Orientation Manual in its entirety and understand its contents, policies, and requirements.
                        </span>
                      </label>
                      {intakeError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{intakeError}</div>}
                      <button onClick={acknowledgeOrientation} disabled={!orientChecked || ackSubmitting}
                        style={{ ...primaryBtn, background: C.success, opacity: (orientChecked && !ackSubmitting) ? 1 : 0.45, cursor: (orientChecked && !ackSubmitting) ? 'pointer' : 'not-allowed' }}>
                        <CheckCircle2 size={14} /> {ackSubmitting ? 'Saving…' : 'Acknowledge & Continue'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 5: DSP Training Manual ──
  const trainSection = TRAINING_SECTIONS[trainSectionIdx]
  const isLastTrainSection = trainSectionIdx === TRAINING_SECTIONS.length - 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => setStep(4)} style={backBtn}><ArrowLeft size={13} /> Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>DSP Training Manual</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Step 5 of 5 · Read all modules, then acknowledge</div>
        </div>
        {trainAck && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: `${C.success}30`, color: C.success, flexShrink: 0 }}>
            <CheckCircle2 size={12} /> Acknowledged
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
        {/* sidebar */}
        <div style={{ width: isMobile ? '100%' : 200, maxHeight: isMobile ? 160 : 'none', flexShrink: 0, overflowY: 'auto', borderRight: isMobile ? 'none' : `0.5px solid ${C.border}`, borderBottom: isMobile ? `0.5px solid ${C.border}` : 'none', background: C.card, padding: '8px 0' }}>
          {TRAINING_SECTIONS.map((s, i) => {
            const isActive = trainSectionIdx === i
            return (
              <button key={s.id} onClick={() => { setTrainSectionIdx(i); if (trainContentRef.current) trainContentRef.current.scrollTop = 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: isActive ? `${C.primary}10` : 'transparent', borderLeft: `2.5px solid ${isActive ? C.primary : 'transparent'}` }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.secondary, border: `1px solid ${C.border}`, fontSize: 9, fontWeight: 600, color: C.muted }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 11, color: isActive ? C.text : C.muted, fontWeight: isActive ? 600 : 400, lineHeight: 1.3 }}>{s.title}</div>
              </button>
            )
          })}
        </div>

        {/* content */}
        <div ref={trainContentRef} style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: C.accent }}>{trainSection.number}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 2 }}>{trainSection.title}</div>
            </div>
            <div style={{ ...card, padding: 24, marginBottom: 16 }}>
              {trainSection.blocks.map((block, i) => renderManualBlock(block, i))}
            </div>

            {/* section navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={() => { setTrainSectionIdx(n => Math.max(0, n - 1)); if (trainContentRef.current) trainContentRef.current.scrollTop = 0 }}
                disabled={trainSectionIdx === 0} style={{ ...secondaryBtn, opacity: trainSectionIdx === 0 ? 0.4 : 1 }}>
                <ArrowLeft size={14} /> Previous
              </button>
              {!isLastTrainSection && (
                <button onClick={() => { setTrainSectionIdx(n => Math.min(TRAINING_SECTIONS.length - 1, n + 1)); if (trainContentRef.current) trainContentRef.current.scrollTop = 0 }}
                  style={{ ...primaryBtn }}>
                  Next module <ArrowRight size={14} />
                </button>
              )}
            </div>

            {/* acknowledgement panel — last module only */}
            {isLastTrainSection && (
              <div style={{ ...card, padding: 24, border: trainAck ? `0.5px solid ${C.success}60` : `0.5px solid ${C.border}`, background: trainAck ? `${C.success}05` : C.card }}>
                {trainAck ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <CheckCircle2 size={24} color={C.success} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Training manual acknowledged</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>You're ready to take the final assessment.</div>
                      </div>
                    </div>
                    <button onClick={onAssessment} style={{ ...primaryBtn, fontSize: 14, padding: '12px 28px', background: HERO_BLUE, boxShadow: `0 4px 18px rgba(26,96,230,0.4)` }}>
                      <ClipboardCheck size={16} /> Continue to Assessment →
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Acknowledge DSP Training Manual</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>By acknowledging, you confirm you have read the DSP Training Manual and understand your responsibilities.</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>Full Name <span style={{ color: C.danger }}>*</span></label>
                        <input type="text" value={empName} onChange={e => { setEmpName(e.target.value); setIntakeError('') }} placeholder="Your full name" style={{ ...inputStyle }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>Employee ID <span style={{ color: C.danger }}>*</span></label>
                        <input type="text" value={empId} onChange={e => { setEmpId(e.target.value); setIntakeError('') }} placeholder="Your Employee ID" style={{ ...inputStyle }} />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                      <input type="checkbox" checked={trainChecked} onChange={e => setTrainChecked(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.primary }} />
                      <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                        I have read the DSP Training Manual in its entirety and understand my responsibilities as a Direct Support Professional.
                      </span>
                    </label>
                    {intakeError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{intakeError}</div>}
                    <button onClick={acknowledgeTraining} disabled={!trainChecked || ackSubmitting}
                      style={{ ...primaryBtn, background: C.success, opacity: (trainChecked && !ackSubmitting) ? 1 : 0.45, cursor: (trainChecked && !ackSubmitting) ? 'pointer' : 'not-allowed' }}>
                      <CheckCircle2 size={14} /> {ackSubmitting ? 'Saving…' : 'Acknowledge & Proceed to Assessment'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ModulesScreen ────────────────────────────────────────────────────────────
function ModulesScreen({ onBack, onModule, onAssessment, onCertificate, onOrientation }: {
  onBack: () => void; onModule: (id: string) => void
  onAssessment: () => void; onCertificate: () => void; onOrientation: () => void
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
    { Icon: PlayCircle,    label: 'Modules completed', value: loading ? '…' : `${watched} / ${total}` },
    { Icon: ClipboardCheck, label: 'Final assessment',  value: allDone ? 'Unlocked' : 'Locked' },
    { Icon: Award,         label: 'Certificate',        value: allDone ? 'Available' : 'Pending' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f4f8' }}>
      {/* white top nav */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: HERO_NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={20} color="white" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: HERO_NAVY, letterSpacing: '-0.3px', lineHeight: 1.2 }}>YC DSP Academy</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Training & Assessment</div>
          </div>
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#f0f4f8', fontSize: 14, fontWeight: 600, color: HERO_NAVY }}>
            <LayoutGrid size={15} /> Training
          </div>
          <button onClick={onAssessment} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ClipboardCheck size={15} /> Assessment
          </button>
          <button onClick={onCertificate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Award size={15} /> Certificate
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
        {/* hero */}
        <h1 style={{ fontSize: 32, fontWeight: 800, color: HERO_NAVY, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Your training</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', lineHeight: 1.5 }}>
          Complete each module in order. When all {total || 12} are complete, the final assessment unlocks.
        </p>

        {/* stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 16, marginBottom: 32 }}>
          {statCards.map(({ Icon, label, value }, i) => (
            <div key={i} style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: HERO_NAVY, flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: HERO_NAVY, letterSpacing: '-0.5px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* modules heading */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: HERO_NAVY, margin: '0 0 16px', letterSpacing: '-0.3px' }}>Training modules</h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 48 }}>Loading modules…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, marginBottom: 24 }}>
            {modules.map((m, idx) => {
              const done     = progress.has(m.id)
              const prevDone = idx === 0 || progress.has(modules[idx - 1]?.id)
              const locked   = !done && !prevDone
              return (
                <ModuleCard key={m.id} index={idx + 1} module={m} done={done} locked={locked}
                  onClick={() => !locked && onModule(m.id)} />
              )
            })}
          </div>
        )}

        {/* assessment banner */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: HERO_NAVY, marginBottom: 4 }}>Final assessment</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              32 questions randomly drawn from a 60-question bank · 80% to pass · Certificate on success
            </div>
          </div>
          {allDone ? (
            <button onClick={onAssessment} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '12px 24px', borderRadius: 10, border: 'none', background: HERO_NAVY, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              <ClipboardCheck size={15} /> Start assessment
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 500 }}>
              <Lock size={14} /> Complete all {total} modules to unlock
            </div>
          )}
        </div>

        {/* additional resources */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a7da4', flexShrink: 0 }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: HERO_NAVY }}>Additional Resources</span>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, background: '#edf2f7', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Optional</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Reference materials, bulletins, forms, and handbooks. Not required to complete training — use as needed on the job.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
            {RESOURCE_CATEGORIES.map(cat => (
              <div key={cat.name} style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4a7da4', marginBottom: 12 }}>{cat.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {cat.items.map(r => (
                    <a key={r.file} href={`${BASE_RES}/${encodeURIComponent(r.file)}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 8, fontSize: 13, color: HERO_NAVY, textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#edf2f7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <FileText size={15} style={{ flexShrink: 0, color: '#64748b' }} />
                      <span style={{ lineHeight: 1.4 }}>{r.title}</span>
                    </a>
                  ))}
                </div>
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
        background: '#ffffff', borderRadius: 16, padding: '22px 24px',
        border: `1px solid ${hover && !locked ? '#cbd5e1' : '#e2e8f0'}`,
        cursor: locked ? 'default' : 'pointer',
        boxShadow: hover && !locked ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* top row: emoji badge + status pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
          {m.cover_emoji ?? '📘'}
        </div>
        {done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: `${C.success}12`, fontSize: 12, fontWeight: 600, color: C.success }}>
            <CheckCircle2 size={13} /> Complete
          </div>
        ) : locked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: '#f0f4f8', fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>
            <Lock size={12} /> Locked
          </div>
        ) : (
          <div style={{ padding: '5px 12px', borderRadius: 8, background: '#f0f4f8', fontSize: 12, fontWeight: 500, color: '#64748b' }}>
            Ready
          </div>
        )}
      </div>

      {/* module label */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
        Module {index} · {m.category} · {mins} min
      </div>

      {/* title */}
      <div style={{ fontSize: 17, fontWeight: 700, color: locked ? '#94a3b8' : HERO_NAVY, lineHeight: 1.3, marginBottom: 8 }}>
        {m.title}
      </div>

      {/* description */}
      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: !locked ? 16 : 0 }}>
        {m.description}
      </div>

      {/* bottom links — unlocked only */}
      {!locked && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #f0f4f8' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: HERO_NAVY, display: 'flex', alignItems: 'center', gap: 6 }}>
            {done ? 'Review' : 'Watch now'} <ArrowRight size={15} />
          </span>
          <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Handout
          </span>
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
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="YC DSP Academy" />
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
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="YC DSP Academy" />
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
        <HeaderBar onBack={onBack} title="Final Assessment" subtitle="YC DSP Academy" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
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
                    placeholder="info@yellowstrides.com" style={inputStyle} />
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
        <HeaderBar onBack={onBack} title="Certificate" subtitle="YC DSP Academy" />
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
      <HeaderBar onBack={onBack} title="Your Certificate" subtitle="YC DSP Academy" />
      <div style={{ ...scrollable }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: C.accent }}>Achievement</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>Your certificate</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Awarded for completing the YC DSP Training & Assessment program.</div>
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
                  Yayra Care
                </div>
                <div style={{ fontSize: 'clamp(9px, 1.1vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  YC DSP Academy
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
                    <img src="/rcs-logo-seal.png" alt="YC" style={{ width: '75%', height: '75%', objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(72%) sepia(45%) saturate(520%) hue-rotate(2deg) brightness(96%) contrast(92%)' }} />
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

// ─── OrientationBanner ───────────────────────────────────────────────────────
function OrientationBanner({ onOpen }: { onOpen: () => void }) {
  const acknowledged = typeof window !== 'undefined' && localStorage.getItem('rcs-orientation-ack-v1') === '1'
  return (
    <div style={{ ...card, padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderColor: `${C.accent}55` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, flexShrink: 0 }}>
          <BookOpen size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Provider Orientation Manual</span>
            {acknowledged && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${C.success}18`, color: C.success, fontWeight: 600 }}>
                <CheckCircle2 size={10} /> Acknowledged
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            10-section NJ HCBS onboarding — required reading before your first solo shift.
          </div>
        </div>
      </div>
      <button onClick={onOpen} style={{ ...primaryBtn, flexShrink: 0 }}>
        <BookOpen size={14} /> Open manual
      </button>
    </div>
  )
}

// ─── OrientationScreen ────────────────────────────────────────────────────────
function OrientationScreen({ onBack }: { onBack: () => void }) {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('rcs-orientation-visited-v1') : null
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })
  const [acknowledged, setAcknowledged] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('rcs-orientation-ack-v1') === '1' } catch { return false }
  })

  // Intake for the acknowledgement record
  const [ackName, setAckName] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_name ?? '') : ''
    } catch { return '' }
  })
  const [ackId, setAckId] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('rcs-dsp-employee-v1') : null
      return saved ? (JSON.parse(saved).employee_id ?? '') : ''
    } catch { return '' }
  })
  const [ackError, setAckError] = useState('')
  const [ackSubmitting, setAckSubmitting] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const section = MANUAL_SECTIONS[sectionIdx]
  const isLast  = sectionIdx === MANUAL_SECTIONS.length - 1

  useEffect(() => {
    if (!visited.has(section.id)) {
      const next = new Set([...visited, section.id])
      setVisited(next)
      try { localStorage.setItem('rcs-orientation-visited-v1', JSON.stringify([...next])) } catch { /* ignore */ }
    }
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [sectionIdx])

  async function acknowledge() {
    const name = ackName.trim()
    const empId = ackId.trim()
    if (!name) { setAckError('Full name is required'); return }
    if (!empId) { setAckError('Employee ID is required'); return }
    setAckError('')
    setAckSubmitting(true)
    try {
      const { error } = await supabase.from('orientation_acknowledgements').insert({
        employee_name: name,
        employee_id: empId,
      })
      if (error) throw error
      sessionStorage.setItem('rcs-dsp-employee-v1', JSON.stringify({ employee_name: name, employee_id: empId }))
    } catch (e) {
      // Non-fatal: still complete locally if Supabase is unavailable
      console.warn('orientation_acknowledgements insert failed:', e)
    }
    try { localStorage.setItem('rcs-orientation-ack-v1', '1') } catch { /* ignore */ }
    setAcknowledged(true)
    setAckSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* header */}
      <div style={{ background: C.primary, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={13} /> Training</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Provider Orientation Manual</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{MANUAL_META.agency} · Effective {MANUAL_META.effective}</div>
        </div>
        {acknowledged && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: `${C.success}30`, color: C.success, flexShrink: 0 }}>
            <CheckCircle2 size={12} /> Acknowledged
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
        {/* sidebar */}
        <div style={{ width: isMobile ? '100%' : 220, maxHeight: isMobile ? 160 : 'none', flexShrink: 0, overflowY: 'auto', borderRight: isMobile ? 'none' : `0.5px solid ${C.border}`, borderBottom: isMobile ? `0.5px solid ${C.border}` : 'none', background: C.card, padding: '8px 0' }}>
          {MANUAL_SECTIONS.map((s, i) => {
            const isVisited = visited.has(s.id)
            const isActive  = sectionIdx === i
            return (
              <button
                key={s.id}
                onClick={() => setSectionIdx(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
                  padding: '8px 14px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'inherit', border: 'none',
                  background: isActive ? `${C.primary}10` : 'transparent',
                  borderLeft: `2.5px solid ${isActive ? C.primary : 'transparent'}`,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isVisited ? `${C.success}18` : C.secondary,
                  border: `1px solid ${isVisited ? C.success : C.border}`,
                }}>
                  {isVisited
                    ? <CheckCircle2 size={11} color={C.success} />
                    : <span style={{ fontSize: 9, fontWeight: 600, color: C.muted }}>{i + 1}</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: isActive ? C.primary : C.muted }}>{s.number}</div>
                  <div style={{ fontSize: 12, color: isActive ? C.text : C.muted, fontWeight: isActive ? 600 : 400, lineHeight: 1.3, marginTop: 1 }}>{s.title}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: C.accent }}>{section.number}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>{section.title}</div>
            </div>

            <div style={{ ...card, padding: 24 }}>
              {section.blocks.map((block, i) => renderManualBlock(block, i))}

              {/* Acknowledgement intake form — Section 10 only */}
              {isLast && !acknowledged && (
                <div style={{ marginTop: 24, borderTop: `0.5px solid ${C.border}`, paddingTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Your electronic acknowledgement</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>
                        Full Name <span style={{ color: C.danger }}>*</span>
                      </label>
                      <input
                        type="text" value={ackName}
                        onChange={e => { setAckName(e.target.value); setAckError('') }}
                        placeholder="Enter your full name"
                        style={{ ...inputStyle }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 5 }}>
                        Employee ID <span style={{ color: C.danger }}>*</span>
                      </label>
                      <input
                        type="text" value={ackId}
                        onChange={e => { setAckId(e.target.value); setAckError('') }}
                        placeholder="Enter your Employee ID"
                        style={{ ...inputStyle }}
                      />
                    </div>
                  </div>
                  {ackError && (
                    <div style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{ackError}</div>
                  )}
                </div>
              )}

              {/* Acknowledged confirmation */}
              {isLast && acknowledged && (
                <div style={{ marginTop: 24, borderTop: `0.5px solid ${C.border}`, paddingTop: 20, display: 'flex', alignItems: 'center', gap: 10, background: `${C.success}08`, borderRadius: 8, padding: 16, border: `0.5px solid ${C.success}40` }}>
                  <CheckCircle2 size={20} color={C.success} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Orientation acknowledged</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Your acknowledgement has been recorded. Thank you.</div>
                  </div>
                </div>
              )}
            </div>

            {/* section navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 }}>
              <button
                onClick={() => setSectionIdx(n => Math.max(0, n - 1))}
                disabled={sectionIdx === 0}
                style={{ ...secondaryBtn, opacity: sectionIdx === 0 ? 0.4 : 1 }}
              >
                <ArrowLeft size={14} /> Previous
              </button>
              {isLast ? (
                <button
                  onClick={acknowledge}
                  disabled={acknowledged || ackSubmitting}
                  style={{ ...primaryBtn, opacity: (acknowledged || ackSubmitting) ? 0.7 : 1, cursor: (acknowledged || ackSubmitting) ? 'default' : 'pointer', background: C.success }}
                >
                  <CheckCircle2 size={14} />
                  {ackSubmitting ? 'Saving…' : acknowledged ? 'Acknowledged' : 'Acknowledge & Complete'}
                </button>
              ) : (
                <button
                  onClick={() => setSectionIdx(n => Math.min(MANUAL_SECTIONS.length - 1, n + 1))}
                  style={{ ...primaryBtn }}
                >
                  Next <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderManualBlock(block: ManualBlock, key: number): ReactNode {
  switch (block.type) {
    case 'h3':
      return <h3 key={key} style={{ fontSize: 15, fontWeight: 700, color: C.primary, margin: '20px 0 8px', borderBottom: `0.5px solid ${C.border}`, paddingBottom: 6 }}>{block.text}</h3>
    case 'h4':
      return <h4 key={key} style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '14px 0 6px' }}>{block.text}</h4>
    case 'p':
      return <p key={key} style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: '8px 0' }}>{block.text}</p>
    case 'ul':
      return (
        <ul key={key} style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {block.items.map((item, i) => <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{item}</li>)}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {block.items.map((item, i) => <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{item}</li>)}
        </ol>
      )
    case 'quote': {
      const variants: Record<string, { bg: string; border: string; icon: string; color: string }> = {
        info: { bg: `${C.accent}10`, border: C.accent,   icon: 'ℹ', color: C.accent   },
        warn: { bg: `${C.warn}10`,   border: C.warn,     icon: '⚠', color: C.warn     },
        tip:  { bg: `${C.success}10`, border: C.success, icon: '✔', color: C.success  },
        star: { bg: `${C.gold}15`,   border: C.gold,     icon: '★', color: C.gold     },
      }
      const v = variants[block.variant ?? 'info'] ?? variants.info
      return (
        <div key={key} style={{ borderLeft: `3px solid ${v.border}`, background: v.bg, borderRadius: '0 8px 8px 0', padding: '12px 14px', margin: '12px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 14, color: v.color, flexShrink: 0, marginTop: 1 }}>{v.icon}</span>
          <span style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{block.text}</span>
        </div>
      )
    }
    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.primary, color: 'white' }}>
                {block.headers.map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? C.card : C.bg }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '9px 12px', borderBottom: `0.5px solid ${C.border}`, lineHeight: 1.5, verticalAlign: 'top' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
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
