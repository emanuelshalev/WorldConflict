import { useEffect, useState } from 'react';
import { IconCopy, IconDeviceMobile, IconDownload, IconShare } from '@tabler/icons-react';
import { downloadDataUrl, drawRevealCard, drawRevealPortrait, shareImage, type RevealCardData } from '../../lib/shareCard';

/**
 * The share bar (WP8): Share result, Save card (1200 x 630), Phone card (1080 x 1350) and Copy
 * text, with a preview of the landscape card exactly as it saves.
 */
export function ShareBar({ data, text, fileStem, preview = true }: { data: RevealCardData; text: string; fileStem: string; preview?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [img, setImg] = useState('');
  useEffect(() => {
    if (!preview) return;
    let live = true;
    const draw = () => live && setImg(drawRevealCard(data));
    // Draw once the web fonts are in, so the preview matches the saved PNG
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) fonts.ready.then(draw, draw);
    else draw();
    return () => {
      live = false;
    };
  }, [data, preview]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };
  // The default share is the picture (F-02-3, Leo: "a text box I would not post"): the card as a
  // PNG through the system share sheet when it takes files, else the card is saved and the text
  // copied, and the button says so
  const [shared, setShared] = useState('');
  const share = async () => setShared(await shareImage(drawRevealCard(data), text, fileStem));
  return (
    <div className="rv-share">
      {preview && img && <img className="rv-share-preview" src={img} alt={`Share card: ${data.country}, ${data.verdict}, Presidency Score ${data.score}, grade ${data.grade}, seed ${data.seedCode}`} />}
      <div className="rv-share-actions">
        <button type="button" className="rv-btn primary" onClick={share}>
          <IconShare size={18} aria-hidden /> {shared || 'Share card'}
        </button>
        <button type="button" className="rv-btn" onClick={() => downloadDataUrl(drawRevealCard(data), `${fileStem}.png`)}>
          <IconDownload size={18} aria-hidden /> Save card
        </button>
        <button type="button" className="rv-btn" onClick={() => downloadDataUrl(drawRevealPortrait(data), `${fileStem}-phone.png`)}>
          <IconDeviceMobile size={18} aria-hidden /> Phone card
        </button>
        <button type="button" className="rv-btn" onClick={copy}>
          <IconCopy size={18} aria-hidden /> {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>
      <p className="rv-share-status" role="status" aria-live="polite">
        {shared}
      </p>
    </div>
  );
}
