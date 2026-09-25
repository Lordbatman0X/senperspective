// One-off repair of double-encoded UTF-8 in the Arena surface.
// "L'Arène" written as bytes-then-decoded-as-latin1 becomes "L'ArÃƒÂ¨ne".
// Each pattern below is pure ASCII in source so this script stays re-runnable.
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
// Longest-first: the double-encoded forms must be matched before their prefixes.
const fixes = [
  ["\u00c3\u00a2\u00e2\u20ac\u00c2\u0080", "\u2014"], // â€” (em dash, double)
  ["\u00c3\u0083\u00c2\u00a9", "\u00e9"], // Ã© (e-acute, double)
  ["\u00c3\u0083\u00c2\u00a8", "\u00e8"], // Ã¨ (e-grave, double)
  ["\u00c3\u0083\u00c2\u00c0", "\u00e0"], // Ã  (a-grave, double)
  ["\u00c3\u00a2\u00e2\u20ac\u009d", "\u2019"], // â€™ (right quote, double)
  ["\u00c3\u0094", "\u00c9"], // Ã" (E-acute, double)
  ["\u00c3\u00a9", "\u00e9"], // Ã© (e-acute, single)
  ["\u00c3\u00a8", "\u00e8"], // Ã¨ (e-grave, single)
  ["\u00c3\u00a0", "\u00e0"], // Ã  (a-grave, single)
  ["\u00c3\u0082", "\u00c2"], // Â (stray, single)
];

for (const f of files) {
  let text = readFileSync(f, "utf8");
  const before = text;
  for (const [bad, good] of fixes) text = text.split(bad).join(good);
  if (text !== before) {
    writeFileSync(f, text, "utf8");
    console.log("fixed " + f);
  } else {
    console.log("clean " + f);
  }
}
