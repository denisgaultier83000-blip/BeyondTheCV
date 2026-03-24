import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const cache = new WeakMap();

export function validateJsonOrThrow(schema, data) {
  let validate = cache.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    cache.set(schema, validate);
  }
  const ok = validate(data);
  if (!ok) {
    const details = (validate.errors || []).map(e => ({
      instancePath: e.instancePath,
      schemaPath: e.schemaPath,
      message: e.message,
      params: e.params
    }));
    const err = new Error("Schema validation failed");
    err.details = details;
    throw err;
  }
}
