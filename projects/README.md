# Projects (easy add / scale to 50+)

This site is **data-driven**:

- Each project lives in `projects/<project-slug>/`
- Each project has a `project.json` file
- Running the generator creates/updates:
  - `projects/projects.json` (used by the homepage “Work” section)
  - `projects/<project-slug>/gallery.json` (gallery list the browser loads)
  - `projects/<project-slug>/index.html` (project page)

## Add a new project (no code edits)

1) Create a folder:

- `projects/<project-slug>/`

2) Add files:

- `projects/<project-slug>/cover.jpg`
- `projects/<project-slug>/renders/01.jpg` (and more)
- `projects/<project-slug>/project.json`

3) Run generator:

```bash
npm run generate
```

That’s it — the homepage and project page will be updated/generated.

## Renders: any filenames (`"renders": "auto"`)

Browsers **cannot** list a folder automatically. The generator **can**, at build time.

Set this in `project.json`:

```json
"renders": "auto"
```

Then drop images into `renders/` with **any names** you want (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`). Run:

```bash
npm run generate
```

The tool scans `renders/`, sorts names (numeric-aware), and writes `gallery.json`.

Optional — mark specific files as wide tiles (by **filename only**):

```json
"renders": "auto",
"wideFilenames": ["hero.png", "lobby-wide.jpg"]
```

## Manual list (explicit order / `wide` flags)

If you prefer full control, keep `renders` as an array (like the example below). Generator still writes `gallery.json` from that list.

## `project.json` example

```json
{
  "title": "My New Project",
  "cardCategory": "Residential — Tbilisi",
  "meta": "Residential — Tbilisi · Architecture · 2026",
  "year": 2026,
  "cover": "cover.jpg",
  "renders": "auto",
  "wideFilenames": ["01.jpg"]
}
```

Or manual (full `project.json`):

```json
{
  "title": "My New Project",
  "cardCategory": "Residential — Tbilisi",
  "meta": "Residential — Tbilisi · Architecture · 2026",
  "year": 2026,
  "cover": "cover.jpg",
  "renders": [
    { "src": "renders/01.jpg", "wide": true },
    { "src": "renders/02.jpg" }
  ]
}
```
