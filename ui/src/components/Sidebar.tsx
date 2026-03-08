import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { TurnBriefingPanel } from './TurnBriefingPanel';

export function Sidebar() {
  const { worldState } = useGameStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      // Clamp between 300px and 80% of screen
      const clampedWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.8));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarStyle = width && !isCollapsed ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {};

  if (!worldState) {
    return (
      <aside 
        ref={sidebarRef}
        className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
        style={sidebarStyle}
      >
        <button className="sidebar-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
          {isCollapsed ? '◀' : '▶'}
        </button>
        {!isCollapsed && (
          <>
            <div className="sidebar-resize-handle" onMouseDown={handleMouseDown} />
            <div className="sidebar-empty">
              <p>Start a new game to begin</p>
            </div>
          </>
        )}
      </aside>
    );
  }

  return (
    <aside 
      ref={sidebarRef}
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      style={sidebarStyle}
    >
      <button className="sidebar-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
        {isCollapsed ? '◀' : '▶'}
      </button>
      {!isCollapsed && (
        <>
          <div className="sidebar-resize-handle" onMouseDown={handleMouseDown} />
          <TurnBriefingPanel />
        </>
      )}
    </aside>
  );
}
