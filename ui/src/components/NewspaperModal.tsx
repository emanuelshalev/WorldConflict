import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateNews, type NewsArticle } from '../utils/newsGenerator';

export function NewspaperModal() {
  const { activeModal, closeModal, worldState } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use shared news generator for consistent news across panel and modal
  const headlines: NewsArticle[] = worldState ? generateNews(worldState) : [];

  useEffect(() => {
    if (activeModal === 'newspaper') {
      setCurrentIndex(0);
    }
  }, [activeModal]);

  if (activeModal !== 'newspaper') return null;
  
  // If no headlines, show a default "quiet day" newspaper
  const hasHeadlines = headlines.length > 0;
  
  const currentHeadline = hasHeadlines ? headlines[currentIndex] : null;
  
  // Generate sub-headline based on category
  const getSubHeadline = (article: NewsArticle | null): string => {
    if (!article) return 'No major developments reported as nations maintain status quo';
    switch (article.category) {
      case 'WAR': return 'International community calls for emergency UN session as tensions escalate';
      case 'DIPLO': return 'Historic agreement reshapes regional power dynamics';
      case 'CRISIS': return 'Government faces mounting pressure amid domestic challenges';
      case 'ECON': return 'Markets react as economic indicators shift global outlook';
      case 'SEC': return 'Defense analysts monitor developments with concern';
      default: return 'Analysts weigh in on implications for global affairs';
    }
  };

  const expandedContent = currentHeadline 
    ? {
        mainHeadline: currentHeadline.headline,
        subHeadline: getSubHeadline(currentHeadline),
        leadParagraph: currentHeadline.summary,
        bodyText: currentHeadline.content,
        impact: currentHeadline.impact,
      }
    : {
        mainHeadline: 'A Quiet Day in World Affairs',
        subHeadline: 'No major developments reported as nations maintain status quo',
        leadParagraph: 'In a rare moment of calm, the international community enjoys a period of relative stability. Diplomats express cautious optimism while remaining vigilant.',
        bodyText: 'Markets showed steady performance as investors await the next major development. Government officials continue routine operations while monitoring global situations closely.',
        impact: undefined,
      };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'WAR': return 'BREAKING: MILITARY';
      case 'DIPLO': return 'DIPLOMATIC AFFAIRS';
      case 'ECON': return 'BUSINESS & ECONOMY';
      case 'LOCAL': return 'NATIONAL NEWS';
      case 'WORLD': return 'WORLD NEWS';
      case 'CRISIS': return 'BREAKING: CRISIS';
      case 'SEC': return 'SECURITY & DEFENSE';
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
