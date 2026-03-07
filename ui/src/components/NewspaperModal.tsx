import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function NewspaperModal() {
  const { activeModal, closeModal, worldState } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const headlines = worldState?.newspaper ?? [];

  useEffect(() => {
    if (activeModal !== 'newspaper' || !autoAdvance || headlines.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < headlines.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeModal, autoAdvance, currentIndex, headlines.length]);

  useEffect(() => {
    if (activeModal === 'newspaper') {
      setCurrentIndex(0);
    }
  }, [activeModal]);

  if (activeModal !== 'newspaper' || headlines.length === 0) return null;

  const currentHeadline = headlines[currentIndex];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WAR': return '⚔️';
      case 'DIPLOMACY': return '🤝';
      case 'ECONOMY': return '📈';
      case 'DOMESTIC': return '🏛️';
      case 'INTERNATIONAL': return '🌍';
      default: return '📰';
    }
  };

  const handlePrevious = () => {
    setAutoAdvance(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setAutoAdvance(false);
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
        <div className="newspaper-header">
          <div className="newspaper-masthead">
            <span className="newspaper-icon">📰</span>
            <h1>WORLD CONFLICTS DAILY</h1>
          </div>
          <div className="newspaper-date">
            {worldState?.date} | Turn {worldState?.turn}
          </div>
        </div>

        <div className="newspaper-content">
          <div className="headline-category">
            <span className="category-icon">{getCategoryIcon(currentHeadline.category)}</span>
            <span className="category-name">{currentHeadline.category}</span>
          </div>

          <h2 className="headline-text">{currentHeadline.headline}</h2>

          <p className="headline-content">{currentHeadline.content}</p>
        </div>

        <div className="newspaper-footer">
          <div className="headline-progress">
            {headlines.map((_, i) => (
              <div
                key={i}
                className={`progress-dot ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}`}
                onClick={() => {
                  setAutoAdvance(false);
                  setCurrentIndex(i);
                }}
              />
            ))}
          </div>

          <div className="newspaper-controls">
            <button
              className="btn btn-secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button className="btn btn-secondary" onClick={handleSkip}>
              Skip All
            </button>
            <button className="btn btn-primary" onClick={handleNext}>
              {currentIndex === headlines.length - 1 ? 'Continue' : 'Next →'}
            </button>
          </div>

          {autoAdvance && (
            <div className="auto-advance-indicator">
              Auto-advancing in 3s...
              <button onClick={() => setAutoAdvance(false)}>Pause</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
