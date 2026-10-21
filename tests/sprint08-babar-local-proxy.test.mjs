import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { NextRequest, NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const proxyScript = fileURLToPath(
  new URL("../scripts/dt524-local-proxy.mjs", import.meta.url)
);

// The real CSRF check, loaded with the real NextResponse.
const { middleware } = loadModule("middleware.ts", {
  mocks: { "next/server": { NextRequest, NextResponse } },
});

let app;
let proxy;
let proxyPort;
let lastHeaders;

function freePort() {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// A stand-in for the Next app that records the headers the proxy forwards.
before(async () => {
  app = createServer((req, res) => {
    lastHeaders = req.headers;
    res.end("ok");
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

// Sends an admin change through the proxy the way a browser would.
function postThroughProxy(origin) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: proxyPort,
        method: "POST",
        path: "/api/admin/services",
        headers: { origin, "content-type": "application/json" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(lastHeaders));
      }
    );
    req.on("error", reject);
    req.end("{}");
  });
}

// Runs what the app received through the real middleware.
function middlewareStatus(headers) {
  const forwarded = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (name !== "host") forwarded.set(name, value);
  }
  const req = {
    method: "POST",
    url: `http://${headers.host}/api/admin/services`,
    nextUrl: new URL(`http://${headers.host}/api/admin/services`),
    headers: { get: (name) => (name === "host" ? headers.host : forwarded.get(name)) },
    cookies: { get: () => undefined },
  };
  return middleware(req).status;
}

test("the app receives the Host the browser used", async () => {
  const headers = await postThroughProxy(`http://127.0.0.1:${proxyPort}`);

  assert.equal(headers.host, `127.0.0.1:${proxyPort}`);
  assert.equal(headers["x-trusted-client-ip"], "127.0.0.1");
});

test("a same-site admin change through the proxy passes the CSRF check", async () => {
  const headers = await postThroughProxy(`http://127.0.0.1:${proxyPort}`);

  assert.notEqual(middlewareStatus(headers), 403);
});

test("a change from another site is still blocked", async () => {
  const headers = await postThroughProxy("https://evil.example");

  assert.equal(middlewareStatus(headers), 403);
});
