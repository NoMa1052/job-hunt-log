import { useState } from 'react'
import { useData } from '../../state/DataProvider'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatDate, formatDateTimeShort } from '../../lib/format'
import { Button, Card, ConfirmDialog, EditableCell, Icon, IconButton, Input } from '../../ui'
import CollectionState from '../../components/CollectionState'
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
    <Card as="section" aria-label="Companies">
      <div className="panel-head">
        <p className="panel-intro">Places you're watching, researching, or were pointed toward.</p>
        <div className="panel-actions">
          <Button icon="download" onClick={exportCompanies}>Export CSV</Button>
          <Button variant="primary" icon="plus" onClick={() => add('companies', { company: '', careers_link: '' })}>Add company</Button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Company</th>
              <th>Careers link</th>
              <th className="center">Applied</th>
              <th>Last clicked</th>
              <th>Notes</th>
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const noteCount = notesFor(c.id).length
              const href = safeUrl(c.careers_link)
              return (
                <tr key={c.id}>
                  <EditableCell value={c.company} placeholder="Company" onSave={v => updateCompany(c.id, 'company', v)} />
                  <td>
                    <div className="link-field">
                      <Input type="url" className="ui-input--sm" placeholder="paste careers page link" aria-label="Careers page link" defaultValue={c.careers_link || ''} onBlur={e => updateCompany(c.id, 'careers_link', e.target.value)} />
                      {href && (
                        <a className="icon-link" href={href} target="_blank" rel="noopener noreferrer" title="Open careers page" aria-label="Open careers page" onClick={() => updateCompany(c.id, 'last_clicked', new Date().toISOString())}><Icon name="external-link" /></a>
                      )}
                    </div>
                  </td>
                  <td className="num center">{appliedCountFor(c.company)}</td>
                  <td className="num">{formatDateTimeShort(c.last_clicked)}</td>
                  <td>
                    <Button size="sm" icon="notes" onClick={() => setNotesCompanyId(c.id)}>
                      {noteCount > 0 ? `${noteCount} note${noteCount > 1 ? 's' : ''}` : 'Add note'}
                    </Button>
                  </td>
                  <td className="col-actions"><IconButton icon="x" size="sm" label="Delete company" onClick={() => setConfirmId(c.id)} /></td>
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
    </Card>
  )
}
