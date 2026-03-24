import { loadPrompt } from "./prompts.js";
import { loadSchema } from "./schemas.js";
import { callStructured } from "./openaiClient.js";
import { validateJsonOrThrow } from "./validators.js";
import { writeOrderArtifact } from "./storage.js";

export async function orchestrateOrder({
  orderId,
  meta,
  form,
  job_posting_text = null,
  company_name = null,
  photo_provided = false,
  languages
}) {
  const outputs = [];

  for (const language of languages) {
    const ctx = buildContext({ orderId, language, meta, form, job_posting_text, company_name, photo_provided });

    // 1) CV
    const cvPrompt = fill(loadPrompt("cv_json_v1.txt"), ctx);
    const cvSchema = loadSchema("cv.schema.json");
    const cvJson = await generateWithRetry({ name: "cv", schema: cvSchema, prompt: cvPrompt, maxRetries: 1 });
    await writeOrderArtifact(orderId, language, "cv.json", cvJson);

    // 2) Simulator
    const simPrompt = fill(loadPrompt("sim_json_v1.txt"), { ...ctx, CV_JSON: JSON.stringify(cvJson) });
    const simSchema = loadSchema("sim.schema.json");
    const simJson = await generateWithRetry({ name: "sim", schema: simSchema, prompt: simPrompt, maxRetries: 1 });
    await writeOrderArtifact(orderId, language, "sim.json", simJson);

    // 3) Interview
    const interviewPrompt = fill(loadPrompt("interview_json_v1.txt"), {
      ...ctx,
      CV_JSON: JSON.stringify(cvJson),
      SIM_JSON: JSON.stringify(simJson)
    });
    const interviewSchema = loadSchema("interview.schema.json");
    const interviewJson = await generateWithRetry({ name: "interview", schema: interviewSchema, prompt: interviewPrompt, maxRetries: 1 });
    await writeOrderArtifact(orderId, language, "interview.json", interviewJson);

    // 4) Dossier
    const dossierPrompt = fill(loadPrompt("dossier_json_v1.txt"), {
      ...ctx,
      META_JSON: JSON.stringify({ ...meta, language })
    });
    const dossierSchema = loadSchema("dossier.schema.json");
    const dossierJson = await generateWithRetry({ name: "dossier", schema: dossierSchema, prompt: dossierPrompt, maxRetries: 1 });
    await writeOrderArtifact(orderId, language, "dossier.json", dossierJson);

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
  if (!outputs.length || !outputs.some(o => o.artifacts && Object.keys(o.artifacts).length > 0)) {
    throw new Error("No artifacts were produced");
  }
  return { order_id: orderId, status: "ok", outputs };
}

function buildContext({ orderId, language, meta, form, job_posting_text, company_name, photo_provided }) {
  return {
    LANGUAGE: language,
    PRIMARY_COUNTRY: meta.primary_country,
    SECONDARY_COUNTRIES: JSON.stringify(meta.secondary_countries ?? []),
    TARGET_ROLE: meta.target_roles?.[0] ?? "",
    INDUSTRY: meta.industry ?? null,
    ATS_MAX_PAGES: meta.ats_max_pages ?? 1,
    RECRUITER_MAX_PAGES: meta.recruiter_max_pages ?? 2,
    JOB_POSTING_TEXT_OR_NULL: job_posting_text ?? null,
    COMPANY_NAME_OR_NULL: company_name ?? null,
    PHOTO_PROVIDED: photo_provided,
    FORM_JSON: JSON.stringify(form),
    ORDER_ID: orderId,
    CANDIDATE_ID: meta.candidate_id
  };
}

function fill(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v === null ? "null" : String(v));
  }
  return out;
}

export async function generateWithRetry({ name, schema, prompt, maxRetries = 1 }) {
  let lastErr = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const json = await callStructured({ schema, prompt });
      validateJsonOrThrow(schema, json);
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        prompt = prompt + `\n\nJSON invalid for ${name}. Fix and output ONLY valid JSON matching the schema.`;
      }
    }
  }
  throw lastErr;
}
