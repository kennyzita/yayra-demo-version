// Pure client/server-safe utility — no server-only imports

export const APPLICATION_TO_EXPIRY_DOC_TYPE: Record<string, string> = {
  'cpr_cert':         'CPR Certificate',
  'cpr':              'CPR Certificate',
  'dl-front':         "Driver's License / Identification - Front",
  'dl-back':          "Driver's License / Identification - Back",
  'drivers_license':  "Driver's License / Identification - Front",
  'ead-front':        'EAD / Green card - Front',
  'ead-back':         'EAD / Green card - Back',
  'ead':              'EAD / Green card - Front',
  'cari':             'CARI Clearance',
  'background_check': 'Background Check',
  'identogo':         'IdentoGO',
}

// Sorted longest-first so "cpr_cert" matches before "cpr"
const APP_KEYS_SORTED = Object.keys(APPLICATION_TO_EXPIRY_DOC_TYPE).sort((a, b) => b.length - a.length)

export function docTypeFromAppFilename(fileName: string): string | null {
  for (const key of APP_KEYS_SORTED) {
    if (fileName.startsWith(key + '_') || fileName.startsWith(key + '.')) {
      return APPLICATION_TO_EXPIRY_DOC_TYPE[key]
    }
  }
  return null
}

// Maps front/back variants to a single canonical display label.
// Driver's License front & back count as one cert; same for EAD/Green card.
export const CERT_CANONICAL: Record<string, string> = {
  "Driver's License / Identification - Front": "Driver's License / Identification",
  "Driver's License / Identification - Back":  "Driver's License / Identification",
  "Driver's License - Front":                  "Driver's License / Identification",
  "Driver's License - Back":                   "Driver's License / Identification",
  "Driver's License":                          "Driver's License / Identification",
  "EAD / Green card - Front":                  "EAD / Green card",
  "EAD / Green card - Back":                   "EAD / Green card",
}

// Merges stored expiry dates, collapsing front/back variants into one entry.
// When two variants share a canonical name, keeps the earlier (more urgent) date.
export function mergeExpiryDates(storedExpiries: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const [certType, expiryStr] of Object.entries(storedExpiries)) {
    const canonical = CERT_CANONICAL[certType] ?? certType
    if (!merged[canonical]) {
      merged[canonical] = expiryStr
    } else {
      // Keep whichever expires sooner (lower value = more urgent)
      if (expiryStr < merged[canonical]) merged[canonical] = expiryStr
    }
  }
  return merged
}

