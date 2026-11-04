import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

// Private migration payloads and service credentials never echo in the PTY.
export async function readPrivateJson() {
  const terminal = Boolean(process.stdin.isTTY);
  if (terminal) { const result = spawnSync("stty", ["-echo"], { stdio: "inherit" }); if (result.status !== 0) throw new Error("Cannot hide terminal input"); }
  const input = createInterface({ input: process.stdin, terminal: false });
  try {
    console.log("Ready for private migration base64 blocks; finish with a dot line (input is hidden).");
    const parts = []; let complete = false;
    for await (const line of input) { if (line === ".") { complete = true; break; } if (!/^[a-zA-Z0-9+/=]+$/.test(line)) throw new Error("Invalid private input encoding"); parts.push(line); }
    if (!complete) throw new Error("Incomplete private migration input");
    try { return JSON.parse(Buffer.from(parts.join(""), "base64").toString("utf8")); }
    catch { throw new Error("Invalid private migration JSON; contents omitted"); }
  } finally { input.close(); process.stdin.pause(); if (terminal) spawnSync("stty", ["echo"], { stdio: "inherit" }); }
}
