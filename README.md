# Online Paste Board

A tiny pasteboard. Type or paste content on one computer, click **Save**,
then open the same page on another computer and click **Copy**.

There are two versions:

- **GitHub Pages** (`index.html`) — static, nothing to host. Text is stored in a
  private (secret) GitHub Gist on your own account.
- **Self-hosted Node.js server** (`server.js` + `public/`) — stores text on your own server.

## GitHub Pages version

Live at **https://kevinlinit.github.io/Online-Paste-Board/**

1. On each computer, open the page and click **Create a GitHub token**. That opens GitHub
   with only the `gist` scope pre-selected. Generate the token and paste it into the page.
2. The first save creates a secret gist named “Online Paste Board”. Other computers
   signed in with a token for the same account find it automatically.
3. Use different boards with the URL hash, e.g. `…/Online-Paste-Board/#work`.

The token is kept only in that browser's `localStorage`; **Sign out** removes it.
Only sign in on computers you trust, and give the token an expiration date.
Secret gists are unlisted, not encrypted: anyone who has the gist's URL can read it.

Deployment: GitHub Pages serves the repo root of `master` (**Settings → Pages →
Deploy from a branch → master / (root)**), so every push to `master` redeploys `index.html`.

## Self-hosted server version

- No dependencies — just Node.js 18+
- Multiple boards by URL: `/` uses the `default` board, `/work` uses the `work` board, and so on
- Content is saved to disk (`data/`) and survives restarts
- Other open tabs pick up new saves automatically (every 5 s) without overwriting unsaved edits
- Optional password protection

### Run

```bash
npm start
# Paste Board running at http://localhost:3000
```

From another computer on the same network, open `http://<server-ip>:3000`.
To reach it over the internet, deploy it to any host that runs Node.js
(Render, Railway, Fly.io, a VPS…) and give it a persistent disk for `data/`.

### Configuration

| Variable         | Default   | Description                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| `PORT`           | `3000`    | Port to listen on                                        |
| `HOST`           | `0.0.0.0` | Interface to bind                                        |
| `DATA_DIR`       | `./data`  | Where boards are stored                                  |
| `BOARD_PASSWORD` | *(none)*  | If set, the browser asks for it (any username works)     |

Set `BOARD_PASSWORD` whenever the server is reachable from the internet —
otherwise anyone with the URL can read and overwrite your boards.

### API

```
GET /api/boards/<name>    -> { "content": "...", "updatedAt": "ISO date" | null }
PUT /api/boards/<name>    body: { "content": "..." }   (max 1 MB)
```

Board names may contain letters, numbers, `-` and `_` (up to 64 characters).

### Test

```bash
npm test
```
