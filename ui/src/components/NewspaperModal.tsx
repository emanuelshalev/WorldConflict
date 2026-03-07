import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface NewspaperHeadline {
  headline: string;
  description?: string;
  content?: string;
  category?: string;
  relatedCountries?: string[];
  impact?: string;
  turn?: number;
}

// Generate expanded content for headlines
function generateExpandedContent(headline: NewspaperHeadline, worldState: any): {
  mainHeadline: string;
  subHeadline: string;
  leadParagraph: string;
  bodyText: string;
  sidebar?: string;
} {
  const title = headline.headline || 'Breaking News';
  const desc = headline.description || headline.content || '';
  const countries = headline.relatedCountries || [];
  const impact = headline.impact || '';
  
  // Generate a compelling sub-headline
  let subHeadline = '';
  if (title.includes('WAR') || title.includes('Declares War')) {
    subHeadline = 'International community calls for emergency UN session as tensions escalate';
  } else if (title.includes('ALLIANCE') || title.includes('Pact')) {
    subHeadline = 'Historic agreement reshapes regional power dynamics';
  } else if (title.includes('PEACE') || title.includes('Ceasefire')) {
    subHeadline = 'Diplomatic breakthrough brings hope for lasting stability';
  } else if (title.includes('Economy') || title.includes('GDP')) {
    subHeadline = 'Markets react as economic indicators shift global outlook';
  } else if (title.includes('Stability') || title.includes('Unrest')) {
    subHeadline = 'Government faces mounting pressure amid domestic challenges';
  } else {
    subHeadline = 'Analysts weigh in on implications for global affairs';
  }

  // Generate lead paragraph
  const leadParagraph = desc || `In a significant development that has captured international attention, ${
    countries.length > 0 ? countries.join(' and ') : 'world leaders'
  } have made headlines with actions that could reshape the geopolitical landscape for years to come.`;

  // Generate body text with more detail
  let bodyText = '';
  if (impact) {
    bodyText = `According to our analysts, this development is expected to have the following effects: ${impact}. `;
  }
  bodyText += `Sources close to the situation indicate that this marks a pivotal moment in international relations. `;
  if (countries.length > 0) {
    bodyText += `Representatives from ${countries.join(', ')} have yet to issue formal statements, but diplomatic channels remain active. `;
  }
  bodyText += `Our correspondents on the ground report heightened activity as governments assess their strategic options. The full ramifications of these events will likely unfold over the coming weeks.`;

  // Generate sidebar info
  let sidebar = '';
  if (worldState) {
    sidebar = `Global Tension: ${worldState.globalTension}% | Active Conflicts: ${worldState.wars?.length || 0}`;
  }

  return {
    mainHeadline: title,
    subHeadline,
    leadParagraph,
    bodyText,
    sidebar,
  };
}

