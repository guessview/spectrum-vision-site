import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PROJECTS_DIR = path.join(ROOT, 'projects');
const TEMPLATE_PATH = path.join(PROJECTS_DIR, 'project.template.html');

function escHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function titleToHtml(title) {
  // Default to existing style: split on spaces into 2 lines when it looks good.
  const parts = String(title).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return escHtml(title);
  const mid = Math.ceil(parts.length / 2);
  return `${escHtml(parts.slice(0, mid).join(' '))}<br>${escHtml(parts.slice(mid).join(' '))}`;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON at ${p}: ${e.message}`);
  }
}

function normalizeProject(project, slug) {
  if (!project || typeof project !== 'object') throw new Error(`project.json in "${slug}" must be an object`);
  const title = String(project.title || '').trim();
  if (!title) throw new Error(`Missing "title" in projects/${slug}/project.json`);

  const meta = String(project.meta || '').trim();
  if (!meta) throw new Error(`Missing "meta" in projects/${slug}/project.json`);

  const cardCategory = String(project.cardCategory || '').trim();
  if (!cardCategory) throw new Error(`Missing "cardCategory" in projects/${slug}/project.json`);

  const cover = String(project.cover || 'cover.jpg').trim();
  const href = `projects/${slug}/`;

  const order = Number.isFinite(project.order) ? project.order : null;
  const year = Number.isFinite(project.year) ? project.year : null;

  const renders = Array.isArray(project.renders) ? project.renders : [];

  return {
    slug,
    title,
    pageTitle: String(project.pageTitle || title).trim() || title,
    cardCategory,
    meta,
    year,
    order,
    href,
    cover: `projects/${slug}/${cover.replaceAll('\\', '/')}`,
    renders
  };
}

async function loadTemplate() {
  const tpl = await fs.readFile(TEMPLATE_PATH, 'utf8');
  if (!tpl.includes('{{titleHtml}}') || !tpl.includes('{{meta}}')) {
    throw new Error(`Template missing placeholders. Check ${TEMPLATE_PATH}`);
  }
  return tpl;
}

function applyTemplate(tpl, project) {
  return tpl
    .replaceAll('{{pageTitle}}', escHtml(project.pageTitle))
    .replaceAll('{{titleHtml}}', titleToHtml(project.title))
    .replaceAll('{{meta}}', escHtml(project.meta));
}

async function main() {
  const template = await loadTemplate();

  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const slugs = entries
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('_') && name !== 'node_modules');

  const projects = [];

  for (const slug of slugs) {
    const jsonPath = path.join(PROJECTS_DIR, slug, 'project.json');
    if (!(await exists(jsonPath))) continue;
    const raw = await readJson(jsonPath);
    const project = normalizeProject(raw, slug);
    projects.push(project);

    const outHtml = applyTemplate(template, project);
    const outPath = path.join(PROJECTS_DIR, slug, 'index.html');
    await fs.writeFile(outPath, outHtml, 'utf8');
  }

  projects.sort((a, b) => {
    // order asc first (if present), then year desc, then title
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    const ay = a.year ?? -Infinity;
    const by = b.year ?? -Infinity;
    if (ay !== by) return by - ay;
    return a.title.localeCompare(b.title);
  });

  const list = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    cardCategory: p.cardCategory,
    meta: p.meta,
    href: p.href,
    cover: p.cover
  }));

  await fs.writeFile(path.join(PROJECTS_DIR, 'projects.json'), JSON.stringify(list, null, 2) + '\n', 'utf8');
  process.stdout.write(`Generated ${list.length} projects.\n`);
}

main().catch((err) => {
  process.stderr.write((err?.stack || err?.message || String(err)) + '\n');
  process.exitCode = 1;
});

