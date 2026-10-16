"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
const pathSecurity_1 = require("../src/middleware/pathSecurity");
(0, node_test_1.default)("Path traversal security check", () => {
    const root = "C:\\mc-data";
    // Safe path inside root
    const safe = (0, pathSecurity_1.resolveSafePath)("plugins/Geyser.jar", root);
    node_assert_1.default.ok(safe !== null);
    node_assert_1.default.ok(safe.includes("Geyser.jar"));
    // Directory traversal attempt
    const attack = (0, pathSecurity_1.resolveSafePath)("../../windows/system32/cmd.exe", root);
    node_assert_1.default.strictEqual(attack, null);
});
