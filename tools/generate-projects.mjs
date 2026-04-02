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

function normalizeProject(project, slug, coverFilename, yearDefault) {
  const raw = project && typeof project === 'object' ? project : {};
  const title = String(raw.title || slug).trim() || slug;
  const year = Number.isFinite(raw.year) ? raw.year : yearDefault;
  const cardCategory = String(raw.cardCategory || 'Project').trim() || 'Project';
  const meta = String(raw.meta || `${title} · Visualization · ${year}`).trim();

  const order = Number.isFinite(raw.order) ? raw.order : null;
  const pageTitle = String(raw.pageTitle || title).trim() || title;

  const coverName = String(coverFilename || raw.cover || 'cover.webp').trim() || 'cover.webp';
  const hrefSlug = encodeURIComponent(slug);
  return {
    slug,
    title,
    pageTitle,
    cardCategory,
    meta,
    year,
    order,
    href: `projects/${hrefSlug}/`,
    cover: `projects/${hrefSlug}/${coverName.replaceAll('\\', '/')}`
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
  const r = raw?.renders ?? 'auto';
  if (r === 'auto') {
    const list = await discoverRenders(slug);
    const wideFiles = new Set((Array.isArray(raw?.wideFilenames) ? raw?.wideFilenames : []).map((x) => String(x)));
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

async function hasWebpRenders(slug) {
  const dir = path.join(PROJECTS_DIR, slug, 'renders');
  if (!(await exists(dir))) return false;
  const names = await fs.readdir(dir);
  return names.some((n) => n && path.extname(n).toLowerCase() === '.webp');
}

async function findCoverFilename(raw, slug) {
  const projectDir = path.join(PROJECTS_DIR, slug);
  if (raw?.cover) {
    const candidate = String(raw.cover).trim();
    if (!candidate) return null;
    const full = path.join(projectDir, candidate);
    if (await exists(full)) return candidate;
  }

  // Prefer webp covers to keep the site light.
  const candidates = ['cover.webp', 'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif'];
  for (const c of candidates) {
    const full = path.join(projectDir, c);
    if (await exists(full)) return c;
  }
  return null;
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
  const yearDefault = new Date().getFullYear();

  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const slugs = entries
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('_') && name !== 'node_modules');

  const projects = [];

  for (const slug of slugs) {
    const jsonPath = path.join(PROJECTS_DIR, slug, 'project.json');
    const raw = (await exists(jsonPath)) ? await readJson(jsonPath) : null;

    // Keep only "new" projects (user uploads) that have .webp renders.
    // Old projects with only jpg/png will be skipped.
    if (!(await hasWebpRenders(slug))) continue;

    const coverFilename = await findCoverFilename(raw, slug);
    if (!coverFilename) continue;

    const project = normalizeProject(raw, slug, coverFilename, yearDefault);
    const resolvedRenders = await resolveRenders(raw, slug);
    if (!resolvedRenders.length) continue;

    const galleryPath = path.join(PROJECTS_DIR, slug, 'gallery.json');
    await fs.writeFile(
      galleryPath,
      `${JSON.stringify({ title: project.title, renders: resolvedRenders }, null, 2)}\n`,
      'utf8'
    );

    const outHtml = applyTemplate(template, project);
    const outPath = path.join(PROJECTS_DIR, slug, 'index.html');
    await fs.writeFile(outPath, outHtml, 'utf8');

    projects.push(project);
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

