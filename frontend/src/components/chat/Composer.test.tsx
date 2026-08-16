import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Composer } from './Composer'

function Harness({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  return <Composer draft={draft} onDraftChange={setDraft} onSend={onSend} />
}

afterEach(cleanup)

describe('Composer (Phase 6D — §4.5)', () => {
  it('keeps send disabled while empty and enables it once text is typed', () => {
    render(<Harness onSend={vi.fn()} />)
    const textarea = screen.getByRole('textbox', { name: 'Message composer' })
    const send = screen.getByRole('button', { name: 'Send message' })
    expect(send).toBeDisabled()
    fireEvent.change(textarea, { target: { value: 'find me food' } })
    expect(send).toBeEnabled()
  })

  it('submits on Enter, clearing the input', () => {
    const onSend = vi.fn()
    render(<Harness onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: 'Message composer' })
    fireEvent.change(textarea, { target: { value: 'find me food' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('find me food')
    expect(textarea).toHaveValue('')
  })

  it('does not submit on Shift+Enter (newline instead)', () => {
    const onSend = vi.fn()
    render(<Harness onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: 'Message composer' })
    fireEvent.change(textarea, { target: { value: 'line one' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('renders inert voice and attachment placeholders for later phases', () => {
    render(<Harness onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Voice input/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Attach file/ })).toBeDisabled()
  })
})
