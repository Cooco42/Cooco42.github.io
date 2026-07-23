import { useNavigate } from 'react-router-dom'
import { BLACK_WHITE_TIPS, TIPS_SOURCE, TIPS_SOURCE_URL } from '@/data/tips'

export function TipsScreen() {
  const navigate = useNavigate()

  return (
    <div className="gs-screen tips-screen">
      <header className="gs-hero gs-hero--compact">
        <button type="button" className="gs-back" onClick={() => navigate('/')}>
          {'<<< Back'}
        </button>
        <h1 className="gs-hero__title">Tips</h1>
        <p className="gs-hero__meta">Black &amp; white solving techniques</p>
      </header>

      <div className="gs-panel tips-panel">
        <p className="gs-rule">Black-and-White Nonograms —</p>

        {BLACK_WHITE_TIPS.map((tip) => (
          <article key={tip.id} className="tip-card">
            <h2 className="tip-card__title">{tip.title}</h2>
            <p className="tip-card__body">{tip.body}</p>
            {tip.figures?.map((fig) => (
              <figure key={fig.src} className="tip-figure">
                <img
                  src={fig.src}
                  alt={fig.alt}
                  className="tip-figure__img"
                  loading="lazy"
                  decoding="async"
                />
                {fig.caption ? (
                  <figcaption className="tip-figure__caption">{fig.caption}</figcaption>
                ) : null}
              </figure>
            ))}
            {tip.notes?.length ? (
              <ul className="tip-notes">
                {tip.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}

        <footer className="tips-attribution">
          <p className="tips-attribution__label">Source &amp; credit</p>
          <p className="tips-attribution__body">{TIPS_SOURCE}</p>
          <a
            className="tips-attribution__link"
            href={TIPS_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            nonograms-katana.fandom.com — Tips for solving
          </a>
        </footer>
      </div>
    </div>
  )
}
