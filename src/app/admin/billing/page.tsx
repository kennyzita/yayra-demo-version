'use client'

export default function BillingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <iframe
        src="https://project--ff1ab626-898f-4754-8a79-9bae4f56b10c.lovable.app/admin/billing"
        style={{ width: '100%', flex: 1, border: 'none', display: 'block' }}
        allow="clipboard-write"
        title="Billing Management"
      />
    </div>
  )
}
