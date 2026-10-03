import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const repoRoot = new URL("../../", import.meta.url);

// Loads a repo TypeScript file with every import replaced by a mock, so tests
// never reach the real database or Supabase. See tests/README.md.
export function loadModule(path, { mocks = {}, env = {}, globals = {} } = {}) {
  const file = fileURLToPath(new URL(path, repoRoot));
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const commonJsModule = { exports: {} };

  vm.runInNewContext(
    outputText,
    {
      module: commonJsModule,
      exports: commonJsModule.exports,
      require(name) {
        assert.ok(
          Object.hasOwn(mocks, name),
          `${path} imports "${name}" but no mock was given for it.`
        );
        return mocks[name];
      },
      // A copy, so the module never sees the real environment (and so no real
      // secret from a developer's .env.local can leak into a test).
      process: { env: { ...env } },
      // Shared with the test file so dates and URLs compare across the two.
      console,
      Date,
      URL,
      URLSearchParams,
      TextEncoder,
      TextDecoder,
      structuredClone,
      setTimeout,
      clearTimeout,
      ...globals,
    },
    { filename: file }
  );

  return commonJsModule.exports;
}
