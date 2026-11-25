import { STATUS_FILTERS } from '../utils/status'
import type { StatusFilter as StatusFilterValue } from '../utils/types'

interface StatusFilterProps {
  value: StatusFilterValue
  counts: Record<StatusFilterValue, number>
  onChange: (value: StatusFilterValue) => void
}

export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  return (
    <div className="status-filter" role="group" aria-label="Filter payment links by status">
      {STATUS_FILTERS.map((filter) => {
        const pressed = filter === value
        return (
          <button
            key={filter}
            type="button"
            className="status-filter__button"
            aria-pressed={pressed}
            onClick={() => onChange(filter)}
          >
            {filter}
            <span className="status-filter__count" aria-hidden="true">
              {counts[filter]}
            </span>
            <span className="visually-hidden">, {counts[filter]} {counts[filter] === 1 ? 'link' : 'links'}</span>
          </button>
        )
      })}
    </div>
  )
}
