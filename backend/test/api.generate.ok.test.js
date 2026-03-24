import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import esmock from "esmock";
import fs from "node:fs/promises";
import path from "node:path";

async function readFixtureJson(relPath) {
  const p = path.resolve(relPath);
  return JSON.parse(await fs.readFile(p, "utf8"));
}

test("POST /generate returns artifacts + writes files", async () => {
  process.env.DATA_DIR = "./.tmp_test_data";

  // fixtures (golden)
  const cv = await readFixtureJson("test/fixtures/fr/cv.json");
  const sim = await readFixtureJson("test/fixtures/fr/sim.json");
  const interview = await readFixtureJson("test/fixtures/fr/interview.json");
  const dossier = await readFixtureJson("test/fixtures/fr/dossier.json");

  // import real storage AFTER DATA_DIR is set
  const { writeOrderArtifact } = await import("../src/storage.js");

  // mock orchestrator ONLY
  const orchestratorMock = {
    orchestrateOrder: async ({ orderId, languages }) => {
      const outputs = [];

      const langs = Array.isArray(languages) && languages.length ? languages : ["fr"];

      for (const language of langs) {
        // write artifacts
        await writeOrderArtifact(orderId, language, "cv.json", cv);
        await writeOrderArtifact(orderId, language, "sim.json", sim);
        await writeOrderArtifact(orderId, language, "interview.json", interview);
        await writeOrderArtifact(orderId, language, "dossier.json", dossier);

        outputs.push({
          language,
          artifacts: {
            cv_json: `orders/${orderId}/${language}/cv.json`,
            sim_json: `orders/${orderId}/${language}/sim.json`,
            interview_json: `orders/${orderId}/${language}/interview.json`,
            dossier_json: `orders/${orderId}/${language}/dossier.json`
          }
        });
      }

      return { order_id: orderId, status: "ok", outputs };
    }
  };

  const { createApp } = await esmock("../src/app.js", {
    "../src/orchestrator.js": orchestratorMock
  });

  const app = createApp();

  const reqBody = {
    meta: {
      candidate_id: "cand_test_0001",
      primary_country: "France",
      secondary_countries: ["Canada"],
      target_roles: ["Data Analyst"],
      industry: "SaaS",
      ats_max_pages: 1,
      recruiter_max_pages: 2
    },
    form: { any: "thing" },
    job_posting_text: "text",
    company_name: "SaaSCo",
    photo_provided: false,
    languages: ["fr"]
  };

  const res = await request(app)
    .post("/orders/test_001/generate")
    .send(reqBody);

  if (res.status !== 200) {
    console.error("STATUS =", res.status);
    console.error("BODY   =", JSON.stringify(res.body, null, 2));
  }

  assert.equal(res.status, 200);

  const artifacts = res.body.outputs[0].artifacts;

  await assert.doesNotReject(() => fs.access(path.join(".tmp_test_data", artifacts.cv_json)));
  await assert.doesNotReject(() => fs.access(path.join(".tmp_test_data", artifacts.sim_json)));
  await assert.doesNotReject(() => fs.access(path.join(".tmp_test_data", artifacts.interview_json)));
  await assert.doesNotReject(() => fs.access(path.join(".tmp_test_data", artifacts.dossier_json)));
  await fs.rm(".tmp_test_data", { recursive: true, force: true });

});
