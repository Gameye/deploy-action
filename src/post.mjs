// Runs after the job's steps, including when the run was cancelled mid smoke test.
import * as core from "./actions.mjs";
import { createClient, resolveOrigin } from "./gameye.mjs";

const id = core.getState("session-id");
if (id) {
  try {
    const client = createClient({
      origin: resolveOrigin(core.getInput("environment") || "sandbox", core.getInput("api-url")),
      token: core.getInput("api-token"),
    });
    if ((await client.stopSession(id)) === "stopped") core.info(`Stopped leftover smoke-test session ${id}.`);
  } catch (error) {
    core.warning(`Could not stop smoke-test session ${id}: ${error.message}. Its TTL will end it.`);
  }
}
