// Run locally: node scripts/hash-password.mjs
// Prompts for a password (input is not echoed to the terminal) and prints the
// salted PBKDF2 hash to stdout in the exact format the Worker's auth.ts expects
// (base64url salt : iterations : base64url hash). Pipe straight into wrangler:
//
//   node scripts/hash-password.mjs | npx wrangler secret put ADMIN_PASSWORD_HASH
//
// The raw password is never written anywhere and never leaves this process.

import { webcrypto as crypto } from "node:crypto";

const PBKDF2_ITERATIONS = 100_000;

function b64urlEncode(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readPasswordHidden(prompt) {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";
    const onData = (char) => {
      if (char === "") {
        // Ctrl+C
        process.exit(1);
      } else if (char === "\r" || char === "\n") {
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "" || char === "\b") {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await readPasswordHidden("New admin password: ");
const confirm = await readPasswordHidden("Confirm password: ");

if (password !== confirm) {
  console.error("Passwords do not match.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use at least 12 characters — this is your only login gate.");
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, keyMaterial, 256);
const hash = b64urlEncode(new Uint8Array(bits));

process.stdout.write(`${b64urlEncode(salt)}:${PBKDF2_ITERATIONS}:${hash}`);
