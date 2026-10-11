import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSummary } from "../src/summary.mjs";

const base = {
  application: "my-game",
  tag: "v1",
  environment: "sandbox",
  registered: true,
  regions: { europe: { available: true, waitedMs: 42_000 }, asia: { available: false } },
};

test("a passing run lists regions and the smoke test, without logs", () => {
  const md = renderSummary({
    ...base,
    smoke: { region: "europe", sessionId: "s1", host: "1.2.3.4", ports: [{ type: "udp", container: 7777, host: 49000 }], passed: true },
  });
  assert.match(md, /^### Gameye deploy: passed/);
  assert.match(md, /\| europe \| yes, after 42s \|/);
  assert.match(md, /\| asia \| no \|/);
  assert.match(md, /Smoke test in europe: passed/);
  assert.match(md, /49000\/udp → 7777/);
  assert.doesNotMatch(md, /<details>/);
});

test("a failure shows the error and fences the server's log so it can't break out", () => {
  const md = renderSummary(
    { ...base, smoke: { region: "europe", sessionId: "s1", host: "h", ports: [], passed: false, logTail: ["ok", "```", "<img src=x>"] } },
    new Error("Session s1 went to status \"exited\" | bad"),
  );
  assert.match(md, /^### Gameye deploy: failed/);
  assert.match(md, /> Session s1 went to status "exited" \\\| bad/);
  assert.match(md, /````text\nok\n```\n<img src=x>\n````/);
});

test("a run that failed before any region was checked still renders", () => {
  const md = renderSummary({ application: "a", tag: "t", environment: "production", regions: {} }, new Error("token rejected"));
  assert.match(md, /`a` tag `t` on production/);
  assert.match(md, /> token rejected/);
  assert.doesNotMatch(md, /\| Region/);
});
