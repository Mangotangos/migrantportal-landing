# Vendored third-party libraries

Self-hosted so the CSP never needs a third-party CDN origin (unpkg.com was removed from
`_headers`). Do not edit these files by hand; update by replacing them from the upstream release.

| Library | Version | Path | Source | License |
|---|---|---|---|---|
| Ionicons | 7.4.0 | `vendor/ionicons/` (`dist/ionicons/` incl. `svg/`) | https://unpkg.com/ionicons@7.4.0/dist/ionicons/ (npm: `ionicons@7.4.0`) | MIT (`vendor/ionicons/LICENSE`) |
| qrcode-generator | 1.4.4 | `vendor/qrcode-generator/qrcode.js` | https://unpkg.com/qrcode-generator@1.4.4/qrcode.js (npm: `qrcode-generator@1.4.4`) | MIT, Kazuhiko Arase (header of `qrcode.js`) |
| Leaflet | 1.9.4 | `vendor/leaflet/leaflet.js`, `leaflet.css` | https://unpkg.com/leaflet@1.9.4/dist/ (npm: `leaflet@1.9.4`) | BSD-2-Clause, Vladimir Agafonkin |

Leaflet was vendored earlier (commit 3ce15e4); version read from the file header.
It ships images the CSS may reference, so check `requests.html` map markers after any update.

## How to update

1. Pick the new version and read its changelog.
2. Download the package into a scratch directory outside this repo:
   `npm pack ionicons@<ver>` (or `qrcode-generator@<ver>`, `leaflet@<ver>`), then extract it.
3. Replace the matching folder under `vendor/`:
   - Ionicons: copy `package/dist/ionicons/` over `vendor/ionicons/` (keep `svg/` and `LICENSE`;
     the hashed `p-*.js` chunk names change every release, so delete the old ones first).
   - qrcode-generator: copy `package/qrcode.js`.
   - Leaflet: copy `package/dist/leaflet.js` and `leaflet.css`.
4. Update the version in the table above and in any `?v=` query strings that reference the files.
5. Run the e2e suite against a preview or live (`npm run test:public` in `migrantportal-e2e`).
   The home page test checks that every `ion-icon` renders its SVG and nothing loads from unpkg.
6. Commit with `chore: update <lib> to <ver>`. Every push to `main` deploys the whole repo root.
