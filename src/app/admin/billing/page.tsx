'use client'

import { useEffect } from 'react'

const BILLING_URL = 'https://project--ff1ab626-898f-4754-8a79-9bae4f56b10c.lovable.app/admin/billing'

export default function BillingPage() {
  useEffect(() => {
    window.location.replace(BILLING_URL)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#6b7280', fontSize: 14 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', color: '#008080' }}>
        <path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/>
        <path d="M21 12a9 9 0 00-9-9"/>
      </svg>
      Redirecting to Billing Management…
      <a href={BILLING_URL} style={{ fontSize: 12, color: '#008080', textDecoration: 'underline' }}>
        Click here if not redirected
      </a>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
