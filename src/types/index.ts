export type UserRole = 'Admin' | 'HR' | 'DSP Staff' | 'DSP'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type PlanTier = 'starter' | 'professional' | 'enterprise'

export interface Tenant {
  id: string
  name: string
  subdomain: string
  plan_tier: PlanTier
  storage_type: string
  created_at: string
}

export interface Role {
  id: string
  tenant_id: string
  name: UserRole
  permissions: Record<string, unknown>
  is_system_role: boolean
}

export interface User {
  id: string
  tenant_id: string
  role_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: UserStatus
  mfa_enabled: boolean
  created_at: string
  role?: Role
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  action: string
  table_affected?: string
  record_id?: string
  ip_address?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ActivityItem {
  id: string
  type: 'timesheet' | 'case_note' | 'login' | 'document' | 'client'
  description: string
  user: string
  timestamp: string
}
