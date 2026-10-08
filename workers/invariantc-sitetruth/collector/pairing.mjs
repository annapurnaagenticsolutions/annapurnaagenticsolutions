import { readFile } from "node:fs/promises";
import { validatePair } from "./pairing-core.mjs";

export { validatePair } from "./pairing-core.mjs";

async function main() {
  const [contractFile, captureFile] = process.argv.slice(2);
  if (!contractFile || !captureFile) throw new Error("Usage: node collector/pairing.mjs CONTRACT.json CAPTURE.json");
  const contract = JSON.parse(await readFile(contractFile, "utf8"));
  const capture = JSON.parse(await readFile(captureFile, "utf8"));
  const result = validatePair(contract, capture);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 4;
  });
}
