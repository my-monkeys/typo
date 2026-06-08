import { useState, useEffect } from 'react'

// Footer réseau My-Monkey : pioche /api/footer (liens cross-sites groupés par
// tags, stables sur la journée, cloisonnement 18+, UTM) et rend dans le style du
// site. Voir docs/footer-integration.md (repo o2switch-mcp).
const SITE = 'typo.my-monkey.fr'
const NET_LABELS = {
  daily: { fr: 'Jeux du jour', en: 'Daily games' },
  games: { fr: 'Jeux', en: 'Games' },
  tools: { fr: 'Outils', en: 'Tools' },
  maps: { fr: 'Cartes', en: 'Maps' },
}

export function MonkeyFooter({ lang = 'fr' }) {
  const isFr = lang === 'fr'
  const [net, setNet] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`https://git.my-monkey.fr/api/footer?site=${SITE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setNet(d) })
      .catch(() => {}) // API indispo → on garde juste la marque + contact
    return () => { alive = false }
  }, [])

  const label = (k, fb) => NET_LABELS[k]?.[isFr ? 'fr' : 'en'] ?? fb
  const link = { color: 'var(--text)', fontSize: '0.85rem', textDecoration: 'none' }
  const head = { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', margin: '0 0 0.7rem' }

  return (
    <footer className="mono" style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 1.5rem 1.25rem' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Bandeau marque */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <a href="https://my-monkey.fr" target="_blank" rel="noopener noreferrer" style={{ ...link, fontWeight: 700, fontSize: '1rem' }}>🐵 My-Monkey</a>
            <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', margin: '0.3rem 0 0' }}>
              {isFr ? "La galaxie de jeux & d'outils." : 'The galaxy of games & tools.'}
            </p>
          </div>
          <a href="https://my-monkey.fr/projets/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '0.45rem 0.8rem' }}>
            {isFr ? "Tout l'univers" : 'Explore all'} →
          </a>
        </div>

        {/* Colonnes réseau — max 4 naturellement (daily/games/tools/maps) */}
        {net?.columns?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
            {net.columns.map((c) => (
              <div key={c.key}>
                <h4 style={head}>{label(c.key, c.label)}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {c.links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={link}>{l.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Contact (= support / bug) → popup home My-Monkey, projet pré-sélectionné */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.75rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
          {isFr ? 'Une question, un bug ? ' : 'A question or a bug? '}
          <a href={`https://my-monkey.fr/?contact=open&project=${SITE}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            {isFr ? 'Nous contacter' : 'Contact us'}
          </a>
        </div>
      </div>
    </footer>
  )
}
