import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import esmock from "esmock";

test("POST /generate rejects invalid body", async () => {
  const { createApp } = await esmock("../src/app.js", {});
  const app = createApp();

  const res = await request(app)
    .post("/orders/test_001/generate")
    .send({ nope: true });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_request");
});
