import { useState, type FC, type FormEvent } from 'react'
import type { CopilotMessage } from '../types'

interface CopilotChatProps {
  messages: CopilotMessage[]
  quickInsights: string
  suggestions: string[]
  onSend: (input: string) => void
}

export const CopilotChat: FC<CopilotChatProps> = ({
  messages,
  quickInsights,
  suggestions,
  onSend,
}) => {
  const [input, setInput] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <aside className="panel copilot" aria-label="AI attendee copilot">
      <div className="panel-heading">
        <h2>AI Attendee Copilot</h2>
        <p>{quickInsights}</p>
      </div>

      <div className="copilot-suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => onSend(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <div className="chat-stream">
        {messages.map((message) => (
          <article key={message.id} className={`chat-bubble ${message.role}`}>
            <strong>{message.role === 'assistant' ? 'Copilot' : 'You'}</strong>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask: fastest gate, best exit, least crowded restroom..."
          aria-label="Message CrowdPilot Copilot"
        />
        <button type="submit">Send</button>
      </form>
    </aside>
  )
}
