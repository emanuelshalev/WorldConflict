/**
 * The wax seal sprite (concepts/feel-seal.html): one hidden <svg> of <symbol>s per document, so
 * every seal on screen is a cheap <use> sharing one gradient. Variants: full, imprint, short,
 * next, new (with a shine), broken.
 */
const SPRITE_ID = 'wc-seal-sprite';
const WAX =
  'M20 2.5c2.3 0 3 1.6 5 2.2 2 .6 3.6-.4 5.3.9 1.7 1.3 1.2 3 2.3 4.8 1.1 1.8 2.9 2.1 3.4 4.2.5 2-.8 3.3-.8 5.4s1.3 3.4.8 5.4c-.5 2.1-2.3 2.4-3.4 4.2-1.1 1.8-.6 3.5-2.3 4.8-1.7 1.3-3.3.3-5.3.9-2 .6-2.7 2.2-5 2.2s-3-1.6-5-2.2c-2-.6-3.6.4-5.3-.9-1.7-1.3-1.2-3-2.3-4.8C4.3 27.8 2.5 27.5 2 25.4c-.5-2 .8-3.3.8-5.4S1.5 16.6 2 14.6c.5-2.1 2.3-2.4 3.4-4.2 1.1-1.8.6-3.5 2.3-4.8C9.4 4.3 11 5.3 13 4.7c2-.6 2.7-2.2 5-2.2z';

const SPRITE = `
<defs>
  <radialGradient id="wcSealWax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffe2a3"/><stop offset=".35" stop-color="#f5b14a"/><stop offset=".8" stop-color="#c47d22"/><stop offset="1" stop-color="#8d5512"/></radialGradient>
  <linearGradient id="wcSealShine" x1="0" y1="0" x2="1" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <symbol id="wc-seal-full" viewBox="0 0 40 40">
    <path d="${WAX}" fill="url(#wcSealWax)"/>
    <path d="${WAX}" fill="none" stroke="#7a470d" stroke-width=".8" opacity=".55"/>
    <circle cx="20" cy="20" r="12.2" fill="none" stroke="#8d5512" stroke-width="1.4" opacity=".7"/>
    <circle cx="19.6" cy="19.6" r="12.2" fill="none" stroke="#ffe7b5" stroke-width=".7" opacity=".45"/>
    <path d="M20 12.5l7.5 7.5-7.5 7.5-7.5-7.5z" fill="#9a5c14"/>
    <path d="M20 13.8l6.2 6.2-6.2 6.2" fill="none" stroke="#ffe0a0" stroke-width=".9" opacity=".7"/>
  </symbol>
  <symbol id="wc-seal-imprint" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16.5" fill="rgba(242,169,59,.06)" stroke="#f2a93b" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"/>
    <path d="M20 13l7 7-7 7-7-7z" fill="none" stroke="#f2a93b" stroke-width="1.4" opacity=".65"/>
  </symbol>
  <symbol id="wc-seal-short" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16.5" fill="rgba(229,56,59,.14)" stroke="#e5383b" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M20 11v12M20 27.5v1.5" stroke="#ff8e8f" stroke-width="3" stroke-linecap="round"/>
  </symbol>
  <symbol id="wc-seal-next" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16.5" fill="none" stroke="#8693a6" stroke-width="1.4" stroke-dasharray="1 3.2" stroke-linecap="round"/>
  </symbol>
  <symbol id="wc-seal-new" viewBox="0 0 40 40">
    <use href="#wc-seal-full"/>
    <circle class="wc-seal-shine" cx="20" cy="20" r="18" fill="url(#wcSealShine)"/>
  </symbol>
  <symbol id="wc-seal-broken" viewBox="0 0 40 40">
    <use href="#wc-seal-full" opacity=".6"/>
    <path d="M8 14l9 5-3 6 8 3 3 8M30 6l-6 9 7 4" stroke="#1b1204" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  </symbol>
</defs>`;

/** One hidden sprite per document; every seal is a <use> of it (cheap, one gradient). */
export function ensureSealSprite(): void {
  if (typeof document === 'undefined' || document.getElementById(SPRITE_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = SPRITE_ID;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.overflow = 'hidden';
  svg.innerHTML = SPRITE;
  document.body.appendChild(svg);
}

/** Seal word for sentences: "1 seal", "2 seals". */
export const seals = (count: number) => `${count} seal${count === 1 ? '' : 's'}`;
