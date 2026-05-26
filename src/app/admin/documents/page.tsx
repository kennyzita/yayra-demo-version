'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DOCUMENT_TYPES = [
  'W4',
  'NJ W4',
  'Form I-9',
  'Direct Deposit Form',
  'CRO Consent',
  "Driver's License",
  'CPR Certificate',
  "Danielle's Law Sign-off",
  "Stephen Komnino's Law",
  'Appendix A',
  'CARI Clearance',
  'Background Check',
  'Reference Letter',
  'Other',
]

const BUCKET = 'staff-documents'

interface StaffUser {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface DocFile {
  name: string
  created_at: string
  metadata: { size: number; mimetype?: string } | null
  id: string
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: 'ti-file-type-pdf', color: '#dc2626' }
  if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return { icon: 'ti-photo', color: '#0d9488' }
  if (['doc','docx'].includes(ext ?? '')) return { icon: 'ti-file-word', color: '#2563eb' }
  return { icon: 'ti-file', color: '#6b7280' }
}

export default function AdminDocumentsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [staffList,     setStaffList]     = useState<StaffUser[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [docType,       setDocType]       = useState<string>(DOCUMENT_TYPES[0])
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [docs,          setDocs]          = useState<Record<string, DocFile[]>>({})
  const [loadingDocs,   setLoadingDocs]   = useState(false)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [dragOver,      setDragOver]      = useState(false)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, first_name, last_name, email, role:roles(name)')
      .order('first_name')
      .then(({ data }) => {
        const staff = (data ?? []).filter(u =>
          ['DSP', 'DSP Staff'].includes((u.role as unknown as { name: string } | null)?.name ?? '')
        )
        setStaffList(staff as StaffUser[])
      })
  }, [])

  useEffect(() => {
    if (!selectedStaff) return
    loadDocs(selectedStaff)
  }, [selectedStaff])

  async function loadDocs(staffId: string) {
    setLoadingDocs(true)
    const grouped: Record<string, DocFile[]> = {}
    await Promise.all(
      DOCUMENT_TYPES.map(async dt => {
        const folder = `${staffId}/${dt}`
        const { data } = await supabase.storage.from(BUCKET).list(folder, { sortBy: { column: 'created_at', order: 'desc' } })
        const files = (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')
        if (files.length > 0) {
          grouped[dt] = files as DocFile[]
        }
      })
    )
    setDocs(grouped)
    setLoadingDocs(false)
  }

  async function handleUpload(file: File) {
    if (!selectedStaff || !docType || !file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    const ext = file.name.split('.').pop()
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${selectedStaff}/${docType}/${safeName}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    setUploading(false)
    if (error) {
      setUploadError(error.message)
      return
    }
    setUploadSuccess(`"${file.name}" uploaded successfully.`)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await loadDocs(selectedStaff)
    setTimeout(() => setUploadSuccess(null), 4000)
  }

  async function handleDelete(dt: string, fileName: string) {
    if (!selectedStaff) return
    const path = `${selectedStaff}/${dt}/${fileName}`
    setDeleting(path)
    await supabase.storage.from(BUCKET).remove([path])
    setDeleting(null)
    await loadDocs(selectedStaff)
  }

  async function handleDownload(dt: string, fileName: string) {
    if (!selectedStaff) return
    const path = `${selectedStaff}/${dt}/${fileName}`
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const selectedUser = staffList.find(u => u.id === selectedStaff)
  const docGroups = Object.entries(docs)

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 860 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Upload Documents</h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>
        Upload and manage documents for staff members.
      </p>

      {/* Staff + document type selectors */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Staff Member <span style={{ color: '#e24b4a' }}>*</span>
            </label>
            <select
              value={selectedStaff}
              onChange={e => { setSelectedStaff(e.target.value); setDocs({}) }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', background: '#fff', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">— Select staff member —</option>
              {staffList.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Document Type <span style={{ color: '#e24b4a' }}>*</span>
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', background: '#fff', outline: 'none', cursor: 'pointer' }}
            >
              {DOCUMENT_TYPES.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleUpload(file)
          }}
          onClick={() => selectedStaff && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#008080' : selectedStaff ? '#d1d5db' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: selectedStaff ? 'pointer' : 'default',
            background: dragOver ? 'rgba(0,128,128,0.03)' : '#f9fafb',
            transition: 'all 0.15s',
            opacity: !selectedStaff ? 0.55 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
              <span style={{ fontSize: 14, color: '#008080', fontWeight: 500 }}>Uploading…</span>
            </div>
          ) : (
            <>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, color: '#008080' }}>
                <i className="ti ti-cloud-upload" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 4 }}>
                {selectedStaff ? 'Click to browse or drag & drop' : 'Select a staff member first'}
              </div>
              {selectedStaff && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  PDF, Word, Images accepted · Uploading as <strong style={{ color: '#374151' }}>{docType}</strong> for <strong style={{ color: '#374151' }}>{selectedUser?.first_name} {selectedUser?.last_name}</strong>
                </div>
              )}
            </>
          )}
        </div>

        {uploadError && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15 }} />
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 15 }} />
            {uploadSuccess}
          </div>
        )}
      </div>

      {/* Existing documents */}
      {selectedStaff && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-folder-open" style={{ fontSize: 18, color: '#008080' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>
              Documents for {selectedUser?.first_name} {selectedUser?.last_name}
            </span>
            {loadingDocs && <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</span>}
          </div>

          {!loadingDocs && docGroups.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <i className="ti ti-folder" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
              No documents uploaded yet for this staff member.
            </div>
          ) : (
            <div>
              {docGroups.map(([dt, files]) => (
                <div key={dt}>
                  <div style={{ padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-tag" style={{ fontSize: 13, color: '#008080' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dt}</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(0,128,128,0.1)', color: '#008080', fontWeight: 600 }}>
                      {files.length}
                    </span>
                  </div>
                  {files.map(f => {
                    const fi = fileIcon(f.name)
                    const isDeleting = deleting === `${selectedStaff}/${dt}/${f.name}`
                    return (
                      <div key={f.name} style={{ padding: '12px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: fi.color }}>
                          <i className={`ti ${fi.icon}`} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name.replace(/^\d+_/, '')}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                            {f.metadata?.size ? fmtSize(f.metadata.size) : ''}{f.created_at ? ` · ${fmtDate(f.created_at)}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(dt, f.name)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
                        >
                          <i className="ti ti-download" style={{ fontSize: 13 }} />
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(dt, f.name)}
                          disabled={isDeleting}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', fontSize: 12, color: '#dc2626', cursor: isDeleting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', opacity: isDeleting ? 0.6 : 1 }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                          {isDeleting ? '…' : 'Delete'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
