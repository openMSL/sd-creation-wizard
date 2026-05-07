import { base } from "@sd-creation-wizard/eslint-config";

export default [
  ...base,
  {
    ignores: ["docs/", "submodules/"],
  },
];
