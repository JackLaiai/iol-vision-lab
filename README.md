# IOL Vision Lab

A static, client-side prototype for a Traditional Chinese educational IOL vision simulator.

## Run locally

Open `index.html` directly in a browser.

For a local development server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy free

### GitHub Pages
1. Create a public GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`.
3. Settings → Pages → Deploy from branch → `main` / root.

### Vercel / Cloudflare Pages
Import the repository and deploy as a static site.

## Good next steps
- Replace illustrative parameters with literature-linked data.
- Add actual IOL product entries as a separate data layer.
- Add bilingual Traditional Chinese / English switching.
- Add patient lifestyle questionnaire and printable discussion summary.
- Add clinician mode with defocus curves and evidence citations.

## Safety
This prototype is for education and visualization only. It does not provide individualized medical advice or predict a patient's actual postoperative vision.
