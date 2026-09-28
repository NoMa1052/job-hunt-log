import { useState } from 'react'
import { useData } from '../../state/DataProvider'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatDate, formatDateTimeShort } from '../../lib/format'
import { EditableCell } from '../../components/cells'
import CollectionState from '../../components/CollectionState'
import ConfirmDialog from '../../components/ConfirmDialog'
import CompanyNotesModal from './CompanyNotesModal'

export default function CompaniesPage() {
  const { data, add, update, remove, reload } = useData()
  const companies = data.companies.rows
  const companyNotes = data.companyNotes.rows
  const applications = data.applications.rows

  const [notesCompanyId, setNotesCompanyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const updateCompany = (id, field, value) => update('companies', id, field, value)
  const notesFor = companyId => companyNotes.filter(n => n.company_id === companyId)
  function appliedCountFor(companyName) {
    const target = (companyName || '').trim().toLowerCase()
    if (!target) return 0
    return applications.filter(a => (a.company || '').trim().toLowerCase() === target).length
  }

  function exportCompanies() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'careers_link', label: 'Careers Link' },
      { key: 'applied_count', label: 'Applied Count', value: r => appliedCountFor(r.company) },
      { key: 'last_clicked', label: 'Last Clicked', value: r => r.last_clicked || '' },
      { key: 'notes', label: 'Notes', value: r => notesFor(r.id).slice().reverse().map(n => `${formatDate(n.created_at)}: ${n.note}`).join(' | ') }
    ]
    downloadCSV('companies.csv', toCSV(headers, companies))
  }

  const notesCompany = notesCompanyId ? companies.find(c => c.id === notesCompanyId) : null

  return (
    <div className="panel">
      <div className="panel-head">
        <p>Places you're watching, researching, or were pointed toward.</p>
        <div className="panel-head-btns">
          <button className="add-btn secondary" onClick={exportCompanies}>Export CSV</button>
          <button className="add-btn" onClick={() => add('companies', { company: '', careers_link: '' })}>+ Add company</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 200 }}>Company</th>
              <th style={{ width: 220 }}>Careers link</th>
              <th style={{ width: 60 }}>Applied</th>
              <th style={{ width: 120 }}>Last clicked</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const noteCount = notesFor(c.id).length
              const href = safeUrl(c.careers_link)
              return (
                <tr key={c.id}>
                  <EditableCell value={c.company} placeholder="Company" onSave={v => updateCompany(c.id, 'company', v)} />
                  <td className="link-cell">
                    <div className="link-with-open">
                      <input type="url" placeholder="paste careers page link" defaultValue={c.careers_link || ''} onBlur={e => updateCompany(c.id, 'careers_link', e.target.value)} />
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" title="Open careers page" onClick={() => updateCompany(c.id, 'last_clicked', new Date().toISOString())}><i className="ti ti-external-link" /></a>
                      )}
                    </div>
                  </td>
                  <td className="num-col" style={{ textAlign: 'center' }}>{appliedCountFor(c.company)}</td>
                  <td className="num-col">{formatDateTimeShort(c.last_clicked)}</td>
                  <td>
                    <button className="notes-btn" onClick={() => setNotesCompanyId(c.id)}>
                      <i className="ti ti-notes" /> {noteCount > 0 ? `${noteCount} note${noteCount > 1 ? 's' : ''}` : 'Add note'}
                    </button>
                  </td>
                  <td><button className="del-btn" title="Delete row" onClick={() => setConfirmId(c.id)}>×</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <CollectionState state={data.companies} onRetry={() => { reload('companies'); reload('companyNotes') }}>
        {companies.length === 0 && <div className="empty-state">No companies logged yet. Add one above.</div>}
      </CollectionState>

      {notesCompany && (
        <CompanyNotesModal
          company={notesCompany}
          notes={notesFor(notesCompany.id)}
          onAddNote={note => add('companyNotes', { company_id: notesCompany.id, note })}
          onClose={() => setNotesCompanyId(null)}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this? This can't be undone."
          onConfirm={() => { remove('companies', confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
