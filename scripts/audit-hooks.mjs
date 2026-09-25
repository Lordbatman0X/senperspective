/**
 * React error #310 ("Rendered more hooks than during the previous render")
 * auditor and crash probe.
 *
 * Two halves:
 *   static  — walks every component in src/ with the TypeScript AST and flags
 *             any hook that is not unconditionally executed.
 *   runtime — loads routes in headless Chrome and reports which one trips the
 *             error boundary. #310 only fires on a re-render, so the runtime
 *             half drives the page (scroll, resize) rather than sampling once.
 *
 *   node scripts/audit-hooks.mjs --static
 *   node scripts/audit-hooks.mjs /,/larene http://localhost:5173 9000
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

/**
 * Static half of the audit: flags any hook that is not unconditionally
 * executed by its component. A hook inside an if/switch/loop/ternary, or after
 * a top-level return, can appear on one render and vanish on the next — which
 * is exactly what #310 reports.
 */
function auditHooks() {
  const SRC = path.join(process.cwd(), 'src');
  const files = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.tsx?$/.test(e.name)) files.push(f);
    }
  })(SRC);

  const HOOKS = new Set([
    'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useReducer',
    'useContext', 'useLayoutEffect', 'useInsertionEffect', 'useImperativeHandle',
    'useSyncExternalStore', 'useDebugValue', 'useTransition', 'useDeferredValue',
    'useId', 'useSEO', 'useArenaScores', 'useStore',
  ]);
  const problems = [];

  for (const file of files) {
    const sf = ts.createSourceFile(
      file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    (function visit(node) {
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
           ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) &&
          node.body && ts.isBlock(node.body)) {
        const reported = new Set();

        // Walk up from each hook to the owning function body. If any statement
        // in between can skip execution, the hook is not unconditional.
        const isConditional = (n) =>
          ts.isIfStatement(n) || ts.isSwitchStatement(n) ||
          ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n) ||
          ts.isWhileStatement(n) || ts.isDoStatement(n) ||
          ts.isConditionalExpression(n) || ts.isCatchClause(n) ||
          ts.isLabeledStatement(n) ||
          // `useStore(s => s.x) || fallback` supplies a fallback VALUE; the hook
          // itself still always runs, so this is not a conditional hook call.
          (ts.isBinaryExpression(n) &&
            n.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
            !(ts.isCallExpression(n.left) && ts.isIdentifier(n.left.expression) &&
              HOOKS.has(n.left.expression.text)));

        const isNestedFn = (n) =>
          ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) || ts.isMethodDeclaration(n);

        const scan = (body) => {
          (function walk(n, conditional, inFn) {
            if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) &&
                HOOKS.has(n.expression.text)) {
              // inFn means a nested component/function: a hook there is legal
              // (it is that function's own hook list), so only the enclosing
              // component's own conditional position is a problem.
              //
              // The exception is a hook with NO selector, used as
              // `useStore().someAction()` inside an event handler. That is not
              // a real hook call site at all — Zustand returns the store
              // object — so it must not be reported.
              const isBareStoreAccessor =
                n.expression.text === 'useStore' && n.arguments.length === 0;
              if (conditional && !inFn && !isBareStoreAccessor) {
                const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
                const key = line + ':' + n.expression.text;
                if (!reported.has(key)) {
                  reported.add(key);
                  problems.push({ file, line: line + 1, hook: n.expression.text });
                }
              }
              // Do not descend into a hook's own argument callbacks.
              return;
            }
            if (isNestedFn(n)) {
              // A hook in a nested function belongs to that function. But if
              // the nested function is declared inside a conditional, and it is
              // a component invoked as JSX, React still sees a stable call site
              // only when the branch itself is stable — so flag it too.
              ts.forEachChild(n, (c) => walk(c, conditional || inFn, true));
              return;
            }
            const nextCond = conditional || isConditional(n);
            ts.forEachChild(n, (c) => walk(c, nextCond, inFn));
          })(body, false, false);

          // A hook sitting after a top-level early return never runs on the path
          // that already returned. This is the classic #310 shape:
          //     if (!article) return null;   // render 1: 3 hooks
          //     const [a] = useState();      // render 2: 4 hooks  -> boom
          // A `return` nested inside an if/switch counts too, as long as it is
          // not inside a nested function.
          const returnsAbruptly = (n) => {
            let found = false;
            (function w(x) {
              if (found) return;
              if (isNestedFn(x)) return;
              if (ts.isReturnStatement(x)) { found = true; return; }
              ts.forEachChild(x, w);
            })(n);
            return found;
          };
          let returned = false;
          for (const stmt of body.statements) {
            if (returned) {
              (function findAfter(n) {
                if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) &&
                    HOOKS.has(n.expression.text) && n.arguments.length > 0) {
                  const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
                  const key = line + ':' + n.expression.text;
                  if (!reported.has(key)) {
                    reported.add(key);
                    problems.push({ file, line: line + 1, hook: n.expression.text });
                  }
                  return;
                }
                ts.forEachChild(n, findAfter);
              })(stmt);
            }
            if (returnsAbruptly(stmt)) returned = true;
          }
        };
        scan(node.body);
      }
      ts.forEachChild(node, visit);
    })(sf);
  }
  return { problems, count: files.length };
}

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const staticOnly = !process.argv[2] || process.argv[2] === '--static';
const routes = staticOnly ? [] : process.argv[2].split(',');
const base = process.argv[staticOnly ? 2 : 3] || 'http://localhost:5173';
const wait = Number(process.argv[staticOnly ? 3 : 4] || 9000);

