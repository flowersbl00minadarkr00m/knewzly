# Knewzly

Explore AI/innovation history as one connected timeline across regions, then trace today's AI news back to the historical event it descends from.

[Docs](docs/) · [License](LICENSE)

![The Global History Atlas timeline, showing philosophy and regional lanes of historical anchors](docs/assets/atlas-hero.jpg)

## Features

- A curated 50-anchor history spine (1940s–present) laid across time and region/philosophy lanes, with typed relationships between events.
- A toggleable constellation view — the same anchors and relationships as a force-directed graph.
- A context drawer on every anchor: the people, sources, and story behind it.
- Visited-anchor tracking in your browser, exportable/importable as a JSON file — no account.
- A live Today panel tracing current AI news back to its historical anchor, filterable by category.
- Newspaper-style Today layout with a small, human-reviewed news-source allowlist.

## Quick start

```bash
git clone https://github.com/flowersbl00minadarkr00m/knewzly.git && cd knewzly
npx serve .
```

Open `http://localhost:3000/atlas.html` for the timeline, or `http://localhost:3000/today.html` for the news panel.

![The Today panel in its newspaper layout, with category filter chips](docs/assets/today-newspaper.jpg)

## How it works

Static pages, no backend, no build step — content lives as versioned JSON validated against schemas, and a scheduled job publishes the Today panel's news feed from a reviewed source allowlist. Details: [docs/architecture.md](docs/architecture.md).

## Privacy

- No accounts, no server-side sync — visited-anchor progress lives only in your browser.
- Export/import is a plain JSON file you control.
- Details: [docs/privacy.md](docs/privacy.md).

## Testing

```bash
npm test
```

## License

[MIT](LICENSE)
