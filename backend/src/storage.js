import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

export async function writeOrderArtifact(orderId, lang, filename, json) {
  const dir = path.join(DATA_DIR, "orders", orderId, lang);
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, filename);
  await fs.writeFile(full, JSON.stringify(json, null, 2), "utf-8");
  return full;
}
