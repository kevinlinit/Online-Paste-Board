'use strict';

// Minimal end-to-end test: start the server on a random port with a temp data
// directory, save to a board, and read it back.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pasteboard-'));
const server = require('./server');

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  try {
    let res = await fetch(`${base}/api/boards/test`);
    assert.deepStrictEqual(await res.json(), { content: '', updatedAt: null });

    res = await fetch(`${base}/api/boards/test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello\nworld' }),
    });
    assert.strictEqual(res.status, 200);

    res = await fetch(`${base}/api/boards/test`);
    const board = await res.json();
    assert.strictEqual(board.content, 'hello\nworld');
    assert.ok(board.updatedAt);

    res = await fetch(`${base}/api/boards/..%2Fetc`);
    assert.strictEqual(res.status, 400);

    res = await fetch(`${base}/api/boards/test`, { method: 'PUT', body: '{"content":1}' });
    assert.strictEqual(res.status, 400);

    res = await fetch(`${base}/test`);
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /Paste Board/);

    console.log('All tests passed');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.close();
    fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  }
});
