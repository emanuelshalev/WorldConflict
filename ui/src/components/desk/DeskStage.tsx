import type { ReactNode } from 'react';
import '../../styles/desk-stage.css';

/**
 * The desk stage (design-feel.md 5): the composition both desk views sit in. Navigator (full desk,
 * 1280 px and up) | stage (fluid, scrolls) | rail (command table). Under 1280 px the navigator
 * becomes filing tabs at the top of the stage; under 900 px everything is one column and the rail
 * becomes the bottom command bar. Anything that comes and goes lives in an overlay or a reserved
 * slot, so nothing on the stage jumps.
 */

export function DeskStage({ view, nav, tabs, children, rail, bar }: { view: 'focus' | 'full'; nav?: ReactNode; tabs?: ReactNode; children: ReactNode; rail: ReactNode; bar?: ReactNode }) {
  return (
    <section className={`desk-screen v-${view}`} aria-label="Your desk">
      {nav}
      <div className="desk-stage-col">
        {tabs}
        <div className="desk-stage" id="desk-stage">
          {children}
        </div>
      </div>
      {rail}
      {bar}
    </section>
  );
}
