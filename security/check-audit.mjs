import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Fails on any high or critical advisory in production dependencies unless it
// is listed in audit-exceptions.json with an owner, a reason and a review
// date. An audit that cannot reach the registry also fails: no result is not
// a clean result.

const BLOCKING = new Set(["high", "critical"]);
const today = new Date().toISOString().slice(0, 10);
const exceptions = JSON.parse(
  readFileSync(new URL("./audit-exceptions.json", import.meta.url), "utf8")
);

let output;
try {
  output = execSync("npm audit --omit=dev --json", {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  // npm audit exits 1 whenever it finds anything; the report is still on stdout.
  output = error.stdout;
}

let report = null;
try {
  report = JSON.parse(output);
} catch {
  // Handled below.
}

if (!report?.metadata?.vulnerabilities) {
  console.error(
    "npm audit returned no results (offline or registry error). Treat this as a failed check, not a pass."
  );
  process.exit(1);
}

// Each vulnerable package lists the advisories that affect it under `via`.
const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const via of vulnerability.via) {
    if (typeof via !== "object") continue;
    const id = via.url.split("/").pop();
    advisories.set(id, {
      id,
      package: via.name,
      severity: via.severity,
      title: via.title,
    });
  }
}

const blocking = [...advisories.values()].filter((a) =>
  BLOCKING.has(a.severity)
);
const unexcepted = blocking.filter((a) => !exceptions[a.id]);
const expired = blocking.filter(
  (a) => exceptions[a.id] && exceptions[a.id].reviewBy < today
);
const stale = Object.keys(exceptions).filter((id) => !advisories.has(id));

const counts = report.metadata.vulnerabilities;
console.log(
  `Production dependencies: ${counts.critical} critical, ${counts.high} high, ` +
    `${counts.moderate} moderate, ${counts.low} low.`
);
console.log(
  `${blocking.length} high/critical advisories, ${blocking.length - unexcepted.length} covered by an exception.`
);

for (const a of unexcepted) {
  console.log(`NOT ALLOWED  ${a.severity}  ${a.package}  ${a.id}  ${a.title}`);
}
for (const a of expired) {
  console.log(
    `EXPIRED      ${a.package}  ${a.id}  review was due ${exceptions[a.id].reviewBy} (owner: ${exceptions[a.id].owner})`
  );
}
for (const id of stale) {
  console.log(`NO LONGER NEEDED  ${id}  can be removed from audit-exceptions.json`);
}

process.exit(unexcepted.length || expired.length ? 1 : 0);
