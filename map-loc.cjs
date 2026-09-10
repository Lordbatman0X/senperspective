const fs = require('fs');
const map = JSON.parse(fs.readFileSync('./dist/assets/index-C3Xk4OGL.js.map', 'utf8'));

const TARGET_LINE = 976;      // generated line (1-based)
const TARGET_COL  = 112562;   // generated column

function decodeVLQ(str) {
  const out = [];
  let shift = 0, value = 0, pos = 0;
  do {
    const byte = str.charCodeAt(pos++);
    const digit = byte & 31;
    value += (digit & 15) << shift;
    if (byte & 32) { shift += 4; continue; }
    let neg = digit & 16;
    const v = neg ? -(value >>> 1) : value >>> 0; // integer
    out.push((digit & 16) ? -(value >> 1) : value >> 1);
    shift = 0; value = 0;
  } while ((str.charCodeAt(pos - 1)) & 32);
  return { values: out, pos };
}

function walk() {
  const lines = map.mappings.split(';');
  let srcIdx = 0, srcLine = 0, srcCol = 0;
  let foundSrc = null, foundSrcLine = null, foundGenColFrom = null;
  for (let gl = 0; gl < lines.length; gl++) {
    const segs = lines[gl].split(',');
    let genCol = 0;
    let prevGenCol = 0;
    for (const seg of segs) {
      if (!seg) continue;
      const r = decodeVLQ(seg);
      const v = r.values;
      genCol += v[0];
      const thisGenCol = v[0];
      if (gl === TARGET_LINE - 1 && thisGenCol <= TARGET_COL) {
        // this segment starts at genCol; track it
        foundSrc = map.sources[srcIdx];
        foundSrcLine = srcLine;
        foundGenColFrom = genCol;
      }
      if (v.length >= 2) srcIdx += v[1];
      if (v.length >= 3) srcLine += v[2];
      if (v.length >= 4) srcCol += v[3];
      if (gl === TARGET_LINE - 1) prevGenCol = genCol;
    }
  }
  // pick the last found (largest genCol <= target within line 976)
  if (foundSrc != null) {
    console.log('source:', foundSrc);
    console.log('original line:', foundSrcLine + 1, '(col within segment, approx)');
    const sc = map.sourcesContent && map.sourcesContent[map.sources.indexOf(foundSrc)];
    if (sc) {
      const l = sc.split('\n')[foundSrcLine];
      console.log('SOURCE LINE:', l);
    }
  } else {
    console.log('could not map precisely; using heuristic');
  }
}
walk();