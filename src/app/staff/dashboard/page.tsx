import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/MetricCard'
import Link from 'next/link'

export const metadata: Metadata = { title: 'My Dashboard — YayraCare' }

const MOCK_CLIENTS = [
  { id: '1', name: 'Robert Thompson', plan: 'Community Living', nextVisit: 'Today, 2:00 PM' },
  { id: '2', name: 'Angela Martinez', plan: 'Supported Employment', nextVisit: 'Tomorrow, 10:00 AM' },
  { id: '3', name: 'William Chen', plan: 'Residential Support', nextVisit: 'May 22, 9:00 AM' },
]

const MOCK_TIMESHEET = [
  { day: 'Monday', date: 'May 12', hours: 8, client: 'Robert Thompson', status: 'approved' },
  { day: 'Tuesday', date: 'May 13', hours: 7.5, client: 'Angela Martinez', status: 'approved' },
  { day: 'Wednesday', date: 'May 14', hours: 8, client: 'William Chen', status: 'pending' },
  { day: 'Thursday', date: 'May 15', hours: 6, client: 'Robert Thompson', status: 'pending' },
  { day: 'Friday', date: 'May 16', hours: 0, client: '—', status: 'not_logged' },
]

const MOCK_ONBOARDING = [
  { id: '1', task: 'Complete HIPAA training', dueDate: 'May 20', done: true },
  { id: '2', task: 'Upload CPR certification', dueDate: 'May 20', done: true },
  { id: '3', task: 'Sign agency policies', dueDate: 'May 22', done: false },
  { id: '4', task: 'Complete safety training module', dueDate: 'May 25', done: false },
  { id: '5', task: 'Submit background check documents', dueDate: 'May 30', done: false },
]

const MOCK_TRAINING = [
  { name: 'HIPAA Compliance', progress: 100, status: 'complete' },
  { name: 'First Aid & CPR', progress: 100, status: 'complete' },
  { name: 'Abuse Prevention', progress: 60, status: 'in_progress' },
  { name: 'Behavior Support', progress: 0, status: 'not_started' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const timesheetStatusStyle: Record<string, string> = {
  approved: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  not_logged: 'bg-gray-50 text-gray-400',
}

export default async function StaffDashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let firstName = 'there'
  if (session) {
    const { data: u } = await supabase
      .from('users').select('first_name').eq('id', session.user.id).single()
    firstName = u?.first_name ?? 'there'
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const totalHours = MOCK_TIMESHEET.reduce((s, e) => s + e.hours, 0)
  const doneCount = MOCK_ONBOARDING.filter((t) => t.done).length

  return (
    <div className="p-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#004050] to-[#008080] rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {firstName}!</h1>
            <p className="text-white/70 mt-1 text-sm">{today}</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {[
                { label: 'Next visit', value: 'Today, 2:00 PM' },
                { label: 'Client', value: 'Robert Thompson' },
                { label: 'Hours this week', value: `${totalHours} hrs` },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-xs text-white/60">{stat.label}</p>
                  <p className="text-sm font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/staff/timesheet" className="bg-[#30B060] hover:bg-[#28A050] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Log Hours
            </Link>
            <Link href="/staff/case-notes/new" className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Add Note
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <MetricCard
          title="My Assigned Clients"
          value={MOCK_CLIENTS.length}
          subtitle="All active"
          iconBg="bg-[#004050]/10"
          icon={
            <svg className="w-6 h-6 text-[#004050]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          action={{ label: 'View my clients', href: '/staff/clients' }}
        />
        <MetricCard
          title="Hours Logged This Week"
          value={`${totalHours} hrs`}
          subtitle="Goal: 40 hrs"
          trend={{ value: '1.5 hrs ahead', positive: true }}
          iconBg="bg-[#30B060]/10"
          icon={
            <svg className="w-6 h-6 text-[#30B060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          action={{ label: 'View timesheet', href: '/staff/timesheet' }}
        />
        <MetricCard
          title="Case Notes Submitted"
          value={8}
          subtitle="This week"
          iconBg="bg-blue-50"
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          action={{ label: 'View case notes', href: '/staff/case-notes' }}
        />
        <MetricCard
          title="Onboarding Items Due"
          value={MOCK_ONBOARDING.filter((t) => !t.done).length}
          subtitle={`${doneCount}/${MOCK_ONBOARDING.length} complete`}
          iconBg="bg-amber-50"
          icon={
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: clients + timesheet */}
        <div className="xl:col-span-2 space-y-6">
          {/* Clients */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">My Assigned Clients</h3>
              <Link href="/staff/clients" className="text-xs text-[#008080] hover:text-[#004050] font-medium">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {MOCK_CLIENTS.map((c) => (
                <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#004050]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#004050] text-sm font-semibold">
                        {c.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.plan}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-[#008080]">{c.nextVisit}</p>
                    <p className="text-xs text-gray-400">Next visit</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timesheet */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">This Week&apos;s Timesheet</h3>
              <Link href="/staff/timesheet" className="text-xs text-[#008080] hover:text-[#004050] font-medium">Full timesheet →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Day', 'Hours', 'Client', 'Status'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MOCK_TIMESHEET.map((e) => (
                    <tr key={e.day} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900">{e.day}</p>
                        <p className="text-xs text-gray-400">{e.date}</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{e.hours > 0 ? `${e.hours} hrs` : '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{e.client}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${timesheetStatusStyle[e.status]}`}>
                          {e.status === 'approved' ? 'Approved' : e.status === 'pending' ? 'Pending' : 'Not logged'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: onboarding + training + quick actions */}
        <div className="space-y-6">
          {/* Onboarding checklist */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Onboarding Checklist</h3>
                <span className="text-xs font-medium text-[#30B060]">{doneCount}/{MOCK_ONBOARDING.length}</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-[#30B060] rounded-full transition-all"
                  style={{ width: `${(doneCount / MOCK_ONBOARDING.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="px-6 py-3 space-y-2">
              {MOCK_ONBOARDING.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-1.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    item.done ? 'bg-[#30B060] border-[#30B060]' : 'border-gray-200'
                  }`}>
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.task}
                    </p>
                    {!item.done && <p className="text-xs text-gray-400">Due {item.dueDate}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">My Training</h3>
              <Link href="/staff/training" className="text-xs text-[#008080] hover:text-[#004050] font-medium">View all →</Link>
            </div>
            <div className="px-6 py-4 space-y-4">
              {MOCK_TRAINING.map((course) => (
                <div key={course.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-gray-700">{course.name}</p>
                    <span className={`text-xs font-medium ${
                      course.status === 'complete' ? 'text-green-600' :
                      course.status === 'in_progress' ? 'text-[#008080]' : 'text-gray-400'
                    }`}>{course.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        course.status === 'complete' ? 'bg-[#30B060]' :
                        course.status === 'in_progress' ? 'bg-[#008080]' : 'bg-gray-100'
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/staff/timesheet" className="flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-[#004050] text-white hover:bg-[#005068] transition-colors">
                Log Hours
              </Link>
              <Link href="/staff/case-notes/new" className="flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-[#30B060] text-white hover:bg-[#28A050] transition-colors">
                Add Case Note
              </Link>
              <Link href="/staff/documents/upload" className="flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-[#004050] text-[#004050] hover:bg-[#004050]/5 transition-colors">
                Upload Document
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
