export default function PublicTrainingPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#004050', padding: '10px 20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>DSP Final Assessment — Reliance Care Services</span>
      </div>
      <iframe
        src="https://project--0aa69dd9-78c7-4a8a-b23f-9d4a9ffbf4c2.lovable.app/embed"
        style={{ flex: 1, border: 'none', display: 'block', width: '100%' }}
        allow="camera; microphone; clipboard-write"
        title="DSP Final Assessment"
      />
    </div>
  )
}
