'use client'

import { useState } from 'react'

const CLIENT_DATA: Record<string, { name: string; year: string; isp: string }> = {
  rj: { name: 'Robert Johnson', year: '2025–2026', isp: 'Robert will increase his participation in community activities and social events with support from his DSP, working toward greater independence and quality of life.' },
  am: { name: 'Angela Moore', year: '2025–2026', isp: 'Angela will increase her independence in activities of daily living, including personal hygiene, meal preparation, and household management with DSP support.' },
  tw: { name: 'Thomas Williams', year: '2025–2026', isp: 'Thomas will develop vocational skills and employment readiness, including job-specific tasks, workplace behavior, and community integration with DSP support.' },
}

const STRATEGIES = [
  { title: 'Assistance with Activities of Daily Living', desc: 'Getting dressed, eating, personal hygiene, etc.' },
  { title: 'Assistance with Increasing Community Participation', desc: 'Daily errands, attending events, restaurant, purchasing items, travel training, etc.' },
  { title: 'Assistance with Increasing Independence', desc: 'Laundry, cooking, cleaning, dressing, grocery shopping, paying for items, etc.' },
  { title: 'Assistance with On-The-Job Support', desc: 'Safety awareness, restroom use, attending to task, lunch/breaks, etc.' },
  { title: 'Assistance with Learning Activities', desc: 'Basic tutoring – math, reading, writing; support attending a class; etc.' },
  { title: 'Assistance with Socialization', desc: 'Conversation skills, peer interaction, community events, clubs, etc.' },
  { title: 'Assistance with Health & Wellness', desc: 'Medical appointments, exercise, nutrition, medication reminders, etc.' },
  { title: 'Assistance with Transportation', desc: 'Travel training, bus routes, ride scheduling, safety in transit, etc.' },
]

const WEEKS = [
  'May 10, 2026 – May 16, 2026',
  'May 17, 2026 – May 23, 2026',
  'May 24, 2026 – May 30, 2026',
  'May 3, 2026 – May 9, 2026',
  'Apr 26, 2026 – May 2, 2026',
]

interface Entry { id: number; date: string; start: string; end: string; strategy: string; desc: string }

