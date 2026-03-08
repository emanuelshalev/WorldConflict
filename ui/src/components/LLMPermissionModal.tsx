import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import './LLMPermissionModal.css';

interface LLMProvider {
  provider: string;
  available: boolean;
  model: string;
}

interface LLMStatus {
  hasApiKey: boolean;
  providers: LLMProvider[];
  recommended: string;
}

export function LLMPermissionModal() {
  const { setLLMPermission, setLLMProvider } = useGameStore();
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we already have permission stored
    const stored = localStorage.getItem('llmPermissionGranted');
    console.log('[LLM] Stored permission:', stored);
    
    if (stored === 'true' || stored === 'false') {
      setLLMPermission(stored === 'true');
      const storedProvider = localStorage.getItem('llmProvider');
      if (storedProvider) {
        setLLMProvider(storedProvider);
      }
      setDismissed(true);
      return;
    }

    // Fetch LLM status from backend
    const checkStatus = async () => {
      console.log('[LLM] Checking backend for API keys...');
      try {
        const res = await fetch('http://localhost:8080/api/llm/status');
        console.log('[LLM] Backend response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[LLM] Backend data:', data);
          setStatus(data);
        } else {
          console.log('[LLM] Backend error:', res.statusText);
          setError('Could not check LLM status');
        }
      } catch (err) {
        // Backend not running - that's okay, we'll use fallback AI
        console.log('[LLM] Backend not reachable, using fallback');
        setStatus({
          hasApiKey: false,
          providers: [{ provider: 'ollama', available: true, model: 'llama3.2' }],
          recommended: 'fallback',
        });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [setLLMPermission, setLLMProvider]);

  const handleApprove = (provider: string) => {
    setLLMPermission(true);
    setLLMProvider(provider);
    localStorage.setItem('llmPermissionGranted', 'true');
    localStorage.setItem('llmProvider', provider);
    setDismissed(true);
  };

  const handleDecline = () => {
    setLLMPermission(false);
    setLLMProvider('fallback');
    localStorage.setItem('llmPermissionGranted', 'false');
    localStorage.setItem('llmProvider', 'fallback');
    setDismissed(true);
  };

  // Don't show if already dismissed (user made a choice)
  if (dismissed) {
    return null;
  }
  
  // Don't show while loading
  if (loading) {
    return null;
  }

  const hasApiKey = status?.hasApiKey ?? false;
  const availableProviders = status?.providers.filter(p => p.available && p.provider !== 'ollama') ?? [];

  // Show different content based on whether API key was found
  if (hasApiKey) {
    return (
      <div className="modal-overlay llm-permission-overlay">
        <div className="llm-permission-modal">
          <div className="llm-permission-header">
            <span className="llm-icon">🤖</span>
            <h2>AI Provider Detected</h2>
          </div>

          <div className="llm-permission-body">
            <p>
              We found API key(s) for AI services on your system. Would you like to enable 
              AI-powered features for a more dynamic gameplay experience?
            </p>

            <div className="provider-list">
              {availableProviders.map((p) => (
                <div key={p.provider} className="provider-card">
                  <div className="provider-info">
                    <span className="provider-icon">
                      {p.provider === 'gemini' ? '✨' : p.provider === 'openai' ? '🧠' : '🦙'}
                    </span>
                    <div className="provider-details">
                      <strong>{p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}</strong>
                      <span className="provider-model">{p.model}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleApprove(p.provider)}
                  >
                    Use {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                  </button>
                </div>
              ))}
            </div>

            <div className="llm-features">
              <h4>AI Features Include:</h4>
              <ul>
                <li>🌍 Dynamic country AI behavior</li>
                <li>📋 Intelligent advisor responses</li>
                <li>📰 Context-aware news generation</li>
                <li>🎭 Realistic diplomatic interactions</li>
              </ul>
            </div>

            <p className="privacy-note">
              <strong>Privacy:</strong> Your API key stays on your machine. 
              Game data is sent to the AI provider for processing.
            </p>
          </div>

          <div className="llm-permission-footer">
            <button className="btn btn-secondary" onClick={handleDecline}>
              No Thanks, Use Basic AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No API key found - show fallback message
  return (
    <div className="modal-overlay llm-permission-overlay">
      <div className="llm-permission-modal">
        <div className="llm-permission-header">
          <span className="llm-icon">🎮</span>
          <h2>AI Mode</h2>
        </div>

        <div className="llm-permission-body">
          <div className="no-key-message">
            <span className="no-key-icon">ℹ️</span>
            <p>
              No LLM API key detected. The game will use the <strong>backup AI engine</strong> for 
              country behavior and advisor responses.
            </p>
          </div>

          <div className="llm-features fallback-features">
            <h4>Backup Engine Features:</h4>
            <ul>
              <li>🎯 Rule-based country AI</li>
              <li>📋 Pre-configured advisor responses</li>
              <li>⚡ Fast, offline gameplay</li>
              <li>🔒 No external API calls</li>
            </ul>
          </div>

          <p className="setup-hint">
            <strong>Want AI-powered features?</strong> Add your Gemini or OpenAI API key to a 
            <code>.env</code> file in the project root and restart the server.
          </p>
        </div>

        <div className="llm-permission-footer">
          <button className="btn btn-primary" onClick={handleDecline}>
            Continue with Backup Engine
          </button>
        </div>
      </div>
    </div>
  );
}