export function NewspaperModal() {
  const { activeModal, closeModal, worldState } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const headlines = (worldState?.newspaper ?? []) as NewspaperHeadline[];

  useEffect(() => {
    if (activeModal === 'newspaper') {
      setCurrentIndex(0);
    }
  }, [activeModal]);

  if (activeModal !== 'newspaper') return null;
  
  // If no headlines, show a default "quiet day" newspaper
  const hasHeadlines = headlines.length > 0;
  
  const currentHeadline = hasHeadlines ? headlines[currentIndex] : null;
  const expandedContent = currentHeadline 
    ? generateExpandedContent(currentHeadline, worldState)
    : {
        mainHeadline: 'A Quiet Day in World Affairs',
        subHeadline: 'No major developments reported as nations maintain status quo',
        leadParagraph: 'In a rare moment of calm, the international community enjoys a period of relative stability. Diplomats express cautious optimism while remaining vigilant.',
        bodyText: 'Markets showed steady performance as investors await the next major development. Government officials continue routine operations while monitoring global situations closely.',
        sidebar: `Global Tension: ${worldState?.globalTension || 0}%`,
      };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'WAR': return 'BREAKING: MILITARY';
      case 'DIPLOMACY': return 'DIPLOMATIC AFFAIRS';
      case 'ECONOMY': return 'BUSINESS & ECONOMY';
      case 'DOMESTIC': return 'NATIONAL NEWS';
      case 'INTERNATIONAL': return 'WORLD NEWS';
      default: return 'TOP STORY';
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    if (currentIndex < headlines.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      closeModal();
    }
  };

  const handleSkip = () => {
    closeModal();
  };

  return (
    <div className="modal-overlay newspaper-overlay" onClick={handleSkip}>
      <div className="newspaper-modal" onClick={(e) => e.stopPropagation()}>
        {/* Newspaper Masthead */}
        <div className="newspaper-masthead">
          <div className="masthead-decoration">★ ★ ★</div>
          <h1 className="newspaper-title">THE WORLD CONFLICTS GAZETTE</h1>
          <div className="masthead-tagline">"All the News That Shapes Nations"</div>
          <div className="masthead-info">
            <span className="newspaper-date">{worldState?.date || 'Current Date'}</span>
            <span className="newspaper-edition">Turn {worldState?.turn || 1} Edition</span>
            <span className="newspaper-price">Price: 1 Influence Point</span>
          </div>
          <div className="masthead-line"></div>
        </div>

        {/* Main Content */}
        <div className="newspaper-body">
          <div className="newspaper-main">
            {/* Category Tag */}
            <div className="article-category">
              {getCategoryLabel(currentHeadline?.category)}
            </div>

            {/* Main Headline */}
            <h2 className="main-headline">{expandedContent.mainHeadline}</h2>
            
            {/* Sub-headline */}
            <h3 className="sub-headline">{expandedContent.subHeadline}</h3>

            {/* Byline */}
            <div className="article-byline">
              <span className="byline-author">By Our Foreign Correspondent</span>
              <span className="byline-location">
                {currentHeadline?.relatedCountries?.[0] || 'International Desk'}
              </span>
            </div>

            {/* Article Content */}
            <div className="article-content">
              <p className="lead-paragraph">
                <span className="drop-cap">{expandedContent.leadParagraph.charAt(0)}</span>
                {expandedContent.leadParagraph.slice(1)}
              </p>
              <p className="body-paragraph">{expandedContent.bodyText}</p>
            </div>

            {/* Impact Box */}
            {currentHeadline?.impact && (
              <div className="impact-box">
                <strong>📊 Impact Assessment:</strong> {currentHeadline.impact}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="newspaper-sidebar">
            <div className="sidebar-section">
              <h4>WORLD BRIEFING</h4>
              <div className="briefing-stat">
                <span>Global Tension</span>
                <div className="tension-bar">
                  <div 
                    className="tension-fill" 
                    style={{ width: `${worldState?.globalTension || 0}%` }}
                  />
                </div>
                <span>{worldState?.globalTension || 0}%</span>
              </div>
              <div className="briefing-stat">
                <span>Active Conflicts</span>
                <span className="stat-value">{worldState?.wars?.length || 0}</span>
              </div>
            </div>

            {headlines.length > 1 && (
              <div className="sidebar-section">
                <h4>MORE HEADLINES</h4>
                <ul className="other-headlines">
                  {headlines.slice(0, 4).map((h, i) => (
                    <li 
                      key={i} 
                      className={i === currentIndex ? 'current' : ''}
                      onClick={() => setCurrentIndex(i)}
                    >
                      {h.headline?.substring(0, 50)}{h.headline && h.headline.length > 50 ? '...' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="newspaper-footer">
          <div className="headline-progress">
            {headlines.length > 0 ? headlines.map((_, i) => (
              <div
                key={i}
                className={`progress-dot ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}`}
                onClick={() => setCurrentIndex(i)}
              />
            )) : (
              <div className="progress-dot active" />
            )}
          </div>

          <div className="newspaper-controls">
            <button
              className="btn btn-secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0 || !hasHeadlines}
            >
              ← Previous
            </button>
            <button className="btn btn-secondary" onClick={handleSkip}>
              Skip All
            </button>
            <button className="btn btn-primary" onClick={handleNext}>
              {!hasHeadlines || currentIndex === headlines.length - 1 ? 'Continue to Turn' : 'Next Story →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
