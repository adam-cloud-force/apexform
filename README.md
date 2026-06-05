# APEXFORM

Science-backed looksmaxxing research site with a daily routine tracker, research library, and community forum UI.

## Local preview

```bash
cd apexform
npx --yes serve .
```

Open http://localhost:3000

## GitHub Pages (recommended)

1. Authenticate once:
   ```powershell
   gh auth login -h github.com -p https -w
   ```
2. Publish:
   ```powershell
   cd apexform
   .\publish.ps1
   ```

Live URL: `https://<your-username>.github.io/apexform/`

The GitHub Actions workflow in `.github/workflows/pages.yml` deploys automatically on every push to `main`.

## Other deploy options

### Netlify (drag & drop)

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `apexform` folder onto the page
3. Your site is live in ~30 seconds

### Netlify CLI

```bash
cd apexform
npx netlify deploy --prod --dir=.
```

### Vercel

```bash
cd apexform
npx vercel --prod
```

### GitHub Pages

1. Create a repo and push this folder
2. Settings → Pages → Deploy from branch → `main` / root
3. Site URL: `https://<username>.github.io/<repo>/`

## Project structure

```
apexform/
├── index.html      # App shell
├── css/main.css    # Styles
├── js/app.js       # Nav, tracker (localStorage), forum filter
├── assets/         # Favicon
├── netlify.toml
└── vercel.json
```

## Features

- Mobile nav menu
- Routine tracker with streaks (saved in browser localStorage)
- Hash routing (`#research`, `#tracker`, etc.)
- Forum category filters
- Join waitlist modal (emails stored locally until you wire a backend)

## Custom domain

After deploy, add your domain in Netlify/Vercel dashboard → Domain settings.
