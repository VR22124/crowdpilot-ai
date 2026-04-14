export function BrandAttribution() {
  return (
    <footer className="brand-attribution" aria-label="Platform attribution">
      <article className="brand-chip">
        <img src="/branding/firebase-badge.svg" alt="Firebase logo" loading="lazy" />
        <div>
          <p>Powered by Firebase Gemini</p>
          <small>Realtime platform by Firebase with Gemini AI responses.</small>
        </div>
      </article>

      <article className="brand-chip">
        <img src="/branding/firebase-badge.svg" alt="Firebase deployment logo" loading="lazy" />
        <div>
          <p>Deployed by Firebase</p>
          <small>Global hosting with secure edge delivery.</small>
        </div>
      </article>

      <article className="brand-chip">
        <img src="/branding/antigravity-badge.svg" alt="Google Antigravity logo" loading="lazy" />
        <div>
          <p>Developed using Antigravity</p>
          <small>Product engineering and AI experience framework.</small>
        </div>
      </article>
    </footer>
  )
}
