import { validateSpec } from "./observation.mjs";

const inferredTypes = {
  number_text: "number",
  count_elements: "number",
  exists: "boolean",
  text: "string",
  attribute: "string",
  json_text: null,
  attribute_json: null,
};

const MAX_EXPRESSION_DEPTH = 32;
const MAX_EXPRESSION_NODES = 32_768;

function paths(expr, found, budget, depth = 0) {
  if (!expr || typeof expr !== "object") return;
  if (depth > MAX_EXPRESSION_DEPTH) throw new Error("Contract expression nesting exceeds the supported depth");
  budget.nodes += 1;
  if (budget.nodes > MAX_EXPRESSION_NODES) throw new Error("Contract expression exceeds the supported complexity");
  if (expr.kind === "path") {
    found.push({ source: expr.source, pointer: expr.pointer });
    return;
  }
  if (expr.kind === "count") paths(expr.value, found, budget, depth + 1);
  else if (expr.kind === "sum" || expr.kind === "product") {
    if (Array.isArray(expr.values)) expr.values.forEach((item) => paths(item, found, budget, depth + 1));
  }
  else if (expr.kind === "difference") {
    paths(expr.left, found, budget, depth + 1);
    paths(expr.right, found, budget, depth + 1);
  }
}

/** Browser-independent contract/capture validation shared with the Worker. */
export function validatePair(contract, capture) {
  validateSpec(capture);
  const errors = [];
  if (contract?.version !== 1 || !Array.isArray(contract.assertions) || !Array.isArray(contract.sources)) {
    errors.push("Expected a version-1 InvariantC contract");
  }
  const captureSources = Array.isArray(capture?.sources) ? capture.sources : [];
  const declaredSources = Array.isArray(contract?.sources) ? contract.sources : [];
  const assertions = Array.isArray(contract?.assertions) ? contract.assertions : [];
  if (captureSources.length > 32 || declaredSources.length > 64 || assertions.length > 512) {
    return { ok: false, errors: [...errors, "Contract or capture exceeds supported collection limits"] };
  }
  const captured = new Map(captureSources.map((source) => [source.id, source]));
  const contractSources = new Map(declaredSources.map((source) => [source.id, source]));
  const budget = { nodes: 0 };
  for (const source of captureSources) {
    if (!contractSources.has(source.id)) errors.push(`Capture source ${source.id} is not declared by contract`);
  }
  for (const assertion of assertions) {
    const dependencies = [];
    paths(assertion.expected, dependencies, budget);
    paths(assertion.actual, dependencies, budget);
    for (const reference of dependencies) {
      const source = captured.get(reference.source);
      if (!source) {
        errors.push(`${assertion.id}: capture source ${reference.source} is not present`);
        continue;
      }
      const extractor = source.extract.find((item) => item.pointer === reference.pointer);
      if (!extractor) {
        errors.push(`${assertion.id}: no extractor for ${reference.source}:${reference.pointer}`);
        continue;
      }
      const contractType = contractSources.get(reference.source)?.fields?.[reference.pointer];
      const inferred = inferredTypes[extractor.kind];
      if (contractType && inferred && contractType !== inferred) {
        errors.push(`${assertion.id}: capture of ${reference.source}:${reference.pointer} emits ${inferred}, contract declares ${contractType}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
