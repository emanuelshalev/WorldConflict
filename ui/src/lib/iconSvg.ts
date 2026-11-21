import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Icon } from '@tabler/icons-react';

const cache = new Map<Icon, string>();

/** Static SVG markup of a Tabler icon, for HTML map markers (white stroke, 15px). */
export function iconSvg(I: Icon): string {
  let s = cache.get(I);
  if (!s) {
    s = renderToStaticMarkup(createElement(I, { size: 15, stroke: 2.2, color: '#fff' }));
    cache.set(I, s);
  }
  return s;
}
