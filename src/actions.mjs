// Minimal stand-in for @actions/core, so the action ships with no dependencies.
import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export function getInput(name, env = process.env) {
  return (env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "").trim();
}

function escapeCommand(value) {
  return String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function appendKeyValue(file, name, value) {
  const delimiter = `ghadelimiter_${randomUUID()}`;
  appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export function setOutput(name, value, env = process.env) {
  if (env.GITHUB_OUTPUT) appendKeyValue(env.GITHUB_OUTPUT, name, value);
}

export function saveState(name, value, env = process.env) {
  if (env.GITHUB_STATE) appendKeyValue(env.GITHUB_STATE, name, value);
}

export function getState(name, env = process.env) {
  return env[`STATE_${name}`] ?? "";
}

export function setSecret(value) {
  if (value) process.stdout.write(`::add-mask::${escapeCommand(value)}\n`);
}

export function info(message) {
  process.stdout.write(`${message}\n`);
}

export function warning(message) {
  process.stdout.write(`::warning::${escapeCommand(message)}\n`);
}

export function error(message) {
  process.stdout.write(`::error::${escapeCommand(message)}\n`);
}

export function startGroup(title) {
  process.stdout.write(`::group::${escapeCommand(title)}\n`);
}

export function endGroup() {
  process.stdout.write("::endgroup::\n");
}
