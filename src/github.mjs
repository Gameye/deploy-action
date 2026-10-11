// Records the run as a GitHub Deployment, so the repository shows what is on Gameye.
// Optional: a failure here is a warning and never fails the deploy.

export function createDeploymentRecorder({ env = process.env, fetch = globalThis.fetch, core, token, environment, report }) {
  const api = env.GITHUB_API_URL || "https://api.github.com";
  const repo = env.GITHUB_REPOSITORY;
  const runUrl = `${env.GITHUB_SERVER_URL || "https://github.com"}/${repo}/actions/runs/${env.GITHUB_RUN_ID}`;
  let deploymentId;

  async function call(path, body) {
    const response = await fetch(`${api}/repos/${repo}${path}`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const hint = response.status === 403 || response.status === 404 ? " Give the job `permissions: deployments: write`." : "";
      throw new Error(`GitHub returned HTTP ${response.status}.${hint}`);
    }
    return response.json();
  }

  async function status(state, description) {
    if (!deploymentId) return;
    try {
      await call(`/deployments/${deploymentId}/statuses`, { state, log_url: runUrl, description: description.slice(0, 140) });
    } catch (error) {
      core.warning(`Could not update the GitHub deployment: ${error.message}`);
    }
  }

  return {
    async start() {
      try {
        const deployment = await call("/deployments", {
          ref: env.GITHUB_SHA,
          environment,
          auto_merge: false,
          required_contexts: [],
          production_environment: report.environment === "production",
          description: `${report.application}:${report.tag} on Gameye ${report.environment}`.slice(0, 140),
          payload: { application: report.application, tag: report.tag, gameyeEnvironment: report.environment },
        });
        deploymentId = deployment.id;
        await status("in_progress", "Deploying to Gameye");
      } catch (error) {
        core.warning(`Could not create a GitHub deployment: ${error.message}`);
      }
    },
    finish(error) {
      return status(error ? "failure" : "success", error ? error.message : `${report.tag} is live on Gameye`);
    },
  };
}
