'use client'

import { useState } from 'react'

type NoteType = 'Routine' | 'Medical Note' | 'Progress Note' | 'Incident' | 'Behavioral'

interface CaseNote {
  id: number
  clientName: string
  clientNumber: string
  note: string
  date: string
  time: string
  type: NoteType
  author: string
}

const SAMPLE_NOTES: CaseNote[] = [
  {
    id: 1,
    clientName: 'Johnson, Michael',
    clientNumber: '0031',
    note: 'Client participated in morning ADL routine without assistance. Mood was cooperative and engaged throughout. No behavioral incidents to report during 3-hour visit.',
    date: 'Apr 29, 2026',
    time: '9:00 AM',
    type: 'Routine',
    author: 'Maria Santos',
  },
  {
    id: 2,
    clientName: 'Williams, Teresa',
    clientNumber: '0019',
    note: 'Client reported mild discomfort in left knee. Companion activities adjusted to seated engagement. Family notified per care plan protocol. Follow-up recommended.',
    date: 'Apr 28, 2026',
    time: '2:30 PM',
    type: 'Medical Note',
    author: 'Kevin O\'Brien',
  },
  {
    id: 3,
    clientName: 'Davis, Robert',
    clientNumber: '0043',
    note: 'Completed community outing to local grocery store. Client demonstrated improved independence in selecting items. Minimal verbal prompting required — notable progress toward goal.',
    date: 'Apr 26, 2026',
    time: '11:00 AM',
    type: 'Progress Note',
    author: 'Amara Okafor',
  },
]

const TYPE_STYLES: Record<NoteType, { bg: string; color: string }> = {
  'Routine':      { bg: 'rgba(0,128,128,0.1)',   color: '#007a7a' },
  'Medical Note': { bg: 'rgba(217,119,6,0.12)',  color: '#b45309' },
  'Progress Note':{ bg: 'rgba(99,102,241,0.1)',  color: '#4f46e5' },
  'Incident':     { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  'Behavioral':   { bg: 'rgba(234,88,12,0.1)',   color: '#c2410c' },
}

const ALL_TYPES: NoteType[] = ['Routine', 'Medical Note', 'Progress Note', 'Incident', 'Behavioral']

export default function AdminCaseNotesPage() {
  const [notes] = useState<CaseNote[]>(SAMPLE_NOTES)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<NoteType | 'All'>('All')
  const [showNewNote, setShowNewNote] = useState(false)
  const [newNote, setNewNote] = useState({ clientName: '', clientNumber: '', note: '', type: 'Routine' as NoteType })

  const filtered = notes.filter(n => {
    const matchSearch = search === '' ||
      n.clientName.toLowerCase().includes(search.toLowerCase()) ||
      n.clientNumber.includes(search) ||
      n.note.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'All' || n.type === filterType
    return matchSearch && matchType
  })

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Case Notes</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Document client interactions and progress</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '0 12px', height: 34, width: 220 }}>
          <i className="ti ti-search" style={{ fontSize: 15, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search staff, clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#111', outline: 'none', width: '100%' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
            <i className="ti ti-bell" />
          </div>
          <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff' }} />
        </div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          AD
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', background: '#f5f4ef', minHeight: 'calc(100% - 56px)' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>Case Notes</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Document client progress, incidents, and service delivery</div>
          </div>
          <button
            onClick={() => setShowNewNote(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#008080', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            <i className="ti ti-plus" style={{ fontSize: 15 }} />
            New Note
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['All', ...ALL_TYPES] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t as NoteType | 'All')}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filterType === t ? '#008080' : '#fff',
                color: filterType === t ? '#fff' : '#6b7280',
                boxShadow: '0 0 0 0.5px #e5e7eb',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Notes list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <i className="ti ti-notes-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 14 }}>No case notes found</div>
            </div>
          ) : (
            filtered.map(n => {
              const badge = TYPE_STYLES[n.type]
              return (
                <div
                  key={n.id}
                  style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '20px 24px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 8 }}>
                    {n.clientName} — Client #{n.clientNumber}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                    {n.note}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{n.date} · {n.time}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.color }}>
                      {n.type}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
                      <i className="ti ti-user" style={{ fontSize: 12, marginRight: 4 }} />
                      {n.author}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* New Note modal */}
      {showNewNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 520, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>New Case Note</div>
              <button onClick={() => setShowNewNote(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Client name</label>
                  <input
                    value={newNote.clientName}
                    onChange={e => setNewNote(p => ({ ...p, clientName: e.target.value }))}
                    placeholder="e.g. Johnson, Michael"
                    style={{ width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Client #</label>
                  <input
                    value={newNote.clientNumber}
                    onChange={e => setNewNote(p => ({ ...p, clientNumber: e.target.value }))}
                    placeholder="0031"
                    style={{ width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Note type</label>
                <select
                  value={newNote.type}
                  onChange={e => setNewNote(p => ({ ...p, type: e.target.value as NoteType }))}
                  style={{ width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', outline: 'none', background: '#fff', cursor: 'pointer' }}
                >
                  {ALL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Note</label>
                <textarea
                  value={newNote.note}
                  onChange={e => setNewNote(p => ({ ...p, note: e.target.value }))}
                  placeholder="Describe the client interaction, progress, or incident…"
                  rows={5}
                  style={{ width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#008080', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => setShowNewNote(false)}
              >
                Save Note
              </button>
              <button
                onClick={() => setShowNewNote(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