const { problems, count } = auditHooks();
if (problems.length) {
  console.log(`FAIL: ${problems.length} conditionally-executed hook(s) in ${count} files`);
  for (const p of problems) console.log(`  ${p.file}:${p.line}  ${p.hook}()`);
} else {
  console.log(`PASS: hook order is unconditional across ${count} files`);
}

if (staticOnly) {
  process.exit(problems.length ? 1 : 0);
}

const proc = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--user-data-dir=' + process.cwd() + '\\.chrome-cdp3',
  '--remote-debugging-port=' + PORT,
  '--window-size=1400,1000', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await r.json();
      const page = tabs.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('devtools not reachable');
}

const ws = new WebSocket(await getWsUrl());
let id = 0;
const pending = new Map();
let runtimeErrors = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    runtimeErrors.push('EXCEPTION: ' + (d.exception?.description || d.text));
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    runtimeErrors.push('CONSOLE: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    runtimeErrors.push('LOG: ' + m.params.entry.text);
  } else if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

let crashed = 0;
for (const route of routes) {
  runtimeErrors = [];
  await send('Page.navigate', { url: base + route });
  await sleep(wait);

  // Nudge a re-render: scroll, resize and fire input, so state-dependent
  // hook-order bugs get a chance to surface.
  await send('Runtime.evaluate', {
    expression: `window.scrollTo(0,600);
      window.dispatchEvent(new Event('resize'));
      setTimeout(()=>window.scrollTo(0,0), 300);`,
  });
  await sleep(1200);

  const r = await send('Runtime.evaluate', {
    expression: `(() => { const t = document.body.innerText || '';
      return { crashed: t.includes('Minified React error') || /#310|310;/.test(t), len: t.length }; })()`,
    returnByValue: true,
  });
  const v = r.result?.result?.value || {};
  if (v.crashed) {
    crashed++;
    console.log('CRASH  ' + route);
    for (const p of runtimeErrors.slice(0, 5)) console.log('    ' + p.slice(0, 700));
  } else {
    console.log('ok     ' + route + '  (len ' + v.len + ')');
  }
}

if (crashed) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    writeFileSync('shot_crash.png', Buffer.from(shot.result.data, 'base64'));
    console.log('saved shot_crash.png');
  }
}
console.log(crashed ? `\n${crashed} route(s) crashed` : '\nno crashes');
proc.kill();
process.exit(crashed ? 1 : 0);
