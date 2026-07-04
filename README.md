# Jenny's Wildflower Quiz — a Pacific Northwest Wildflower Quiz

A single-page photo quiz built around 46 real Pacific Northwest wildflowers. Pick a round length, look at a real trail photo, and pick the correct common name from four choices. There's also a browsable field guide with search and color filtering.

## Running locally

No build step — it's static HTML/CSS/JS. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Structure

- `index.html`, `styles.css`, `app.js` — the app
- `data.js` — the 46-species dataset (name, scientific name, family, color, image path)
- `images/` — wildflower photographs (Wikimedia Commons; see `images/credits.json` for photographer & license, also viewable in-app via "View photo credits")
- `fonts/` — self-hosted Fraunces, Public Sans, and IBM Plex Mono (OFL)
- `.github/workflows/deploy.yml` — publishes the site to GitHub Pages on push