export default function CaseNotesPage() {
  const [client, setClient] = useState('')
  const [week, setWeek] = useState(WEEKS[0])
  const [checked, setChecked] = useState<boolean[]>(new Array(STRATEGIES.length).fill(false))
  const [entries, setEntries] = useState<Entry[]>([{ id: 1, date: '', start: '', end: '', strategy: '', desc: '' }])
  const [toast, setToast] = useState('')
  const [clientLoaded, setClientLoaded] = useState(false)
  let nextId = entries.length + 1

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function loadClient(val: string) {
    setClient(val)
    setClientLoaded(!!val)
    if (val) showToast('Client loaded')
  }

  function toggleStrategy(i: number) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function checkAll() {
    setChecked(new Array(STRATEGIES.length).fill(true))
    showToast('All strategies checked')
  }

  function addEntry() {
    setEntries(prev => [...prev, { id: nextId++, date: '', start: '', end: '', strategy: '', desc: '' }])
  }

  function removeEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function updateEntry(id: number, field: keyof Entry, val: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  function doSubmit() {
    if (!client) { showToast('Please select a client first'); return }
    if (entries.length === 0) { showToast('Please add at least one entry'); return }
    showToast('Submitted & saved PDF to Google Drive ✓')
  }

  function clearForm() {
    setClient(''); setClientLoaded(false)
    setChecked(new Array(STRATEGIES.length).fill(false))
    setEntries([{ id: 1, date: '', start: '', end: '', strategy: '', desc: '' }])
    showToast('Form cleared')
  }

  const cd = client ? CLIENT_DATA[client] : null

  const sectionStyle: React.CSSProperties = { border: '1px solid #d8dde6', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
  const sectionHead: React.CSSProperties = { background: '#004050', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const sectionBody: React.CSSProperties = { background: 'white', padding: 20 }
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 7 }
  const inputStyle: React.CSSProperties = { width: '100%', fontSize: 14, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', outline: 'none', fontFamily: 'inherit' }
  const readOnly: React.CSSProperties = { width: '100%', fontSize: 14, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f5f7' }}>
      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Community-Based Supports Log</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => showToast('Opening history...')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-history" /> View history
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Client Information */}
        <div style={sectionStyle}>
          <div style={sectionHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Client Information</span>
            {clientLoaded && <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>✓ Loaded</span>}
          </div>
          <div style={sectionBody}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...fieldLabel }}>Select client <span style={{ color: '#e24b4a' }}>*</span></div>
              <div style={{ position: 'relative' }}>
                <select value={client} onChange={e => loadClient(e.target.value)} style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}>
                  <option value="">— Select your assigned client —</option>
                  <option value="rj">Robert Johnson</option>
                  <option value="am">Angela Moore</option>
                  <option value="tw">Thomas Williams</option>
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...fieldLabel }}>Client name <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
              <input readOnly value={cd?.name ?? ''} placeholder="Select a client above" style={readOnly} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...fieldLabel }}>Service plan year <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
              <input readOnly value={cd?.year ?? ''} style={readOnly} />
            </div>
            <div>
              <div style={{ ...fieldLabel }}>ISP outcome <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
              <textarea readOnly value={cd?.isp ?? ''} placeholder="Select a client to populate" style={{ ...readOnly, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>
        </div>

        {/* Service Week */}
        <div style={sectionStyle}>
          <div style={sectionHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Service Week</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Sunday – Saturday</span>
          </div>
          <div style={sectionBody}>
            <div style={{ marginBottom: 7, ...fieldLabel }}>Select service week <span style={{ color: '#e24b4a' }}>*</span></div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <select value={week} onChange={e => setWeek(e.target.value)} style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}>
                {WEEKS.map(w => <option key={w}>{w}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
            </div>
            <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '13px 16px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#004050', marginTop: 10 }}>{week}</div>
          </div>
        </div>

        {/* Service Strategies */}
        <div style={sectionStyle}>
          <div style={sectionHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Service Strategies</span>
            <button onClick={checkAll} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Check all rendered</button>
          </div>
          <div style={{ ...sectionBody, padding: '4px 20px' }}>
            {STRATEGIES.map((s, i) => (
              <div key={i} onClick={() => toggleStrategy(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 4px', borderBottom: i < STRATEGIES.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 22, height: 22, border: checked[i] ? 'none' : '2px solid #d1d5db', borderRadius: 5, flexShrink: 0, marginTop: 2, background: checked[i] ? '#004050' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
                  {checked[i] && '✓'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#004050', marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity Log */}
        <div style={sectionStyle}>
          <div style={sectionHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Daily Activity Log</span>
          </div>
          <div style={{ ...sectionBody, padding: 16 }}>
            {entries.map((entry, i) => (
              <div key={entry.id} style={{ border: '1px solid #d1d5db', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ background: '#dce8f5', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#004050' }}>Entry #{i + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: '#555' }}>{entry.date ? new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}</span>
                    {entries.length > 1 && (
                      <button onClick={() => removeEntry(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#e24b4a', background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: '18px 16px', background: 'white' }}>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '0 0 200px' }}>
                      <div style={{ ...fieldLabel, marginBottom: 7 }}>Date <span style={{ color: '#e24b4a' }}>*</span></div>
                      <input type="date" value={entry.date} onChange={e => updateEntry(entry.id, 'date', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div style={{ flex: '0 0 155px' }}>
                      <div style={{ ...fieldLabel, marginBottom: 7 }}>Start time <span style={{ color: '#e24b4a' }}>*</span></div>
                      <input type="time" value={entry.start} onChange={e => updateEntry(entry.id, 'start', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div style={{ flex: '0 0 155px' }}>
                      <div style={{ ...fieldLabel, marginBottom: 7 }}>End time <span style={{ color: '#e24b4a' }}>*</span></div>
                      <input type="time" value={entry.end} onChange={e => updateEntry(entry.id, 'end', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ ...fieldLabel, marginBottom: 7 }}>Service strategy <span style={{ color: '#e24b4a' }}>*</span></div>
                    <div style={{ position: 'relative' }}>
                      <select value={entry.strategy} onChange={e => updateEntry(entry.id, 'strategy', e.target.value)} style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}>
                        <option value="">— Select Strategy —</option>
                        {STRATEGIES.map(s => <option key={s.title}>{s.title}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: 7 }}>Activity description <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>⊘ auto-saved as you type</span></div>
                    <textarea value={entry.desc} onChange={e => updateEntry(entry.id, 'desc', e.target.value)} placeholder="Describe the activity and how it supports the individual's outcome..." style={{ width: '100%', fontSize: 13, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', outline: 'none', resize: 'vertical', minHeight: 90, lineHeight: 1.6, fontFamily: 'inherit' }} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addEntry} style={{ width: '100%', padding: 18, border: '2.5px dashed #1a56db', borderRadius: 10, background: '#f0f5ff', color: '#004050', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              + Add Activity Entry
            </button>
          </div>
        </div>

        {/* Completed by */}
        <div style={sectionStyle}>
          <div style={sectionHead}><span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Completed By</span></div>
          <div style={sectionBody}>
            <div style={{ ...fieldLabel }}>Staff name <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
            <input readOnly value="Maria Santos" style={readOnly} />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={doSubmit} style={{ fontSize: 15, fontWeight: 700, padding: '16px 28px', borderRadius: 8, border: 'none', background: '#2d7d4e', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
            📄 Submit &amp; Save PDF to Google Drive
          </button>
          <button onClick={clearForm} style={{ fontSize: 14, fontWeight: 600, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', padding: '16px 20px', fontFamily: 'inherit' }}>
            Clear Form
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: 'white', fontSize: 13, padding: '10px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <span>✓</span><span>{toast}</span>
        </div>
      )}
    </div>
  )
}
