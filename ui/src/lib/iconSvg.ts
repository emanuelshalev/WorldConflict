import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Icon } from '@tabler/icons-react';

const cache = new Map<string, string>();
const ids = new WeakMap<Icon, number>();
let nextId = 0;

/** Static SVG markup of a Tabler icon, for HTML map markers (white stroke, 15px). */
export function iconSvg(I: Icon, color = '#fff'): string {
  let id = ids.get(I);
  if (id === undefined) {
    id = nextId++;
    ids.set(I, id);
  }
  const key = `${id}|${color}`;
  let s = cache.get(key);
  if (!s) {
    s = renderToStaticMarkup(createElement(I, { size: 15, stroke: 2.2, color }));
    cache.set(key, s);
  }
  return s;
}
