import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { FilterPopover, Logo, Modal, Select } from './index'

afterEach(cleanup)

describe('Modal', () => {
  it('saves the focused field before closing on Escape', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(
      <Modal title={<span>Title</span>} onClose={onClose}>
        <input aria-label="Company" onBlur={e => onSave(e.target.value)} />
      </Modal>
    )
    const input = screen.getByLabelText('Company')
    input.focus()
    fireEvent.change(input, { target: { value: 'Acme' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onSave).toHaveBeenCalledWith('Acme')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('is an accessible dialog with a close button', () => {
    const onClose = vi.fn()
    render(<Modal title={<span>Notes</span>} onClose={onClose}>body</Modal>)
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('FilterPopover', () => {
  function TextFilter() {
    const [value, setValue] = useState('')
    return <FilterPopover label="Company" value={value} onChange={setValue} />
  }

  it('opens, filters and shows an active marker', () => {
    render(<TextFilter />)
    const trigger = screen.getByRole('button', { name: 'Company' })
    fireEvent.click(trigger)
    fireEvent.change(screen.getByLabelText('Filter Company'), { target: { value: 'acme' } })
    expect(trigger.className).toContain('is-active')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('Filter Company')).toBeNull()
  })
})

describe('Select', () => {
  it('renders the current option tone as a pill', () => {
    const options = [{ value: 'offer', label: 'Offer', tone: 'green' }, { value: 'rejected', label: 'Rejected', tone: 'red' }]
    render(<Select pill options={options} value="offer" onChange={() => {}} aria-label="Status" />)
    expect(screen.getByLabelText('Status').className).toContain('ui-tone--green')
  })
})

describe('Logo', () => {
  it('uses the heavier favicon geometry at small sizes', () => {
    const { container, rerender } = render(<Logo variant="icon" size={16} wordmark="sidekick" />)
    expect(container.querySelector('path').getAttribute('stroke-width')).toBe('18')
    expect(container.querySelector('circle').getAttribute('r')).toBe('11')
    rerender(<Logo variant="icon" size={120} wordmark="sidekick" />)
    expect(container.querySelector('path').getAttribute('stroke-width')).toBe('16')
    expect(container.querySelector('circle').getAttribute('r')).toBe('10')
  })
})

describe('Field', () => {
  it('names the control by its label and describes it with the hint', async () => {
    const { Field, Input } = await import('./index')
    render(<Field label="New password" hint="At least 6 characters."><Input type="password" /></Field>)
    const input = screen.getByLabelText('New password', { exact: true })
    expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toBe('At least 6 characters.')
  })

  it('shows an error state with a how-to-fix message', async () => {
    const { Field, Input } = await import('./index')
    const { container } = render(<Field label="Confirm" error="Passwords don't match. Type the same password in both fields."><Input /></Field>)
    expect(container.querySelector('.sk-field--error')).not.toBeNull()
    expect(screen.getByLabelText('Confirm', { exact: true }).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toMatch(/Type the same password/)
  })
})
