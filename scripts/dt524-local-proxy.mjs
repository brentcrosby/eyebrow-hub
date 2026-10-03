import { createServer, request as httpRequest } from "node:http";
import { isIP } from "node:net";

// Both ends are loopback-only. Do not publish the Next port or this proxy to
// untrusted networks: the app must receive the identity from this ingress.
const upstream = Number(process.env.DT524_APP_PORT ?? 3101);
const listen = Number(process.env.DT524_PROXY_PORT ?? 3100);
const server = createServer((incoming, outgoing) => {
  const peer = incoming.socket.remoteAddress;
  if (!peer || !isIP(peer)) {
    outgoing.writeHead(403).end();
    return;
  }
  const headers = { ...incoming.headers };
  delete headers["x-trusted-client-ip"];
  delete headers["x-vercel-forwarded-for"];
  delete headers["x-forwarded-for"];
  delete headers["x-real-ip"];
  delete headers.connection;
  headers["x-trusted-client-ip"] = peer;
  headers.host = `127.0.0.1:${upstream}`;
  const target = httpRequest(
    {
      hostname: "127.0.0.1",
      port: upstream,
      method: incoming.method,
      path: incoming.url,
      headers,
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
server.listen(listen, "127.0.0.1", () => {
  console.log(
    `DT-524 proxy: http://127.0.0.1:${listen} -> 127.0.0.1:${upstream}`
  );
});
