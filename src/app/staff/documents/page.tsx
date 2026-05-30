'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DOCUMENT_TYPES = [
  'W4',
  'NJ W4',
  'Form I-9',
  'Direct Deposit Form',
  'CRO Consent',
  "Driver's License - Front",
  "Driver's License - Back",
  'EAD / Green card - Front',
  'EAD / Green card - Back',
  'SSN Card',
  'CPR Certificate',
  "Danielle's Law Sign-off",
  "Stephen Komnino's Law",
  'Appendix A',
  'CARI Clearance',
  'Background Check',
  'IdentoGO',
  'Reference Letter',
  'Other',
]

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: 'ti-file-type-pdf', color: '#dc2626' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return { icon: 'ti-photo', color: '#0d9488' }
  if (['doc', 'docx'].includes(ext ?? '')) return { icon: 'ti-file-word', color: '#2563eb' }
  return { icon: 'ti-file', color: '#6b7280' }
}

function fmtSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' }
}

function formatDocName(folder: string, staffName: string, raw: string): string {
  const withoutPrefix = raw.replace(/^\d+_/, '')
  const withoutExt = withoutPrefix.replace(/\.[^.]+$/, '')
  const label = withoutExt || withoutPrefix
  return staffName ? `${folder} - ${staffName} - ${label}` : `${folder} - ${label}`
}

export default function StaffDocumentsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId,        setUserId]        = useState('')
  const [userName,      setUserName]      = useState('')
  const [docType,       setDocType]       = useState(DOCUMENT_TYPES[0])
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [files,         setFiles]         = useState<{ folder: string; name: string; path: string; size: number; createdAt: string; signedUrl: string }[]>([])
  const [loadingDocs,   setLoadingDocs]   = useState(false)
  const [dragOver,      setDragOver]      = useState(false)
  const [toast,         setToast]         = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('users').select('first_name, last_name').eq('id', user.id).single()
      setUserName([profile?.first_name, profile?.last_name].filter(Boolean).join(' '))
      loadDocs(user.id)
    }
    init()
  }, [])

  async function loadDocs(id: string) {
    setLoadingDocs(true)
    try {
      const res = await fetch(`/api/list-staff-documents?staffId=${encodeURIComponent(id)}`)
      const json = await res.json()
      setFiles(json.files ?? [])
    } catch {
      setFiles([])
    }
    setLoadingDocs(false)
  }

  async function handleUpload(file: File) {
    if (!userId || !file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    const form = new FormData()
    form.append('file', file)
    form.append('docType', docType)

    const res = await fetch('/api/upload-staff-document', { method: 'POST', body: form })
    const json = await res.json()

    setUploading(false)
    if (!res.ok) {
      setUploadError(json.error ?? 'Upload failed')
      return
    }
    setUploadSuccess(`"${file.name}" uploaded successfully.`)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await loadDocs(userId)
    setTimeout(() => setUploadSuccess(null), 4000)
  }

  // Group files by folder/docType
  const grouped = files.reduce<Record<string, typeof files>>((acc, f) => {
    ;(acc[f.folder] ??= []).push(f)
    return acc
  }, {})
  const docGroups = Object.entries(grouped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>My Documents</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Upload and view your documents on file</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f4f5f7' }}>

        {/* Upload card */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 24 }}>
          <div style={{ background: '#004050', padding: '12px 20px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Upload a Document</span>
          </div>

          <div style={{ padding: 24 }}>
            {/* Document type selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Document Type <span style={{ color: '#e24b4a' }}>*</span>
              </label>
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                >
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt} value={dt}>{dt}</option>
                  ))}
                </select>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#008080' : '#d1d5db'}`,
                borderRadius: 12, padding: '36px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'rgba(0,128,128,0.03)' : '#f9fafb',
                transition: 'all 0.15s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  <span style={{ fontSize: 14, color: '#008080', fontWeight: 500 }}>Uploading…</span>
                </div>
              ) : (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, color: '#008080' }}>
                    <i className="ti ti-cloud-upload" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 4 }}>Click to browse or drag & drop</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    PDF, Word, Images accepted · Uploading as <strong style={{ color: '#374151' }}>{docType}</strong>
                  </div>
                </>
              )}
            </div>

            {uploadError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" /> {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" /> {uploadSuccess}
              </div>
            )}
          </div>
        </div>

        {/* Documents on file */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#004050', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-folder-open" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Documents on file</span>
            {!loadingDocs && (
              <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }}>
                {files.length}
              </span>
            )}
          </div>

          {loadingDocs ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/>
              </svg>
              Loading documents…
            </div>
          ) : docGroups.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <i className="ti ti-folder" style={{ fontSize: 36, display: 'block', marginBottom: 12, color: '#d1d5db' }} />
              No documents on file yet. Upload your first document above.
            </div>
          ) : (
            docGroups.map(([folder, folderFiles]) => (
              <div key={folder}>
                <div style={{ padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-tag" style={{ fontSize: 13, color: '#008080' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{folder}</span>
                  <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(0,128,128,0.1)', color: '#008080', fontWeight: 600 }}>
                    {folderFiles.length}
                  </span>
                </div>
                {folderFiles.map(f => {
                  const fi = fileIcon(f.name)
                  return (
                    <div key={f.path} style={{ padding: '12px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: fi.color }}>
                        <i className={`ti ${fi.icon}`} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formatDocName(f.folder, userName, f.name)}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                          {[fmtSize(f.size), fmtDate(f.createdAt)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {f.signedUrl && (
                        <a
                          href={f.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500, whiteSpace: 'nowrap' }}
                        >
                          <i className="ti ti-external-link" style={{ fontSize: 13 }} /> View
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
