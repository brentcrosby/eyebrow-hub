import assert from "node:assert/strict";
import { test } from "node:test";
import * as jsx from "react/jsx-runtime";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
const schemas = loadModule("lib/validations/service.ts", {
  mocks: { zod: { z } },
});
function fixture(fetch) {
  const state = [],
    refs = [],
    effects = [],
    callbacks = [];
  let cursor = 0,
    refCursor = 0,
    effectCursor = 0,
    callbackCursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [
        state[i],
        (value) => {
          state[i] = typeof value === "function" ? value(state[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = refCursor++;
      return (refs[i] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const i = callbackCursor++;
      if (
        !callbacks[i] ||
        deps.some((value, j) => !Object.is(value, callbacks[i].deps[j]))
      )
        callbacks[i] = { fn, deps };
      return callbacks[i].fn;
    },
    useEffect(callback, deps) {
      const i = effectCursor++;
      if (
        !effects[i] ||
        deps.some((value, j) => !Object.is(value, effects[i].deps[j]))
      )
        effects[i] = { callback, deps, pending: true };
    },
  };
  const Page = loadModule("app/admin/(panel)/services/page.tsx", {
    mocks: {
      react,
      "react/jsx-runtime": jsx,
      "@/lib/validations/service": schemas,
    },
    globals: {
      fetch,
      document: { activeElement: { focus() {} } },
      requestAnimationFrame(fn) {
        fn();
      },
    },
  }).default;
  function render() {
    cursor = refCursor = effectCursor = callbackCursor = 0;
    return Page();
  }
  async function settle() {
    for (const effect of effects)
      if (effect.pending) {
        effect.pending = false;
        effect.callback();
      }
    await new Promise((resolve) => setImmediate(resolve));
    return render();
  }
  return { render, settle };
}
function elements(root) {
  if (!root || typeof root !== "object") return [];
  return [root, ...[root.props?.children].flat(Infinity).flatMap(elements)];
}
function text(root) {
  if (root == null || typeof root === "boolean") return "";
  if (typeof root !== "object") return String(root);
  return [root.props?.children].flat(Infinity).map(text).join("");
}
function button(root, label) {
  return elements(root).find((e) => e.type === "button" && text(e) === label);
}
test("Services denies access without showing stale catalog and retry recovers", async () => {
  let requests = 0;
  const page = fixture(async () =>
    ++requests === 1
      ? { ok: false, status: 403 }
      : {
          ok: true,
          json: async () => [
            {
              id: 1,
              name: "Brow Consult",
              durationMinutes: 15,
              price: "0",
              active: true,
            },
          ],
        }
  );
  page.render();
  let tree = await page.settle();
  assert.match(text(tree), /do not have permission/);
  assert.equal(button(tree, "+ Add New").props.disabled, true);
  assert.doesNotMatch(text(tree), /Brow Consult/);
  button(tree, "Try again").props.onClick();
  tree = await page.settle();
  assert.match(text(tree), /Brow Consult/);
  assert.equal(button(tree, "+ Add New").props.disabled, false);
  assert.equal(requests, 2);
});
test("actual service form submits a free service but blocks excessive precision before writes", async () => {
  const writes = [];
  const page = fixture(async (_url, options) => {
    if (!options) return { ok: true, json: async () => [] };
    const saved = { id: 1, ...JSON.parse(options.body) };
    writes.push(saved);
    return { ok: true, json: async () => saved };
  });
  page.render();
  let tree = await page.settle();
  button(tree, "+ Add New").props.onClick({ currentTarget: { focus() {} } });
  tree = page.render();
  for (const [id, value] of [
    ["service-name", "Brow Consult"],
    ["service-duration", "15"],
    ["service-price", "1.001"],
  ])
    elements(tree)
      .find((e) => e.props?.id === id)
      .props.onChange({ target: { value } });
  tree = page.render();
  await button(tree, "Save").props.onClick();
  tree = page.render();
  assert.equal(writes.length, 0);
  assert.match(text(tree), /at most 2 decimal places/);
  elements(tree)
    .find((e) => e.props?.id === "service-price")
    .props.onChange({ target: { value: "0" } });
  tree = page.render();
  await button(tree, "Save").props.onClick();
  tree = page.render();
  assert.equal(writes[0].price, "0");
  assert.match(text(tree), /Brow Consult added/);
  assert.equal(
    elements(tree).some((e) => e.props?.id === "service-name"),
    false
  );
});
