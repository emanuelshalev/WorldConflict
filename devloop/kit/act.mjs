// Send one command to a running driver.mjs and print the JSON result.
//   node devloop/kit/act.mjs <port> <command> [args...]
const [port, cmd, ...args] = process.argv.slice(2);
const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: JSON.stringify({ cmd, args }) });
const out = await res.json();
if (out.controls) {
  // Compact control list for reading in a terminal
  out.controls = out.controls.map((c) => `${c.disabled ? '[disabled] ' : ''}${c.label}${c.title && c.title !== c.label ? ` (title: ${c.title})` : ''}`);
}
console.log(JSON.stringify(out, null, 1));
