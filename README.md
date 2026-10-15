# Online Paste Board

A tiny self-hosted pasteboard. Type or paste content on one computer, click **Save**,
then open the same URL on another computer and click **Copy**.

- No dependencies — just Node.js 18+
- Multiple boards by URL: `/` uses the `default` board, `/work` uses the `work` board, and so on
- Content is saved to disk (`data/`) and survives restarts
- Other open tabs pick up new saves automatically (every 5 s) without overwriting unsaved edits
- Optional password protection

## Run

```bash
npm start
# Paste Board running at http://localhost:3000
```

From another computer on the same network, open `http://<server-ip>:3000`.
To reach it over the internet, deploy it to any host that runs Node.js
(Render, Railway, Fly.io, a VPS…) and give it a persistent disk for `data/`.

## Configuration

| Variable         | Default   | Description                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| `PORT`           | `3000`    | Port to listen on                                        |
| `HOST`           | `0.0.0.0` | Interface to bind                                        |
| `DATA_DIR`       | `./data`  | Where boards are stored                                  |
| `BOARD_PASSWORD` | *(none)*  | If set, the browser asks for it (any username works)     |

Set `BOARD_PASSWORD` whenever the server is reachable from the internet —
otherwise anyone with the URL can read and overwrite your boards.

## API

```
GET /api/boards/<name>    -> { "content": "...", "updatedAt": "ISO date" | null }
PUT /api/boards/<name>    body: { "content": "..." }   (max 1 MB)
```

Board names may contain letters, numbers, `-` and `_` (up to 64 characters).

## Test

```bash
npm test
```
