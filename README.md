# wjeather

One screen of weather. The current temperature, set large, over a line graph of the next 12 hours: time runs down the screen (now at the top, +12 hours at the bottom), temperature runs across it.

Live at [wjeather.pages.dev](https://wjeather.pages.dev).

## Developing

```sh
npm install
npm run dev
```

## Deploying

Cloudflare Pages, connected to this repo — every push to `main` deploys.

- Build command: `npm run build`
- Output directory: `.svelte-kit/cloudflare`

## Credits

- **Weather data:** [Open-Meteo.com](https://open-meteo.com/), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Forecast and geocoding APIs, no key required.
- **Typeface:** [Basteleur](https://velvetyne.fr/fonts/basteleur/) by Keussel, published by Velvetyne, [SIL Open Font License 1.1](static/fonts/LICENSE-Basteleur.txt).
- **Design tokens:** `src/lib/kit.css`, copied from `color-system-and-guidelines`.

Built with SvelteKit and Tailwind CSS.
