'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type ClientISP = {
  client_id: string
  client_name: string
  has_isp: boolean
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export default function MyIspDocsPage() {
  const supabase = createClient()
  const [clients,     setClients]     = useState<ClientISP[]>([])
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [toast,       setToast]       = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: assignments } = await supabase
        .from('assignments').select('client_id').eq('dsp_id', user.id)

      if (!assignments || assignments.length === 0) { setLoading(false); return }

      const clientIds = assignments.map((a: any) => a.client_id as string)

      const [{ data: clientsData }, { data: bcdData }] = await Promise.all([
        supabase.from('clients').select('id, full_name').in('id', clientIds),
        supabase.from('billing_client_data').select('client_id, data').in('client_id', clientIds),
      ])

      const bcdMap = new Map((bcdData ?? []).map((b: any) => [b.client_id, b.data]))
      const result: ClientISP[] = (clientsData ?? []).map((c: any) => ({
        client_id:   c.id,
        client_name: c.full_name as string,
        has_isp:     !!((bcdMap.get(c.id) as any)?.isp_doc_path),
      }))
      result.sort((a, b) => a.client_name.localeCompare(b.client_name))
      setClients(result)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDownload(clientId: string, clientName: string) {
    setDownloading(clientId)
    try {
      const res = await fetch(`/api/admin/client-isp-url?clientId=${clientId}`)
      const j   = await res.json()
      if (!res.ok) { showToast(j.error ?? 'Failed to get document'); return }
      const a = document.createElement('a')
      a.href = j.signedUrl; a.download = `ISP_${clientName.replace(/\s+/g, '_')}`
      a.target = '_blank'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch {
      showToast('Failed to download ISP document')
    } finally {
      setDownloading(null)
    }
  }

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: '#008080', color: '#fff', border: 'none', borderRadius: 7,
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>My ISP Documents</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>ISP documents uploaded by Admin for your assigned clients</div>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 700 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 10, animation: 'spin 1s linear infinite' }} />
            Loading clients…
          </div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <i className="ti ti-users" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No clients assigned yet</div>
            <div style={{ fontSize: 13 }}>Your administrator hasn't assigned any clients to you.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
              {['Client Name', 'ISP Document'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {clients.map((c, i) => (
              <div key={c.client_id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', padding: '14px 20px', borderBottom: i < clients.length - 1 ? '1px solid #f9fafb' : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {initials(c.client_name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.client_name}</span>
                </div>
                <div>
                  {c.has_isp ? (
                    <button
                      onClick={() => handleDownload(c.client_id, c.client_name)}
                      disabled={downloading === c.client_id}
                      style={{ ...btn, opacity: downloading === c.client_id ? 0.7 : 1, cursor: downloading === c.client_id ? 'not-allowed' : 'pointer' }}
                    >
                      <i className={`ti ${downloading === c.client_id ? 'ti-loader-2' : 'ti-download'}`}
                        style={downloading === c.client_id ? { animation: 'spin 1s linear infinite' } : {}} />
                      {downloading === c.client_id ? 'Downloading…' : 'Download ISP'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Not yet uploaded</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
