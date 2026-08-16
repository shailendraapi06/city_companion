/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { AlertRenderer } from '../../components/renderer/AlertRenderer'
import { MarkdownRenderer } from '../../components/renderer/MarkdownRenderer'
import { TableRenderer } from '../../components/renderer/TableRenderer'
import { ComparisonTable } from '../../components/places/ComparisonTable'
import { PlaceActions } from '../../components/places/PlaceActions'
import { PlaceCard } from '../../components/places/PlaceCard'
import { RecommendationCard } from '../../components/places/RecommendationCard'
import { describe, expect, it } from 'vitest'
import { componentRegistry } from './componentRegistry'

const srcRoot = join(__dirname, '..', '..')

function listTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return listTsFiles(full)
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) return [full]
    return []
  })
}

describe('componentRegistry', () => {
  it('maps every supported block type to its renderer component', () => {
    expect(componentRegistry.text).toBe(MarkdownRenderer)
    expect(componentRegistry.heading).toBe(MarkdownRenderer)
    expect(componentRegistry.list).toBe(MarkdownRenderer)
    expect(componentRegistry.link).toBe(MarkdownRenderer)
    expect(componentRegistry.image).toBe(MarkdownRenderer)
    expect(componentRegistry.table).toBe(TableRenderer)
    expect(componentRegistry.place).toBe(PlaceCard)
    expect(componentRegistry.recommendation).toBe(RecommendationCard)
    expect(componentRegistry.comparison).toBe(ComparisonTable)
    expect(componentRegistry.action).toBe(PlaceActions)
    expect(componentRegistry.alert).toBe(AlertRenderer)
  })

  it('keeps the map registry slot reserved but unwired in MVP', () => {
    expect(componentRegistry.map).toBeUndefined()
  })

  it('does not use dangerouslySetInnerHTML anywhere in production src', () => {
    const offenders = listTsFiles(srcRoot).filter(
      (file) => !/\.test\.(ts|tsx)$/.test(file) && readFileSync(file, 'utf8').includes('dangerouslySetInnerHTML'),
    )
    expect(offenders.map((file) => relative(srcRoot, file))).toEqual([])
  })
})
