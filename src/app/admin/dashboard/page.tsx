import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import type { ActivityItem } from '@/types'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard — YayraCare Admin' }

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'timesheet', description: 'Submitted timesheet for week of May 12', user: 'Maria Rodriguez', timestamp: new Date().toISOString() },
  { id: '2', type: 'case_note', description: 'Case note added for Client #1042', user: 'James Wilson', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: '3', type: 'login', description: 'Logged in from new device', user: 'Sarah Chen', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '4', type: 'document', description: 'Uploaded CPR certification', user: 'David Park', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: '5', type: 'client', description: 'Client care plan updated', user: 'Maria Rodriguez', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
]

const MOCK_STAFF = [
  { id: '1', name: 'Maria Rodriguez', role: 'DSP Staff', lastAction: 'Submitted timesheet', time: '10 min ago', active: true },
  { id: '2', name: 'James Wilson', role: 'DSP', lastAction: 'Added case note', time: '32 min ago', active: true },
  { id: '3', name: 'Sarah Chen', role: 'DSP Staff', lastAction: 'Logged in', time: '2 hrs ago', active: true },
  { id: '4', name: 'David Park', role: 'DSP', lastAction: 'Uploaded document', time: '3 hrs ago', active: false },
  { id: '5', name: 'Lisa Thompson', role: 'DSP Staff', lastAction: 'Updated client record', time: 'Yesterday', active: false },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let firstName = 'Admin'
  if (session) {
    const { data: u } = await supabase
      .from('users').select('first_name').eq('id', session.user.id).single()
    firstName = u?.first_name ?? 'Admin'
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-1">{today} · Admin Dashboard</p>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#30B060] rounded-full" />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <MetricCard
          title="Active Clients"
          value={24}
          subtitle="2 new this month"
          trend={{ value: '8%', positive: true }}
          iconBg="bg-[#004050]/10"
          icon={
            <svg className="w-6 h-6 text-[#004050]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          action={{ label: 'View all clients', href: '/admin/clients' }}
        />
        <MetricCard
          title="DSP Staff"
          value={12}
          subtitle="All schedules covered"
          trend={{ value: '2 new', positive: true }}
          iconBg="bg-[#30B060]/10"
          icon={
            <svg className="w-6 h-6 text-[#30B060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          action={{ label: 'Manage staff', href: '/admin/staff' }}
        />
        <MetricCard
          title="Timesheets to Approve"
          value={7}
          subtitle="Oldest: 3 days ago"
          iconBg="bg-amber-50"
          icon={
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          action={{ label: 'Review timesheets', href: '/admin/timesheets' }}
        />
        <MetricCard
          title="Case Notes to Review"
          value={3}
          subtitle="Pending QA review"
          iconBg="bg-blue-50"
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          action={{ label: 'Review notes', href: '/admin/case-notes' }}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Staff table */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Staff Activity</h3>
            <Link href="/admin/staff" className="text-xs text-[#008080] hover:text-[#004050] font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Staff Member', 'Role', 'Last Action', 'Time', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_STAFF.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#008080]/10 flex items-center justify-center shrink-0">
                          <span className="text-[#008080] text-xs font-semibold">
                            {m.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{m.role}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{m.lastAction}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-400">{m.time}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${m.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={m.active ? 'text-green-700' : 'text-gray-400'}>
                          {m.active ? 'Active' : 'Offline'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <ActivityFeed activities={MOCK_ACTIVITIES} />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'New Client',
              href: '/admin/clients/new',
              color: 'text-[#004050]',
              bg: 'bg-[#004050]/5 hover:bg-[#004050]/10',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              ),
            },
            {
              label: 'Approve Timesheets',
              href: '/admin/timesheets',
              color: 'text-[#30B060]',
              bg: 'bg-[#30B060]/5 hover:bg-[#30B060]/10',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: 'Review Case Notes',
              href: '/admin/case-notes',
              color: 'text-blue-600',
              bg: 'bg-blue-50 hover:bg-blue-100',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              label: 'Assign / Update Roles',
              href: '/admin/staff',
              color: 'text-purple-600',
              bg: 'bg-purple-50 hover:bg-purple-100',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors ${a.bg}`}
            >
              <span className={a.color}>{a.icon}</span>
              <span className={`text-xs font-medium text-center ${a.color}`}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
