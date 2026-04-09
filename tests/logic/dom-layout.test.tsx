import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('dashboard DOM', () => {
  it('renders main tabs and switches visible panel', () => {
    render(<App />)

    expect(screen.getByTestId('panel-overview')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-route'))
    expect(screen.getByTestId('panel-route')).toBeInTheDocument()
    expect(screen.queryByTestId('panel-overview')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-assist'))
    expect(screen.getByTestId('panel-assist')).toBeInTheDocument()
  })

  it('chat input and send button are available on attendee assist', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('tab-assist'))

    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.getByTestId('chat-send')).toBeInTheDocument()
  })
})
