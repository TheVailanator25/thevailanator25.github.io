# EVE website

Minimal public information site for EVE Personal Assistant, with a full-height amber orb, an Eve heading, a Personal Assistant caption in Aurebesh, and About, Privacy and Terms pages.

This repository contains only the website. There is no assistant backend, OAuth client configuration, email connection or user data here.

## Development

Requires Node.js 22.12+ or a supported newer version.

```sh
npm ci
npm run dev
```

## Publish

```sh
npm run build
```

Commit the website sources and generated `docs/` directory. GitHub Pages serves `docs/` from the `main` branch at https://thevailanator25.github.io/.

The orb uses Three.js. Its MIT license is included at `public/THREE-LICENSE.txt` and in the built website. The orb pauses when the page is hidden, respects reduced motion and includes a manual pause control. The heading, caption and information links remain available without JavaScript or WebGL. Oxanium and Aurebesh fonts are bundled locally with their license notices in `public/fonts/`.

Before offering a public product or changing data practices, review the information and policy pages against the shipped application.
