import OpenAI from "openai";

let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // En prod: c’est une vraie erreur.
    // En test: tu mocks callStructured, mais si tu importes sans mock (ou trop tard), tu veux un message clair.
    throw new Error("OPENAI_API_KEY is missing (required to call OpenAI).");
  }

  _client = new OpenAI({ apiKey });
  return _client;
}

function stripSchemaNoise(schema) {
  const clone = JSON.parse(JSON.stringify(schema));
  delete clone.$schema;
  delete clone.$id;
  delete clone.title;
  return clone;
}

// OpenAI strict: for any object with properties, additionalProperties must be false
// and required must include all property keys.
// To keep "optional" fields optional, we widen their schema to accept null.
function normalizeForOpenAIStrict(schema) {
  const root = JSON.parse(JSON.stringify(schema));

  const allowsNull = (s) => {
    if (!s || typeof s !== "object") return false;
    if (s.type === "null") return true;
    if (typeof s.type === "string") return s.type === "null";
    if (Array.isArray(s.type)) return s.type.includes("null");
    if (Array.isArray(s.anyOf)) return s.anyOf.some((x) => x && x.type === "null");
    if (Array.isArray(s.oneOf)) return s.oneOf.some((x) => x && x.type === "null");
    return false;
  };

  const makeNullable = (s) => {
    if (!s || typeof s !== "object") return { anyOf: [{ type: "null" }] };
    if (allowsNull(s)) return s;

    if (typeof s.type === "string") return { ...s, type: [s.type, "null"] };
    if (Array.isArray(s.type)) return s.type.includes("null") ? s : { ...s, type: [...s.type, "null"] };

    return { anyOf: [s, { type: "null" }] };
  };

  const walk = (node) => {
    if (!node || typeof node !== "object") return;

    if (node.type === "object" && node.properties && typeof node.properties === "object") {
      node.additionalProperties = false;

      const keys = Object.keys(node.properties);
      const req = Array.isArray(node.required) ? node.required.slice() : [];
      const reqSet = new Set(req);

      for (const k of keys) {
        if (!reqSet.has(k)) {
          reqSet.add(k);
          node.properties[k] = makeNullable(node.properties[k]);
        }
      }
      node.required = Array.from(reqSet);
    }

    if (node.properties) for (const v of Object.values(node.properties)) walk(v);
    if (node.items) walk(node.items);
    if (Array.isArray(node.anyOf)) node.anyOf.forEach(walk);
    if (Array.isArray(node.oneOf)) node.oneOf.forEach(walk);
    if (Array.isArray(node.allOf)) node.allOf.forEach(walk);
    if (node.additionalProperties && typeof node.additionalProperties === "object") walk(node.additionalProperties);
    if (node.$defs) for (const v of Object.values(node.$defs)) walk(v);
    if (node.definitions) for (const v of Object.values(node.definitions)) walk(v);
  };

  walk(root);
  return root;
}

export async function callStructured({ schema, prompt }) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-2024-08-06";

  const cleanedSchema = stripSchemaNoise(schema);
  const strictSchema = normalizeForOpenAIStrict(cleanedSchema);

  const response = await client.responses.create({
    model,
    input: [{ role: "user", content: prompt }],
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        strict: true,
        name: "beyondthecv_output",
        schema: strictSchema
      }
    }
  });

  const txt = response.output_text;
  if (!txt) throw new Error("Empty model output_text");

  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`Model returned non-JSON output: ${txt.slice(0, 200)}`);
  }
}
