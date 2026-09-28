import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { sameCompany } from '../../lib/match'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatDate, formatDateTimeShort } from '../../lib/format'
import { Button, Icon, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import useDeleteConfirm from '../../components/useDeleteConfirm'
import PageHeader from '../../components/PageHeader'
import CustomizeMenu from '../views/CustomizeMenu'
import SortHeader from '../views/SortHeader'
import { ViewsBar } from '../views/ViewTabs'
import useViewState from '../views/useViewState'
import CompanyPanel from './CompanyPanel'
import { companiesModel, withCounts } from './columns'

const dash = <span aria-label="None">—</span>

export default function CompaniesPage() {
  const { data, add, update, reload } = useData()
  const companyNotes = data.companyNotes.rows
  const applications = data.applications.rows
  const companies = useMemo(
    () => withCounts(data.companies.rows, { applications, people: data.people.rows, notes: companyNotes }),
    [data.companies.rows, applications, data.people.rows, companyNotes],
  )
  const deletion = useDeleteConfirm()
  const views = useViewState({ tableName: 'companies', model: companiesModel, basePath: '/app/companies' })
  const { config, setConfig, waitingForView } = views

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
  const notesFor = id => companyNotes.filter(n => n.company_id === id)
  const askDelete = id => {
    const count = notesFor(id).length
    deletion.ask('companies', id, 'company', {
      extra: count ? ` Its ${count === 1 ? 'note' : `${count} notes`} will be deleted too. Applications and people aren't affected.` : " Applications and people aren't affected.",
      then: () => { if (id === companyId) openCompany(null) },
    })
  }
  const applicationsAt = name => applications.filter(a => sameCompany(a.company, name))
  const peopleAt = name => data.people.rows
    .filter(p => sameCompany(p.company, name))
    .map(p => ({ ...p, talks: data.entries.rows.filter(e => e.person_id === p.id).length }))

  const visibleColumns = config.columns.filter(c => c.visible).map(c => companiesModel.column(c.key))
  const shownCompanies = useMemo(() => companiesModel.applyView(companies, config), [companies, config])
  const openedCompany = companyId ? data.companies.rows.find(c => c.id === companyId) : null

  // A link to a company that doesn't exist (deleted, or someone else's) falls
  // back to the list once the data has loaded.
  useEffect(() => {
    if (companyId && data.companies.status === 'ready' && !openedCompany) navigate({ pathname: '/app/companies', search }, { replace: true })
  }, [companyId, openedCompany, data.companies.status, navigate, search])

  function exportCompanies() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'careers_link', label: 'Careers Link' },
      { key: 'applied', label: 'Applied Count' },
      { key: 'people', label: 'People' },
      { key: 'last_clicked', label: 'Last Clicked', value: r => r.last_clicked || '' },
      { key: 'notes', label: 'Notes', value: r => notesFor(r.id).slice().reverse().map(n => `${formatDate(n.created_at)}: ${n.note}`).join(' | ') }
    ]
    downloadCSV('companies.csv', toCSV(headers, shownCompanies))
  }

  function renderCell(col, c) {
    switch (col.key) {
      case 'company': return <td key="company" className="sk-cell-company">{c.company || <span className="cell-placeholder">Unnamed</span>}</td>
      case 'careers_link': {
        const href = safeUrl(c.careers_link)
        return (
          <td key="careers_link">
            {href ? (
              <a className="sk-cell-link cell-link" href={href} target="_blank" rel="noopener noreferrer" onClick={() => updateCompany(c.id, 'last_clicked', new Date().toISOString())}>
                {new URL(href).hostname.replace(/^www\./, '')}
                <Icon name="external-link" size={14} />
              </a>
            ) : <span className="sk-cell-meta">{dash}</span>}
          </td>
        )
      }
      case 'last_opened': return <td key={col.key} className="sk-cell-meta">{c.last_clicked ? formatDateTimeShort(c.last_clicked) : dash}</td>
      case 'notes': return <td key={col.key} className="sk-cell-meta center">{c.notes}</td>
      default: return <td key={col.key} className="sk-cell-meta center">{c[col.key]}</td>
    }
  }

  return (
    <section aria-label="Companies">
      <PageHeader
        title="Companies"
        actions={<>
          <Button variant="ghost" icon="download" onClick={exportCompanies}>Export</Button>
          <CustomizeMenu
            model={companiesModel}
            config={config}
            onChange={setConfig}
            onReset={views.reset}
            canReset={!views.isDefaultLayout}
            onSaveAs={views.viewsUnavailable ? null : name => views.createView(name)}
            noun="companies"
          />
          <Button variant="primary" icon="plus" onClick={addCompany}>Add company</Button>
        </>}
      />

      <ViewsBar state={views} allLabel="All companies" noun="companies" />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              {visibleColumns.map(col => <SortHeader key={col.key} col={col} sort={config.sort} onSort={sort => setConfig({ sort })} className={col.type === 'number' ? 'center' : undefined} />)}
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {!waitingForView && shownCompanies.map(c => (
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
                {visibleColumns.map(col => renderCell(col, c))}
                <td className="col-actions"><IconButton icon="x" size="sm" label="Delete company" onClick={() => askDelete(c.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <CollectionState state={waitingForView ? { status: 'loading', rows: [] } : data.companies} onRetry={() => { reload('companies'); reload('companyNotes') }}>
          {shownCompanies.length === 0 && (
            <div className="empty-state">
              {companies.length === 0 ? 'No companies logged yet. Add one above.' : (
                <>Nothing matches this view's filters. <Button variant="link" onClick={() => setConfig({ filters: [] })}>Clear filters</Button></>
              )}
            </div>
          )}
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
          onDeleteNote={id => deletion.ask('companyNotes', id, 'note')}
          onDelete={() => askDelete(openedCompany.id)}
          onClose={() => openCompany(null)}
        />
      )}
      {deletion.dialog}
    </section>
  )
}
