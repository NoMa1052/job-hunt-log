import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useTableViews from '../../state/useTableViews'
import { ALL_VIEW } from './ViewTabs'

// Everything a tab needs for saved views: the active view (in the URL as
// ?view=, so reload, back and shared links work), its config and the actions
// on it. Changes to a saved view save themselves; changes to the built-in
// "All" view last until you leave the page or save them as a view.
//
// fallbackDefaultId/fallbackLoading: Applications' default from the profile,
// used only until per-tab defaults are in the database.
export default function useViewState({ tableName, model, basePath, legacyToConfig, fallbackDefaultId = null, fallbackLoading = false }) {
  const tableViews = useTableViews(tableName, { legacyToConfig })
  const navigate = useNavigate()
  const { search } = useLocation()
  const [searchParams] = useSearchParams()
  const [allConfig, setAllConfig] = useState(model.DEFAULT_CONFIG)

  const defaultViewId = tableViews.perTabDefaults ? tableViews.defaultId : fallbackDefaultId
  const requested = searchParams.get('view') || defaultViewId || ALL_VIEW
  const activeView = tableViews.views.find(v => v.id === requested)
  const activeId = activeView ? activeView.id : ALL_VIEW
  const config = useMemo(() => model.normalizeConfig(activeView ? activeView.config : allConfig), [model, activeView, allConfig])

  const { saveConfig } = tableViews
  const setConfig = useCallback(patch => {
    const next = model.normalizeConfig({ ...config, ...patch })
    if (activeView) saveConfig(activeView.id, next)
    else setAllConfig(next)
  }, [model, config, activeView, saveConfig])

  function selectView(id) {
    const params = new URLSearchParams(search)
    // With a default view set, "All" has to be explicit.
    if (id === ALL_VIEW && !defaultViewId) params.delete('view'); else params.set('view', id)
    const qs = params.toString()
    navigate({ pathname: basePath, search: qs ? `?${qs}` : '' })
  }

  async function createView(name, fromConfig = config) {
    const row = await tableViews.create(name, fromConfig)
    if (row) { if (!activeView) setAllConfig(model.DEFAULT_CONFIG); selectView(row.id) }
  }

  const viewsUnavailable = tableViews.status === 'unavailable' || tableViews.status === 'error'
  return {
    tableViews,
    config,
    setConfig,
    activeView,
    activeId,
    defaultViewId,
    selectView,
    createView,
    duplicateView: v => createView(`${v.name} copy`.slice(0, 60), model.normalizeConfig(v.config)),
    deleteView: id => { tableViews.remove(id); if (id === activeId) selectView(ALL_VIEW) },
    reset: () => setConfig(model.DEFAULT_CONFIG),
    isDefaultLayout: model.sameConfig(config, model.DEFAULT_CONFIG),
    viewsUnavailable,
    // A link to a saved view (or a tab with a default view) waits for the
    // views to load instead of flashing the wrong layout first.
    waitingForView: (requested !== ALL_VIEW && tableViews.status === 'loading')
      || (!searchParams.get('view') && (tableViews.status === 'loading' || fallbackLoading)),
  }
}
