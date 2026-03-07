import { useState, useEffect } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'poem' | 'title' | 'done'>('poem');
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in poem
    const fadeInTimer = setTimeout(() => setOpacity(1), 100);
    
    // After 4 seconds, fade out poem
    const fadeOutTimer = setTimeout(() => setOpacity(0), 4000);
    
    // Switch to title
    const titleTimer = setTimeout(() => {
      setPhase('title');
      setOpacity(1);
    }, 4500);
    
    // After 2 more seconds, complete
    const completeTimer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 500);
    }, 6500);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(titleTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="splash-screen" onClick={handleSkip}>
      {phase === 'poem' && (
        <div className="splash-poem" style={{ opacity }}>
          <p className="poem-line">This is your captain calling with an urgent warning</p>
          <p className="poem-line">We're above the Gulf of Arabia, altitude is falling</p>
          <p className="poem-line">And I can't keep her up, there's no time for thinking</p>
          <p className="poem-line">All hands on deck, this bird is sinking.</p>
          <p className="poem-attribution">— Sweet Bird of Truth</p>
        </div>
      )}
      
      {phase === 'title' && (
        <div className="splash-title" style={{ opacity }}>
          <h1>WORLD CONFLICTS</h1>
          <p className="splash-subtitle">A Global Political Simulation</p>
        </div>
      )}
      
      <p className="splash-skip">Click anywhere to skip</p>
    </div>
  );
}
