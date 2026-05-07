export function renderTemplate(str, vars = {}) {
  if (!str) return '';
  return String(str).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

export function deriveVars(lead) {
  const clinicName = lead?.clinicName || '';
  const contactName = lead?.contactName || '';
  const firstName = String(contactName).trim().split(/\s+/)[0] || '';
  return {
    ClinicName: clinicName,
    clinicName,
    FirstName: firstName,
    firstName,
    ContactName: contactName,
    contactName,
    Role: lead?.role || '',
    role: lead?.role || '',
    Website: lead?.website || '',
    website: lead?.website || '',
    City: lead?.city || '',
    city: lead?.city || '',
  };
}

