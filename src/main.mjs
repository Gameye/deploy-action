import { pathToFileURL } from "node:url";
import * as core from "./actions.mjs";
import { createClient, resolveOrigin } from "./gameye.mjs";
import { ActionFailure, parseBoolean, parseDuration, parseEnv, parseLines, run } from "./run.mjs";

export function readInputs(env = process.env) {
  const input = (name) => core.getInput(name, env);
  const showLogs = input("show-logs") || "on-failure";
  if (!["on-failure", "always", "never"].includes(showLogs)) {
    throw new ActionFailure(`show-logs must be on-failure, always or never (got "${showLogs}").`);
  }
  for (const name of ["api-token", "application", "tag"]) {
    if (!input(name)) throw new ActionFailure(`Input ${name} is required.`);
  }
  return {
    token: input("api-token"),
    origin: resolveOrigin(input("environment") || "sandbox", input("api-url")),
    application: input("application"),
    tag: input("tag"),
    region: input("region"),
    enableTag: parseBoolean(input("enable-tag") || "true", "enable-tag"),
    waitForTag: parseBoolean(input("wait-for-tag") || "true", "wait-for-tag"),
    waitTimeoutMs: parseDuration(input("wait-timeout") || "15m", "wait-timeout"),
    smokeTest: parseBoolean(input("smoke-test") || "false", "smoke-test"),
    smokeDurationMs: parseDuration(input("smoke-duration") || "60s", "smoke-duration"),
    startupTimeoutMs: parseDuration(input("startup-timeout") || "3m", "startup-timeout"),
    args: parseLines(input("smoke-args")),
    env: parseEnv(input("smoke-env")),
    showLogs,
    runId: env.GITHUB_RUN_ID ?? "",
  };
}

async function main() {
  try {
    core.setSecret(core.getInput("api-token"));
    const inputs = readInputs();
    // Masking short values like "1" or "true" would garble the whole log.
    Object.values(inputs.env).filter((value) => value.length >= 4).forEach(core.setSecret);
    if (inputs.smokeTest && (inputs.args.length || Object.keys(inputs.env).length)) {
      core.info("Note: a warm pool ignores smoke-args and smoke-env; the session then runs with the pool's settings.");
    }
    const client = createClient({ origin: inputs.origin, token: inputs.token });
    await run(inputs, {
      client,
      core,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: Date.now,
    });
  } catch (error) {
    core.error(error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
