import { createServer, request as httpRequest } from "node:http";
import { isIP } from "node:net";

// Both ends are loopback-only. Do not publish the Next port or this proxy to
// untrusted networks: the app must receive the identity from this ingress.
const upstream = Number(process.env.DT524_APP_PORT ?? 3101);
const listen = Number(process.env.DT524_PROXY_PORT ?? 3100);

function forwardedHeaders(incoming, peer) {
  const headers = { ...incoming.headers };
  delete headers["x-trusted-client-ip"];
  delete headers["x-vercel-forwarded-for"];
  delete headers["x-forwarded-for"];
  delete headers["x-real-ip"];
  delete headers.connection;
  headers["x-trusted-client-ip"] = peer;
  // Keep the Host the browser used (this proxy's address). The admin CSRF check
  // compares it with the browser's Origin, so rewriting it to the app's port
  // made every admin change through the proxy fail with 403. Requests from other
  // sites still carry a different Origin and are still blocked.
  headers.host = incoming.headers.host ?? `127.0.0.1:${listen}`;
  return headers;
}

function trustedPeer(incoming) {
  const peer = incoming.socket.remoteAddress;
  return peer && isIP(peer) ? peer : null;
}

const server = createServer((incoming, outgoing) => {
  const peer = trustedPeer(incoming);
  if (!peer) {
    outgoing.writeHead(403).end();
    return;
  }
  const target = httpRequest(
    {
      hostname: "127.0.0.1",
      port: upstream,
      method: incoming.method,
      path: incoming.url,
      headers: forwardedHeaders(incoming, peer),
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    }
  );
  target.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.pipe(target);
});

// `next dev` loads the page only after its live-reload WebSocket (/_next/hmr)
// connects, so without this the admin pages render but never become usable.
server.on("upgrade", (incoming, socket, head) => {
  const peer = trustedPeer(incoming);
  if (!peer) {
    socket.destroy();
    return;
  }
  const headers = forwardedHeaders(incoming, peer);
  headers.connection = "Upgrade";
  const target = httpRequest({
    hostname: "127.0.0.1",
    port: upstream,
    method: incoming.method,
    path: incoming.url,
    headers,
  });
  target.on("upgrade", (response, upstreamSocket, upstreamHead) => {
    const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage}`];
    for (let i = 0; i < response.rawHeaders.length; i += 2) {
      lines.push(`${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}`);
    }
    socket.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    upstreamSocket.on("error", () => socket.destroy());
    socket.on("error", () => upstreamSocket.destroy());
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });
  target.on("response", (response) => {
    socket.end(`HTTP/1.1 ${response.statusCode ?? 502} ${response.statusMessage ?? ""}\r\n\r\n`);
  });
  target.on("error", () => socket.destroy());
  target.end();
});

server.listen(listen, "127.0.0.1", () => {
  console.log(
    `DT-524 proxy: http://127.0.0.1:${listen} -> 127.0.0.1:${upstream}`
  );
});
