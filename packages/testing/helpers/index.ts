import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = join(__dirname, "..", "fixtures");
export const INPUTS_DIR = join(FIXTURES_DIR, "inputs");
export const EXPECTED_DIR = join(FIXTURES_DIR, "expected");
