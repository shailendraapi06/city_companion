import { asString, asStringArray } from '../../lib/blockUtils'
import type { Block } from '../../types'

interface TableRendererProps {
  block: Block
}

export function TableRenderer({ block }: TableRendererProps) {
  const headers = asStringArray(block.headers)
  const rows = (
    Array.isArray(block.rows)
      ? block.rows.filter((row): row is (string | number)[] => Array.isArray(row))
      : []
  ).map((row) => row.map((cell) => String(cell)))

  if (headers.length === 0 && rows.length === 0) return null

  const title = asString(block.title)

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-bg-1">
      {title ? (
        <p className="border-b border-border bg-bg-2/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" aria-label={title ?? undefined}>
          {headers.length > 0 ? (
            <thead>
              <tr className="border-b border-border bg-bg-2/60">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="whitespace-nowrap px-3 py-2 text-text-secondary first:font-medium first:text-text-primary"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
