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
