# Privacy

- No accounts, no server-side sync. Your visited-anchor progress lives only in
  your browser's `localStorage` (key `knewzly-visited-v1`).
- Export/import is a plain JSON file you download and re-upload yourself —
  nothing is transmitted anywhere.
- The Today panel's news content is fetched by a scheduled build-time job, not
  by your browser — visiting the site makes no outbound requests to third
  parties beyond loading the static page itself.
