import { describe, expect, it } from 'vitest'
import { cleanResume, dateRange, emptyResume, fileExtension, normalizeResume, scoreBand, splitSkills, titleFromFileName } from './schema'

describe('normalizeResume', () => {
  it('fills every key for missing or malformed input', () => {
    expect(normalizeResume(undefined)).toEqual(emptyResume())
    expect(normalizeResume({ experience: 'nope', skills: null })).toEqual(emptyResume())
  })

  it('coerces entries and drops unknown keys', () => {
    const r = normalizeResume({
      experience: [{ company: 'Acme', title: 'Analyst', bullets: ['Did a thing', 42], extra: 'x' }],
      skills: ['Excel', '', 'SQL'],
    })
    expect(r.experience[0]).toEqual({ company: 'Acme', title: 'Analyst', location: '', start: '', end: '', bullets: ['Did a thing', '42'] })
    expect(r.skills).toEqual(['Excel', 'SQL'])
  })
})

describe('cleanResume', () => {
  it('trims text and drops blank lines and empty entries', () => {
    const r = cleanResume({
      summary: '  Hi  ',
      experience: [{ company: ' Acme ', bullets: ['One', '', '  '] }, { company: '', title: '', bullets: [''] }],
      education: [{ school: '', degree: '' }],
      projects: [{ name: '', description: '', bullets: [] }],
      skills: [' Excel ', ''],
    })
    expect(r.summary).toBe('Hi')
    expect(r.experience).toHaveLength(1)
    expect(r.experience[0].company).toBe('Acme')
    expect(r.experience[0].bullets).toEqual(['One'])
    expect(r.education).toEqual([])
    expect(r.projects).toEqual([])
    expect(r.skills).toEqual(['Excel'])
  })
})

describe('helpers', () => {
  it('splits skills on commas and new lines', () => {
    expect(splitSkills('Excel, SQL\nPower BI,, ')).toEqual(['Excel', 'SQL', 'Power BI'])
  })
  it('formats date ranges', () => {
    expect(dateRange('Jan 2024', 'Present')).toBe('Jan 2024 to Present')
    expect(dateRange('', '2020')).toBe('2020')
  })
  it('reads file extensions and titles', () => {
    expect(fileExtension('My Resume.PDF')).toBe('pdf')
    expect(fileExtension('noext')).toBe('')
    expect(titleFromFileName('nolan_marx-resume.docx')).toBe('nolan marx resume')
  })
  it('bands scores', () => {
    expect(scoreBand(80)).toBe('strong')
    expect(scoreBand(60)).toBe('fair')
    expect(scoreBand(10)).toBe('weak')
  })
})
