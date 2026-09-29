const arr = v => (Array.isArray(v) ? v : [])
const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v))

export const blankExperience = () => ({ company: '', title: '', location: '', start: '', end: '', bullets: [] })
export const blankEducation = () => ({ school: '', degree: '', field: '', start: '', end: '', details: [] })
export const blankProject = () => ({ name: '', description: '', bullets: [] })

export const emptyResume = () => ({
  contact: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
})

const entry = (blank, x, listKey) => {
  const base = blank()
  const out = {}
  for (const k of Object.keys(base)) out[k] = k === listKey ? arr(x?.[k]).map(str) : str(x?.[k])
  return out
}

// Makes AI or database output safe to render: every key exists with the right type.
export function normalizeResume(c) {
  const contact = c?.contact || {}
  return {
    contact: {
      name: str(contact.name), email: str(contact.email), phone: str(contact.phone),
      location: str(contact.location), links: arr(contact.links).map(str).filter(Boolean),
    },
    summary: str(c?.summary),
    experience: arr(c?.experience).map(x => entry(blankExperience, x, 'bullets')),
    education: arr(c?.education).map(x => entry(blankEducation, x, 'details')),
    skills: arr(c?.skills).map(str).filter(Boolean),
    projects: arr(c?.projects).map(x => entry(blankProject, x, 'bullets')),
  }
}

// Drops blank lines and empty entries before saving.
export function cleanResume(c) {
  const n = normalizeResume(c)
  const lines = a => a.map(s => s.trim()).filter(Boolean)
  const trimmed = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? lines(v) : v.trim()]))
  return {
    contact: { ...trimmed(n.contact), links: lines(n.contact.links) },
    summary: n.summary.trim(),
    experience: n.experience.map(trimmed).filter(x => x.company || x.title || x.bullets.length),
    education: n.education.map(trimmed).filter(x => x.school || x.degree),
    skills: lines(n.skills),
    projects: n.projects.map(trimmed).filter(x => x.name || x.description || x.bullets.length),
  }
}

// "Excel, SQL\nPower BI" -> ['Excel', 'SQL', 'Power BI']
export const splitSkills = text => text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)

export const dateRange = (start, end) => [start, end].filter(Boolean).join(' to ')

export const fileExtension = name => (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()

export const titleFromFileName = name => name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 100) || 'Imported resume'

// Match score band for color.
export const scoreBand = score => (score >= 75 ? 'strong' : score >= 50 ? 'fair' : 'weak')
