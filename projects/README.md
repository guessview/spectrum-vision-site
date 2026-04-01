# Projects (easy add / scale to 50+)

This site is **data-driven**:

- Each project lives in `projects/<project-slug>/`
- Each project has a `project.json` file
- Running the generator creates/updates:
  - `projects/projects.json` (used by the homepage “Work” section)
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

## Recommended render filenames

- `01.jpg`, `02.jpg`, `03.jpg`, ...

## `project.json` example

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
