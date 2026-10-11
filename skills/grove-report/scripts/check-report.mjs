#!/usr/bin/env node
// Static checks for a Grove report repo. No dependencies; Node 18+.
//
//   node check-report.mjs <report-dir>
//
// Catches what makes a report load blank or half-rendered on immediately.run,
// before you spend a browser run on it:
//   - the marker file: present, valid JSON, opens with `open-wiki`, every declared
//     component exists and has a capitalized name;
//   - no package.json `main` (it turns the repo into an app and skips Grove);
//   - home.mdx: present, with a `title`;
//   - every relative import in every .mdx resolves, and every imported .mdx section
//     sits under an `_`-prefixed folder (otherwise it also shows up as its own page);
//   - every image resolves the way Grove resolves it (relative to the page shown);
//   - prose that MDX would parse as JSX or an expression: a bare `<` that does not
//     open a tag, and `{`/`}` outside code and outside component tags;
//   - section files long enough to make collaboration conflict-prone.
//
// Exit code 0 = no errors (warnings may remain); 1 = errors.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const errors = [];
const warnings = [];
const rel = (p) => path.relative(root, p) || '.';
const err = (file, msg) => errors.push(`${rel(file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${rel(file)}: ${msg}`);

// ── marker ────────────────────────────────────────────────────────────────────
const markerPath = path.join(root, 'immediately.run.json');
let declared = {};
if (!fs.existsSync(markerPath)) {
  err(markerPath, 'missing — without it the repo is not opened as a Grove wiki');
} else {
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (marker?.opensWith?.task !== 'open-wiki') err(markerPath, '`opensWith.task` must be "open-wiki"');
    declared = marker.components || {};
    for (const [name, p] of Object.entries(declared)) {
      if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) err(markerPath, `component name "${name}" must start with a capital letter and contain only letters, digits and _`);
      if (typeof p !== 'string' || !fs.existsSync(path.join(root, p))) err(markerPath, `component "${name}" points at ${p}, which does not exist`);
    }
  } catch (e) {
    err(markerPath, `not valid JSON (${e.message})`);
  }
}

const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.main) err(pkgPath, '`main` makes the repo boot as an app and skip Grove — remove it');
    else warn(pkgPath, 'a report needs no package.json; delete it unless you know why it is here');
  } catch {
    err(pkgPath, 'not valid JSON');
  }
}

// ── files ─────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(root);
const mdx = files.filter((f) => /\.mdx?$/.test(f));
const home = path.join(root, 'home.mdx');
if (!fs.existsSync(home)) err(home, 'missing — Grove opens the report at home.mdx');

// Inside a `_`-prefixed folder anywhere below the root?
const hidden = (f) => rel(f).split(path.sep).slice(0, -1).some((seg) => seg.startsWith('_'));

const HTML_TAGS = new Set('a abbr b br code del details div em figure figcaption h1 h2 h3 h4 h5 h6 hr i img kbd li mark ol p pre s small span strong sub summary sup table tbody td th thead tr u ul'.split(' '));

for (const file of mdx) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  // frontmatter
  let body = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end < 0) err(file, 'frontmatter opened with --- but never closed');
    else {
      body = end + 1;
      if (file === home && !lines.slice(1, end).some((l) => /^title:\s*\S/.test(l))) err(file, 'frontmatter needs a `title:`');
    }
  } else if (file === home) {
    err(file, 'needs frontmatter with at least `title:`');
  }

  // imports
  for (const m of text.matchAll(/^import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    if (!spec.startsWith('.')) {
      if (!['react'].includes(spec)) warn(file, `imports the package "${spec}"; packages load from a CDN at view time — prefer a local component`);
      continue;
    }
    const target = path.resolve(path.dirname(file), spec);
    const candidates = [target, `${target}.tsx`, `${target}.ts`, `${target}.jsx`, `${target}.js`, `${target}.mdx`];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!hit) err(file, `import "${spec}" does not resolve`);
    else if (/\.mdx?$/.test(hit) && !hidden(hit)) warn(file, `imports ${rel(hit)}, which is not under an _-prefixed folder, so it also appears as a separate page in the sidebar`);
  }

  // images — Grove resolves an image path against the PAGE being shown, not the file
  // the path is written in: inside a section that home.mdx imports, `./assets/x.png`
  // means the assets folder beside home.mdx. A leading `/` names the sandbox's own
  // filesystem root, never the report's, so it always misses.
  const base = hidden(file) ? root : path.dirname(file);
  for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img[^>]*\ssrc=["']([^"']+)["']/g)) {
    const src = m[1] || m[2];
    if (/^(https?:|data:|blob:)/.test(src)) {
      if (src.startsWith('data:')) warn(file, 'inline data: image — extract it to a file under assets/');
      continue;
    }
    if (src.startsWith('/')) { err(file, `image "${src}" starts with / — write it relative to home.mdx, e.g. ./assets/…`); continue; }
    if (!fs.existsSync(path.resolve(base, src))) {
      const hint = hidden(file) && fs.existsSync(path.resolve(path.dirname(file), src))
        ? ' (inside a section, paths are relative to home.mdx, not to the section file: use ./assets/…)'
        : '';
      err(file, `image "${src}" does not exist${hint}`);
    }
  }

  // MDX hazards in prose
  let fence = false;
  let inTag = false; // inside a multi-line JSX opening tag
  for (let i = body; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; continue; }
    if (fence) continue;
    if (/^\s*(import|export)\s/.test(raw)) continue;
    const line = raw.replace(/`[^`]*`/g, '');
    const trimmed = line.trim();
    if (inTag) { if (/\/?>\s*$/.test(trimmed)) inTag = false; continue; }
    if (/^<\/?[A-Za-z]/.test(trimmed)) {
      if (!/>/.test(trimmed)) inTag = true; // opening tag continues on the next lines
      // the attributes of a component line may hold {expressions}; only check text after the tag closes
      const after = trimmed.replace(/^<[^>]*>/, '');
      if (/[{}]/.test(after.replace(/<[^>]*>/g, ''))) warn(file, `line ${i + 1}: { or } in text — MDX reads it as an expression; put it in backticks`);
      continue;
    }
    for (const m of line.matchAll(/<([^\s>/]*)/g)) {
      const tag = m[1];
      if (/^[A-Z][A-Za-z0-9_.]*$/.test(tag) || HTML_TAGS.has(tag.toLowerCase())) continue;
      err(file, `line ${i + 1}: "<${tag}" is not a tag — MDX will fail to compile; write it in backticks or reword (e.g. "less than")`);
    }
    if (/[{}]/.test(line.replace(/<[A-Za-z][^>]*>/g, ''))) err(file, `line ${i + 1}: { or } in prose — MDX reads it as an expression; put it in backticks`);
  }

  if (hidden(file) && lines.length > 250) warn(file, `${lines.length} lines — consider splitting this section so collaborators edit separate files`);
}

// components that exist but are neither declared nor imported anywhere
const allMdx = mdx.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
for (const f of files.filter((f) => /\.(tsx|jsx)$/.test(f))) {
  const declaredHere = Object.values(declared).some((p) => path.resolve(root, p) === f);
  const imported = allMdx.includes(path.basename(f).replace(/\.(tsx|jsx)$/, ''));
  if (!declaredHere && !imported) warn(f, 'component is neither declared in immediately.run.json nor imported by any .mdx');
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
console.log(`${mdx.length} mdx files, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
