import { useState, useEffect } from 'react';
import { useGameStore, loadGame, fetchSaves } from '../store/gameStore';

interface SaveRecord {
  id: string;
  name: string;
  turn: number;
  playerCountry: string;
}

export function SaveLoadModal() {
  const { activeModal, closeModal, isLoading, error } = useGameStore();
  const [saves, setSaves] = useState<SaveRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (activeModal === 'saveLoad') {
      setLoadingList(true);
      fetchSaves()
        .then(setSaves)
        .catch(console.error)
        .finally(() => setLoadingList(false));
    }
  }, [activeModal]);

  if (activeModal !== 'saveLoad') return null;

  const handleLoad = async (saveId: string) => {
    await loadGame(saveId);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save / Load Game</h2>
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <h3>Saved Games</h3>
          {loadingList ? (
            <p>Loading saves...</p>
          ) : saves.length === 0 ? (
            <p className="no-saves">No saved games found</p>
          ) : (
            <div className="save-list">
              {saves.map((save) => (
                <div key={save.id} className="save-item">
                  <div className="save-info">
                    <strong>{save.name}</strong>
                    <span>
                      {save.playerCountry} - Turn {save.turn}
                    </span>
                  </div>
                  <button
                    className="btn btn-small"
                    onClick={() => handleLoad(save.id)}
                    disabled={isLoading}
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
