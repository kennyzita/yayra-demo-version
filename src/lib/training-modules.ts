export interface Training {
  icon: string
  iconBg: string
  iconColor: string
  name: string
  meta: string
  pct: number
  barColor: string
  status: string
  statusBg: string
  statusColor: string
  tab: 'assess' | 'pdf' | null
  pdfUrl?: string
  externalUrl?: string
  dspStaffOnly?: boolean
  hideProgress?: boolean
  buttonLabel?: string
}

export const CDS_URL = 'https://login.elsevierperformancemanager.com/systemlogin.aspx?virtualname=EMBCenter'

export const ALL_TRAININGS: Training[] = [
  {
    icon: 'ti-clipboard-text', iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080',
    name: 'DSP Training Academy',
    meta: 'Reliance Care Services · Required · Embedded in portal',
    pct: 30, barColor: '#008080', status: 'In progress',
    statusBg: 'rgba(0,128,128,0.1)', statusColor: '#008080',
    tab: 'assess', dspStaffOnly: true,
  },
  {
    icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060',
    name: 'CDS training',
    meta: 'Completed Apr 2026 · No expiry',
    pct: 100, barColor: '#30B060', status: 'Complete',
    statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060',
    tab: null, externalUrl: CDS_URL,
    hideProgress: true, buttonLabel: 'Log into your CDS Portal',
  },
  {
    icon: 'ti-alert-triangle', iconBg: 'rgba(186,117,23,0.1)', iconColor: '#BA7517',
    name: "Danielle's Law compliance",
    meta: 'Required · Due May 20, 2026 · Mandatory annual',
    pct: 30, barColor: '#BA7517', status: 'Due soon',
    statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517',
    tab: 'pdf', pdfUrl: '/danielles-law.pdf',
    hideProgress: true,
  },
]

export function getVisibleTrainings(userRole: string): Training[] {
  return ALL_TRAININGS.filter(t => !t.dspStaffOnly || userRole === 'DSP Staff')
}
