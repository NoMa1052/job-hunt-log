import { Icon } from '../../ui'
import { nextSort } from './model'

// A column header that sorts on click: ascending, descending, then off.
export default function SortHeader({ col, sort, onSort, className }) {
  const dir = sort?.key === col.key ? sort.dir : null
  return (
    <th scope="col" className={className} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
      <button type="button" className={`sort-btn ${dir ? 'is-sorted' : ''}`.trim()} onClick={() => onSort(nextSort(sort, col.key))}>
        {col.label}
        <span className="sort-icon" aria-hidden="true">{dir ? <Icon name={dir === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} /> : null}</span>
      </button>
    </th>
  )
}
