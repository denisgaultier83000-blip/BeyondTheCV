import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import esmock from "esmock";

test("GET /health returns ok", async () => {
  const { createApp } = await esmock("../src/app.js", {});
  const app = createApp();

  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});
