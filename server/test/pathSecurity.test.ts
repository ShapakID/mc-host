import assert from "node:assert";
import test from "node:test";
import { resolveSafePath } from "../src/middleware/pathSecurity";

test("Path traversal security check", () => {
  const root = "C:\\mc-data";

  // Safe path inside root
  const safe = resolveSafePath("plugins/Geyser.jar", root);
  assert.ok(safe !== null);
  assert.ok(safe.includes("Geyser.jar"));

  // Directory traversal attempt
  const attack = resolveSafePath("../../windows/system32/cmd.exe", root);
  assert.strictEqual(attack, null);
});
