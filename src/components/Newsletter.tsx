import { useState } from 'react'
import type { FormEvent } from 'react'
import { CONTACT_EMAIL } from './Contact'

/**
 * ⚠️ Set this to your list provider's form endpoint (Buttondown, Mailchimp,
 * ConvertKit, Listmonk…) and adjust the request body to match what it expects.
 *
 * While it is empty the form reports that signup isn't connected rather than
 * showing a success message. That is deliberate: a fake confirmation would
 * leave people believing they had subscribed when no address was ever stored.
 */
const NEWSLETTER_ENDPOINT = ''

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!NEWSLETTER_ENDPOINT) {
      setStatus('error')
      setMessage(`Signup isn’t connected yet — email ${CONTACT_EMAIL} instead.`)
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch(NEWSLETTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error(`Signup failed: ${response.status}`)
      setStatus('success')
      setMessage('Thanks — check your inbox to confirm.')
      setEmail('')
    } catch {
      setStatus('error')
      setMessage(`Something went wrong. Try again, or email ${CONTACT_EMAIL}.`)
    }
  }

  return (
    <section id="newsletter" className="container newsletter">
      <div className="newsletter-inner" data-reveal>
        <h2 className="newsletter-title">Occasional dispatches</h2>
        <p className="newsletter-lede">
          What we’re building, what we’re learning, and the odd note on
          intent-based systems. No more than once a month.
        </p>

        <form className="newsletter-form" onSubmit={handleSubmit} noValidate={false}>
          <div className="field newsletter-field">
            <label htmlFor="newsletter-email">Email address</label>
            <input
              id="newsletter-email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
            <span className="btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </form>

        <p
          className={`newsletter-status is-${status}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </div>
    </section>
  )
}
