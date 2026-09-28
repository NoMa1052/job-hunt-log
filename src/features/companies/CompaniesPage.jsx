import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { safeUrl } from '../../lib/url'
import { sameCompany } from '../../lib/match'
import { toCSV, downloadCSV, formatDate, formatDateTimeShort } from '../../lib/format'
import { Button, ConfirmDialog, Icon, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import PageHeader from '../../components/PageHeader'
import CompanyPanel from './CompanyPanel'

export default function CompaniesPage() {
  const { data, add, update, remove, reload } = useData()
  const companies = data.companies.rows
  const companyNotes = data.companyNotes.rows
  const applications = data.applications.rows

  const [confirmId, setConfirmId] = useState(null)

  // The open company lives in the URL, so reload, back and shared links work.
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const openCompany = id => navigate({ pathname: id ? `/app/companies/${id}` : '/app/companies', search })

  async function addCompany() {
    const row = await add('companies', { company: '', careers_link: '' })
    if (row) openCompany(row.id)
  }

  const updateCompany = (id, field, value) => update('companies', id, field, value)
  const notesFor = companyId => companyNotes.filter(n => n.company_id === companyId)
  const applicationsAt = companyName => applications.filter(a => sameCompany(a.company, companyName))
  const appliedCountFor = companyName => applicationsAt(companyName).length

  function exportCompanies() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'careers_link', label: 'Careers Link' },
      { key: 'applied_count', label: 'Applied Count', value: r => appliedCountFor(r.company) },
      { key: 'last_clicked', label: 'Last Clicked', value: r => r.last_clicked || '' },
      { key: 'notes', label: 'Notes', value: r => notesFor(r.id).slice().reverse().map(n => `${formatDate(n.created_at)}: ${n.note}`).join(' | ') }
    ]
    downloadCSV('companies.csv', toCSV(headers, companies))
  }

  const openedCompany = companyId ? companies.find(c => c.id === companyId) : null
  const peopleAt = companyName => data.people.rows
    .filter(p => sameCompany(p.company, companyName))
    .map(p => ({ ...p, talks: data.entries.rows.filter(e => e.person_id === p.id).length }))

  // A link to a company that doesn't exist (deleted, or someone else's) falls
  // back to the list once the data has loaded.
  useEffect(() => {
    if (companyId && data.companies.status === 'ready' && !openedCompany) navigate({ pathname: '/app/companies', search }, { replace: true })
  }, [companyId, openedCompany, data.companies.status, navigate, search])

  return (
    <section aria-label="Companies">
      <PageHeader
        title="Companies"
        actions={<>
          <Button variant="ghost" icon="download" onClick={exportCompanies}>Export</Button>
          <Button variant="primary" icon="plus" onClick={addCompany}>Add company</Button>
        </>}
      />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Careers link</th>
              <th scope="col" className="center">Applied</th>
              <th scope="col">Last clicked</th>
              <th scope="col">Notes</th>
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const noteCount = notesFor(c.id).length
              const href = safeUrl(c.careers_link)
              return (
                <tr
                  key={c.id}
                  className="row-link"
                  tabIndex={0}
                  aria-selected={companyId === c.id}
                  aria-label={`${c.company || 'Unnamed company'}: open details`}
                  onClick={e => { if (!e.target.closest('a, button')) openCompany(c.id) }}
                  onKeyDown={e => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCompany(c.id) }
                  }}
                >
                  <td className="sk-cell-company">{c.company || <span className="cell-placeholder">Unnamed</span>}</td>
                  <td>
                    {href ? (
                      <a className="sk-cell-link cell-link" href={href} target="_blank" rel="noopener noreferrer" onClick={() => updateCompany(c.id, 'last_clicked', new Date().toISOString())}>
                        {new URL(href).hostname.replace(/^www\./, '')}
                        <Icon name="external-link" size={14} />
                      </a>
                    ) : <span className="sk-cell-meta">—</span>}
                  </td>
                  <td className="sk-cell-meta center">{appliedCountFor(c.company)}</td>
                  <td className="sk-cell-meta">{formatDateTimeShort(c.last_clicked)}</td>
                  <td className="sk-cell-meta">{noteCount > 0 ? `${noteCount} note${noteCount > 1 ? 's' : ''}` : '—'}</td>
                  <td className="col-actions"><IconButton icon="x" size="sm" label="Delete company" onClick={() => setConfirmId(c.id)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <CollectionState state={data.companies} onRetry={() => { reload('companies'); reload('companyNotes') }}>
          {companies.length === 0 && <div className="empty-state">No companies logged yet. Add one above.</div>}
        </CollectionState>
      </div>

      {openedCompany && (
        <CompanyPanel
          key={openedCompany.id}
          company={openedCompany}
          notes={notesFor(openedCompany.id)}
          applications={applicationsAt(openedCompany.company)}
          people={peopleAt(openedCompany.company)}
          onUpdate={(field, value) => updateCompany(openedCompany.id, field, value)}
          onAddNote={note => add('companyNotes', { company_id: openedCompany.id, note })}
          onOpenApplication={id => navigate(`/app/applications/${id}`)}
          onOpenPerson={id => navigate(`/app/conversations/${id}`)}
          onClose={() => openCompany(null)}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this? This can't be undone."
          onConfirm={() => { remove('companies', confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </section>
  )
}
