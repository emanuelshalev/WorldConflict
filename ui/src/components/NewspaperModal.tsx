import { useGameStore, type NewspaperEntry } from '../store/gameStore';

const CATEGORY_STYLES: Record<string, { color: string; label: string }> = {
  WAR: { color: '#ff4040', label: 'WAR' },
  GOVERNMENT: { color: '#9b59d0', label: 'GOVERNMENT' },
  NUCLEAR: { color: '#e8b932', label: 'NUCLEAR' },
  ECONOMY: { color: '#3fbf6f', label: 'ECONOMY' },
  COVERT: { color: '#8a8f9c', label: 'COVERT' },
  DIPLOMACY: { color: '#2a6dd9', label: 'DIPLOMACY' },
};

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? { color: '#8a8f9c', label: category || 'WORLD' };
  return (
    <span
      style={{
        display: 'inline-block',
        background: style.color,
        color: '#0e1118',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        padding: '2px 8px',
        borderRadius: 3,
        marginBottom: 6,
      }}
    >
      {style.label}
    </span>
  );
}

function Article({ entry, lead }: { entry: NewspaperEntry; lead?: boolean }) {
  return (
    <article
      style={{
        borderBottom: '1px solid #c9c2b2',
        paddingBottom: 14,
        marginBottom: 14,
      }}
    >
      <CategoryBadge category={entry.category} />
      <h2
        style={{
          margin: '0 0 8px',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: lead ? 30 : 18,
          lineHeight: 1.15,
          color: '#16130c',
        }}
      >
        {entry.headline}
      </h2>
      <p
        style={{
          margin: 0,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: lead ? 15 : 13,
          lineHeight: 1.5,
          color: '#2e2a20',
        }}
      >
        {entry.description}
      </p>
      {entry.relatedCountries.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#6f6856', fontStyle: 'italic' }}>
          Dateline: {entry.relatedCountries.join(' · ')}
        </div>
      )}
    </article>
  );
}

export function NewspaperModal() {
  const { activeModal, closeModal, worldState } = useGameStore();

  if (activeModal !== 'newspaper' || !worldState) return null;

  const entries = worldState.newspaper ?? [];
  const [leadStory, ...rest] = entries;

  const handleContinue = () => {
    closeModal();
    useGameStore.getState().setPhase('briefing');
  };

  return (
    <div className="modal-overlay" onClick={handleContinue}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#efe9d9',
          color: '#16130c',
          width: 'min(860px, 94vw)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Masthead */}
        <div
          style={{
            padding: '18px 28px 10px',
            textAlign: 'center',
            borderBottom: '3px double #16130c',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#6f6856' }}>★ ★ ★</div>
          <h1
            style={{
              margin: '2px 0',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 900,
              fontSize: 40,
              letterSpacing: 2,
            }}
          >
            THE WORLD CHRONICLE
          </h1>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#4a4435',
              borderTop: '1px solid #16130c',
              marginTop: 6,
              paddingTop: 4,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            <span>{worldState.date}</span>
            <span>Turn {worldState.turn} Edition</span>
            <span>All the news that shapes nations</span>
          </div>
        </div>

        {/* Front page */}
        <div style={{ padding: '18px 28px', overflowY: 'auto', flex: 1 }}>
          {leadStory ? (
            <>
              <Article entry={leadStory} lead />
              {rest.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: rest.length > 1 ? '1fr 1fr' : '1fr',
                    gap: '0 24px',
                  }}
                >
                  {rest.map((entry, i) => (
                    <Article key={i} entry={entry} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <Article
              lead
              entry={{
                headline: 'A Quiet Month in World Affairs',
                description:
                  'In a rare moment of calm, the international community enjoys a period of relative stability. Diplomats express cautious optimism while remaining vigilant.',
                relatedCountries: [],
                turn: worldState.turn,
                category: 'DIPLOMACY',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: '1px solid #c9c2b2',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#e7e0cd',
          }}
        >
          <button className="btn btn-primary" onClick={handleContinue}>
            Continue to briefing →
          </button>
        </div>
      </div>
    </div>
  );
}
