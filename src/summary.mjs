// Renders the job summary shown on the workflow run page from what the run recorded.

function cell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function seconds(ms) {
  return `${Math.round(ms / 1000)}s`;
}

// A fence longer than any backtick run in the text, so server output can't close it.
function fenced(text) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}

function portsText(ports) {
  if (!ports?.length) return "none";
  return ports.map((p) => `${p.host}/${p.type} → ${p.container}`).join(", ");
}

export function renderSummary(report, error) {
  const lines = [
    `### Gameye deploy: ${error ? "failed" : "passed"}`,
    "",
    `\`${report.application}\` tag \`${report.tag}\` on ${report.environment}`,
    "",
  ];
  if (report.registered) lines.push("- Registered the tag with the application.");

  const regions = Object.entries(report.regions);
  if (regions.length) {
    lines.push("", "| Region | Tag pulled |", "|---|---|");
    for (const [region, state] of regions) {
      lines.push(`| ${cell(region)} | ${state.available ? `yes, after ${seconds(state.waitedMs)}` : "no"} |`);
    }
  }

  const smoke = report.smoke;
  if (smoke) {
    lines.push(
      "",
      `**Smoke test in ${cell(smoke.region)}: ${smoke.passed ? "passed" : "failed"}**`,
      "",
      `- Session \`${smoke.sessionId}\` on \`${smoke.host}\``,
      `- Ports: ${portsText(smoke.ports)}`,
    );
  }

  if (error) lines.push("", `> ${cell(error.message)}`);

  if (smoke?.logTail?.length) {
    lines.push(
      "",
      "<details><summary>Last server log lines</summary>",
      "",
      fenced(smoke.logTail.join("\n")),
      "",
      "</details>",
    );
  }
  return `${lines.join("\n")}\n`;
}
