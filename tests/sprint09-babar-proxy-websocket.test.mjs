import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer, request } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const proxyScript = fileURLToPath(
  new URL("../scripts/dt524-local-proxy.mjs", import.meta.url)
);

let app;
let proxy;
let proxyPort;
let lastUpgradeHeaders;

function freePort() {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// A stand-in for `next dev`: accepts upgrades on /_next/hmr and echoes what it
// receives, and refuses upgrades anywhere else.
before(async () => {
  app = createServer((req, res) => res.end("ok"));
  app.on("upgrade", (req, socket) => {
    lastUpgradeHeaders = req.headers;
    if (req.url !== "/_next/hmr") {
      socket.end("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n"
    );
    socket.on("data", (chunk) => socket.write(`echo:${chunk}`));
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  proxyPort = await freePort();

  proxy = spawn(process.execPath, [proxyScript], {
    env: {
      ...process.env,
      DT524_APP_PORT: String(app.address().port),
      DT524_PROXY_PORT: String(proxyPort),
    },
  });
  await new Promise((resolve, reject) => {
    proxy.stdout.on("data", (chunk) => {
      if (String(chunk).includes("DT-524 proxy:")) resolve();
    });
    proxy.on("exit", (code) => reject(new Error(`proxy exited with ${code}`)));
  });
});

after(() => {
  proxy?.kill();
  app?.close();
});

const nonce = () => randomBytes(16).toString("base64");

// Opens an upgrade through the proxy, the way the browser opens Next's
// live-reload connection.
function upgradeThroughProxy(path, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      host: "localhost",
      port: proxyPort,
      path,
      headers: {
        connection: "Upgrade",
        upgrade: "websocket",
        "sec-websocket-version": "13",
        // A fresh nonce, as browsers send (a fixed one looks like a key to the secret scan).
        "sec-websocket-key": nonce(),
        ...extraHeaders,
      },
    });
    req.on("upgrade", (res, socket) => resolve({ status: res.statusCode, socket }));
    req.on("response", (res) => {
      res.resume();
      resolve({ status: res.statusCode, socket: null });
    });
    req.on("error", reject);
    req.end();
  });
}

test("the dev live-reload WebSocket is forwarded both ways", async () => {
  const { status, socket } = await upgradeThroughProxy("/_next/hmr");
  assert.equal(status, 101);
  const reply = await new Promise((resolve) => {
    socket.once("data", (chunk) => resolve(String(chunk)));
    socket.write("ping");
  });
  socket.destroy();
  assert.equal(reply, "echo:ping");
});

test("upgrades carry the trusted client IP and drop spoofed ones", async () => {
  const { socket } = await upgradeThroughProxy("/_next/hmr", {
    "x-trusted-client-ip": "203.0.113.9",
    "x-forwarded-for": "203.0.113.9",
  });
  socket.destroy();
  assert.ok(["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(lastUpgradeHeaders["x-trusted-client-ip"]));
  assert.equal(lastUpgradeHeaders["x-forwarded-for"], undefined);
  // The browser's Host is kept, as for normal requests (CSRF check).
  assert.equal(lastUpgradeHeaders.host, `localhost:${proxyPort}`);
});

test("an upgrade the app refuses is passed back, not left hanging", async () => {
  const { status, socket } = await upgradeThroughProxy("/not-a-socket");
  assert.equal(status, 404);
  assert.equal(socket, null);
});
