import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResponseRenderer } from './ResponseRenderer'
import {
  everyBlockTypePayload,
  mapOnlyPayload,
  markdownFeaturesPayload,
  rawHtmlPayload,
  unknownTypePayload,
  visualHierarchyPayload,
} from '../../test/mocks/aiResponses'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function assertFollows(previous: Element, next: Element) {
  expect(
    previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).not.toBe(0)
}

describe('ResponseRenderer', () => {
  it('renders nothing for an empty or missing block list', () => {
    const { container } = render(<ResponseRenderer blocks={[]} />)
    expect(container.textContent).toBe('')
  })

  it('renders every supported block type in the given order', () => {
    render(<ResponseRenderer blocks={everyBlockTypePayload} />)

    const h2 = screen.getByRole('heading', { level: 2, name: 'Evening plan: dinner + a walk' })
    const list = screen.getByText('Book Zostel').closest('ol') as HTMLElement
    const table = screen.getByRole('table', { name: 'Options compared' })
    const link = screen.getByRole('link', { name: 'City map (OpenStreetMap)' })
    const image = screen.getByRole('img', { name: 'Illustrative city image' })
    const place = screen.getAllByText('Zostel Koramangala')[0]
    const comparison = screen.getByRole('table', { name: 'Zostel vs Treebo' })
    const alert = screen.getByText('Good news')
    const actions = screen.getByText('What next?')

    expect(screen.queryByText('Map of the area')).toBeNull()

    const order = [h2, list, table, link, image, place, comparison, alert, actions]
    for (let index = 1; index < order.length; index += 1) {
      assertFollows(order[index - 1], order[index])
    }
  })

  it('renders the visual hierarchy (text → recommendation → text → alert)', () => {
    render(<ResponseRenderer blocks={visualHierarchyPayload} />)

    expect(screen.getByText(/best budget stays/i)).toBeInTheDocument()
    expect(screen.getByText('Top 3 picks by price + proximity')).toBeInTheDocument()
    expect(screen.getByText('Zostel Koramangala')).toBeInTheDocument()
    expect(screen.getByText('Treebo Trend JP Nagar')).toBeInTheDocument()
    expect(screen.getByText('Cozy PGs Indiranagar')).toBeInTheDocument()
    expect(screen.getByText('Zostel books out fast on weekends.')).toBeInTheDocument()
    expect(screen.getByText('Prices may change')).toBeInTheDocument()
  })

  it('renders full markdown: headings, emphasis, lists, tables, code and links', () => {
    render(<ResponseRenderer blocks={markdownFeaturesPayload} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument()
    expect(screen.getByText('bold', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('italic', { selector: 'em' })).toBeInTheDocument()
    expect(screen.getByText('strikethrough', { selector: 'del' })).toBeInTheDocument()
    expect(screen.getByText(/Blockquote:/)).toBeInTheDocument()
    expect(screen.getByText('Bullet list item one')).toBeInTheDocument()
    expect(screen.getByText('Numbered item one')).toBeInTheDocument()
    expect(screen.getByText('const city = "Bangalore"')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/relation/3639663',
    )
  })

  it('exposes a working Copy button on code blocks', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<ResponseRenderer blocks={markdownFeaturesPayload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('const city = "Bangalore"')
    await act(async () => {})
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('never injects raw HTML from untrusted content', () => {
    render(<ResponseRenderer blocks={rawHtmlPayload} />)

    expect(screen.queryByText('window.pwned = true')).toBeNull()
    expect(screen.queryByRole('img', { name: 'x' })).toBeNull()
  })

  it('skips unknown/future block types without crashing', () => {
    render(<ResponseRenderer blocks={unknownTypePayload} />)

    expect(screen.getByText('Still rendering after the unknown block.')).toBeInTheDocument()
  })

  it('renders nothing for the reserved (unwired) map block', () => {
    const { container } = render(<ResponseRenderer blocks={mapOnlyPayload} />)
    expect(container.textContent).toBe('')
  })

  it('renders recommendation rank chips and reason text', () => {
    render(<ResponseRenderer blocks={visualHierarchyPayload} />)

    const recommendation = screen.getByText('Top 3 picks by price + proximity').closest('section')
    expect(recommendation).not.toBeNull()
    expect(
      within(recommendation as HTMLElement).getByText('Best balance of price, rating and distance.'),
    ).toBeInTheDocument()
  })
})
