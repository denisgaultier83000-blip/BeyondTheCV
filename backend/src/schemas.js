import fs from "fs";
import path from "path";

export function loadSchema(filename) {
  const p = path.resolve(process.cwd(), "config", "schemas", filename);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
