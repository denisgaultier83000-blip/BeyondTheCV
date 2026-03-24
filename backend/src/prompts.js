import fs from "fs";
import path from "path";

export function loadPrompt(filename) {
  const p = path.resolve(process.cwd(), "config", "prompts", filename);
  return fs.readFileSync(p, "utf-8");
}
