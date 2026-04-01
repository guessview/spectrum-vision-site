import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PROJECTS_DIR = path.join(ROOT, 'projects');
const TEMPLATE_PATH = path.join(PROJECTS_DIR, 'project.template.html');

const RENDER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

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

  return {
    slug,
    title,
    pageTitle: String(project.pageTitle || title).trim() || title,
    cardCategory,
    meta,
    year,
    order,
    href,
    cover: `projects/${slug}/${cover.replaceAll('\\', '/')}`
  };
}

function normalizeRenderEntry(r, i, slug) {
  if (typeof r === 'string') {
    const s = r.trim();
    if (!s) throw new Error(`projects/${slug}/project.json: empty string in renders[${i}]`);
    return { src: s.replaceAll('\\', '/') };
  }
  if (r && typeof r === 'object') {
    const src = String(r.src || '').trim().replaceAll('\\', '/');
    if (!src) throw new Error(`projects/${slug}/project.json: missing src in renders[${i}]`);
    const out = { src };
    if (r.wide) out.wide = true;
    return out;
  }
  throw new Error(`projects/${slug}/project.json: invalid renders[${i}]`);
}

async function discoverRenders(slug) {
  const dir = path.join(PROJECTS_DIR, slug, 'renders');
  if (!(await exists(dir))) return [];

  const names = await fs.readdir(dir);
  const files = names.filter((n) => n && !n.startsWith('.') && RENDER_EXT.has(path.extname(n).toLowerCase()));
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  return files.map((f) => ({ src: `renders/${f}` }));
}

async function resolveRenders(raw, slug) {
  const r = raw.renders;
  if (r === 'auto') {
    const list = await discoverRenders(slug);
    const wideFiles = new Set((Array.isArray(raw.wideFilenames) ? raw.wideFilenames : []).map((x) => String(x)));
    return list.map((item) => {
      const base = path.basename(item.src);
      return wideFiles.has(base) ? { ...item, wide: true } : item;
    });
  }
  if (Array.isArray(r)) {
    return r.map((x, i) => normalizeRenderEntry(x, i, slug));
  }
  throw new Error(
    `projects/${slug}/project.json: "renders" must be an array or the string "auto" (scan renders/ folder on generate)`
  );
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

    const resolvedRenders = await resolveRenders(raw, slug);
    if (raw.renders === 'auto' && resolvedRenders.length === 0) {
      process.stdout.write(`Note: ${slug}: renders "auto" but renders/ has no image files (or folder missing).\n`);
    }

    const galleryPath = path.join(PROJECTS_DIR, slug, 'gallery.json');
    await fs.writeFile(
      galleryPath,
      `${JSON.stringify({ title: project.title, renders: resolvedRenders }, null, 2)}\n`,
      'utf8'
    );

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

