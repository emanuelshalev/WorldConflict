// Step 1: title screen to first desk, dumping buttons at each step.
import { browser, openTitle, shot, facts, text, buttons, mkLog } from './lib.mjs';
const log = mkLog('log-explore.txt');
const b = await browser();
const { page } = await openTitle(b);
await shot(page, 'e01-title');
log('title text', (await text(page)).slice(0, 1500));
log('title buttons', await buttons(page));
await b.close();
