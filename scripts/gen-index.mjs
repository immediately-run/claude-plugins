#!/usr/bin/env node
// Keeps the repo's derived files in step with skills/. No dependencies; Node 18+.
//
//   node scripts/gen-index.mjs          rewrite skills/index.json
//   node scripts/gen-index.mjs --check  fail if anything is out of step (CI runs this)
//
// skills/index.json is what opencode reads from a `skills.urls` entry: each skill's
// name, every file to download, and a version. The version is a hash of the skill's
// files, so it changes exactly when a file does and nobody has to remember to bump it.
//
// --check also verifies that every skill's SKILL.md frontmatter has a `name` equal to
// its folder and a `description`, that the Claude marketplace lists exactly the
// skills in skills/, and that copies of shared files are identical.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skillsDir = path.join(root, 'skills');
const check = process.argv.includes('--check');
const problems = [];

// Files that more than one skill carries, because a skill must stand alone when it
// is installed by itself. Each group must stay byte-identical.
const SHARED = [
  ['skills/grove-report/templates/cache.yml', 'skills/publish-to-immediately-run/templates/cache.yml'],
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name !== '.DS_Store') out.push(p);
  }
  return out;
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

const skills = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const index = { skills: [] };
for (const name of skills) {
  const dir = path.join(skillsDir, name);
  const skillMd = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) { problems.push(`skills/${name}: no SKILL.md`); continue; }
  const fm = frontmatter(skillMd);
  if (fm.name !== name) problems.push(`skills/${name}/SKILL.md: frontmatter name "${fm.name}" must equal the folder name`);
  if (!fm.description) problems.push(`skills/${name}/SKILL.md: frontmatter needs a description`);
  const files = walk(dir).map((f) => path.relative(dir, f).split(path.sep).join('/'));
  const hash = crypto.createHash('sha256');
  for (const f of files) hash.update(f).update('\0').update(fs.readFileSync(path.join(dir, f)));
  index.skills.push({ name, files, version: hash.digest('hex').slice(0, 12) });
}
const indexText = `${JSON.stringify(index, null, 2)}\n`;
const indexPath = path.join(skillsDir, 'index.json');

// The marketplace must list exactly these skills.
const market = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const listed = market.plugins.flatMap((p) => p.skills || []).map((s) => s.replace(/^\.\/skills\//, '')).sort();
if (JSON.stringify(listed) !== JSON.stringify(skills)) {
  problems.push(`.claude-plugin/marketplace.json lists [${listed}] but skills/ holds [${skills}]`);
}

for (const group of SHARED) {
  const bodies = group.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  if (bodies.some((b) => b !== bodies[0])) problems.push(`shared copies differ: ${group.join(' / ')} — edit one, copy it to the others`);
}

if (check) {
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  if (current !== indexText) problems.push('skills/index.json is stale — run: node scripts/gen-index.mjs');
} else {
  fs.writeFileSync(indexPath, indexText);
  console.log(`wrote skills/index.json (${index.skills.length} skills)`);
}

for (const p of problems) console.log(`ERROR ${p}`);
process.exit(problems.length ? 1 : 0);
