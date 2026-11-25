import type { Ref } from 'react'
import { STATUS_FILTERS } from '../utils/status'
import type { StatusFilter as StatusFilterValue } from '../utils/types'

interface StatusFilterProps {
  value: StatusFilterValue
  counts: Record<StatusFilterValue, number>
  onChange: (value: StatusFilterValue) => void
  /** Lets the parent move focus here when the control a keyboard user was on disappears. */
  allButtonRef?: Ref<HTMLButtonElement>
}

export function StatusFilter({ value, counts, onChange, allButtonRef }: StatusFilterProps) {
  return (
    <div className="status-filter" role="group" aria-label="Filter payment links by status">
      {STATUS_FILTERS.map((filter) => {
        const pressed = filter === value
        const count = counts[filter]
        return (
          <button
            key={filter}
            ref={filter === 'All' ? allButtonRef : undefined}
            type="button"
            className="status-filter__button"
            aria-pressed={pressed}
            // Explicit name: visually-hidden text made Chrome announce "Active , 3 links" (stray space).
            aria-label={`${filter}, ${count} ${count === 1 ? 'link' : 'links'}`}
            onClick={() => onChange(filter)}
          >
            {filter}
            <span className="status-filter__count" aria-hidden="true">
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
