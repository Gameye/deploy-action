import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeploymentRecorder } from "../src/github.mjs";

const env = {
  GITHUB_API_URL: "https://api.github.test",
  GITHUB_SERVER_URL: "https://github.test",
  GITHUB_REPOSITORY: "acme/game",
  GITHUB_RUN_ID: "9",
  GITHUB_SHA: "abc123",
};
const report = { application: "my-game", tag: "v1", environment: "sandbox" };

function recorder(responses) {
  const requests = [];
  const warnings = [];
  const fetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
    const { status = 201, json = {} } = responses.shift() ?? {};
    return new Response(JSON.stringify(json), { status });
  };
  const core = { warning: (m) => warnings.push(m) };
  return { rec: createDeploymentRecorder({ env, fetch, core, token: "gh", environment: "gameye-sandbox", report }), requests, warnings };
}

test("creates a deployment for the commit, then marks it in progress and successful", async () => {
  const { rec, requests, warnings } = recorder([{ json: { id: 5 } }, {}, {}]);
  await rec.start();
  await rec.finish();
  assert.equal(requests[0].url, "https://api.github.test/repos/acme/game/deployments");
  assert.equal(requests[0].body.ref, "abc123");
  assert.equal(requests[0].body.environment, "gameye-sandbox");
  assert.equal(requests[0].body.production_environment, false);
  assert.equal(requests[0].auth, "Bearer gh");
  assert.deepEqual(requests.slice(1).map((r) => [r.url, r.body.state]), [
    ["https://api.github.test/repos/acme/game/deployments/5/statuses", "in_progress"],
    ["https://api.github.test/repos/acme/game/deployments/5/statuses", "success"],
  ]);
  assert.equal(requests[2].body.log_url, "https://github.test/acme/game/actions/runs/9");
  assert.deepEqual(warnings, []);
});

test("marks the deployment failed with the error", async () => {
  const { rec, requests } = recorder([{ json: { id: 5 } }, {}, {}]);
  await rec.start();
  await rec.finish(new Error("smoke test failed"));
  assert.equal(requests[2].body.state, "failure");
  assert.equal(requests[2].body.description, "smoke test failed");
});

test("a missing permission is a warning, and later updates are skipped", async () => {
  const { rec, requests, warnings } = recorder([{ status: 403 }]);
  await rec.start();
  await rec.finish();
  assert.equal(requests.length, 1);
  assert.match(warnings[0], /deployments: write/);
});
