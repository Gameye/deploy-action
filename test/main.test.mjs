import { test } from "node:test";
import assert from "node:assert/strict";
import { readInputs } from "../src/main.mjs";

const env = (extra = {}) => ({
  "INPUT_API-TOKEN": "t",
  INPUT_APPLICATION: "my-game",
  INPUT_TAG: "v1",
  INPUT_REGION: "europe",
  GITHUB_RUN_ID: "7",
  ...extra,
});

test("reads inputs with defaults", () => {
  const inputs = readInputs(env());
  assert.equal(inputs.origin, "https://api.sandbox-gameye.gameye.net");
  assert.equal(inputs.enableTag, true);
  assert.equal(inputs.waitForTag, true);
  assert.equal(inputs.smokeTest, false);
  assert.equal(inputs.waitTimeoutMs, 900_000);
  assert.equal(inputs.showLogs, "on-failure");
  assert.equal(inputs.runId, "7");
});

test("parses smoke inputs", () => {
  const inputs = readInputs(env({ "INPUT_SMOKE-TEST": "true", "INPUT_SMOKE-ARGS": "--a\n--b\n", "INPUT_SMOKE-ENV": "K=V" }));
  assert.equal(inputs.smokeTest, true);
  assert.deepEqual(inputs.args, ["--a", "--b"]);
  assert.deepEqual(inputs.env, { K: "V" });
});

test("rejects missing and invalid inputs", () => {
  assert.throws(() => readInputs(env({ INPUT_TAG: "" })), /tag is required/);
  assert.throws(() => readInputs(env({ "INPUT_SMOKE-TEST": "yes" })), /true or false/);
  assert.throws(() => readInputs(env({ "INPUT_SHOW-LOGS": "sometimes" })), /show-logs/);
});
