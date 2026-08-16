import { componentRegistry } from '../../lib/registry/componentRegistry'
import type { Block } from '../../types'

interface ResponseRendererProps {
  blocks: Block[]
}

/*
 * Walks `content[]` (API_Specification.md §5.1) and dispatches each block to
 * its registered component via the ComponentRegistry, in order. An unknown or
 * future block type is dropped silently (renders nothing) — never crashes the
 * whole message. `map` reaches this path too, since its registry slot is
 * reserved but intentionally unwired in MVP.
 */
export function ResponseRenderer({ blocks }: ResponseRendererProps) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const Component = componentRegistry[block.type]
        if (!Component) return null
        return <Component key={`${block.type}:${index}`} block={block} />
      })}
    </div>
  )
}
