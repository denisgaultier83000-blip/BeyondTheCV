import test from "node:test";
import assert from "node:assert/strict";
import esmock from "esmock";

test("generateWithRetry retries once after schema validation failure", async () => {
  let callCount = 0;

  // 1️⃣ Mock OpenAI: 1er appel invalide, 2e valide
  const callStructured = async () => {
    callCount++;

    if (callCount === 1) {
      // JSON invalide (manque champs requis)
      return { foo: "bar" };
    }

    if (callCount === 2) {
      // JSON valide minimal
      return {
        meta: {
          version: "v1",
          generated_at_utc: "2026-01-10T10:00:00.000Z",
          primary_country: "France",
          secondary_countries: [],
          target_role: "Data Analyst",
          industry: "SaaS",
          language: "fr",
          ats_max_pages: 1,
          recruiter_max_pages: 2
        },
        input_summary: "ok",
        selection_rationale: "ok",
        cv: {
          header: { title: "Alex Martin", subtitle: null },
          experience: [],
          education: [],
          skills: []
        },
        alternates: []
      };
    }

    throw new Error("callStructured called too many times");
  };

  // 2️⃣ Mock validator: throw sur le 1er JSON uniquement
  let validateCount = 0;
  const validateJsonOrThrow = () => {
    validateCount++;
    if (validateCount === 1) {
      throw new Error("Schema validation failed");
    }
  };

  // 3️⃣ Import generateWithRetry avec mocks
  const { generateWithRetry } = await esmock(
    "../src/orchestrator.js",
    {
      "../src/openaiClient.js": { callStructured },
      "../src/validators.js": { validateJsonOrThrow }
    }
  );

  // 4️⃣ Exécution
  const result = await generateWithRetry({
    schema: {},          // ignoré par le mock
    prompt: "test",
    maxRetries: 2
  });

  // 5️⃣ Assertions
  assert.equal(callCount, 2, "callStructured must be retried once");
  assert.ok(result.cv, "final result must be valid");
});
