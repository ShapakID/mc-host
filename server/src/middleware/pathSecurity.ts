import path from "path";
import { config } from "../config";

/**
 * Validates that requested relative path stays strictly inside root directory
 * Prevents directory traversal attacks (../)
 */
export function resolveSafePath(userPath: string, rootDir: string = config.mcServerDir): string | null {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, userPath);
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolvedPath;
}
