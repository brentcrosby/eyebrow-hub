import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { loadModule } from "./helpers/loadModule.mjs";

const services = [
  { id: 1, name: "Brow Consult", price: 0, durationMinutes: 15 },
  { id: 2, name: "Eyebrow", price: 15, durationMinutes: 30 },
];
const response = (data) => ({ ok: true, json: async () => data });

// Exercise the component's effects and retry handler with controlled responses.
// These checks do not contact the API or claim browser focus/layout coverage.
function catalogFixture(fetchMock, booking = false) {
  const state = [];
  let cursor = 0;
  let effectCursor = 0;
  let refCursor = 0;
  const effects = [];
  const refs = [];
  let requests = 0;
  let writes = 0;
  const picker = ({ options = [] }) =>
    React.createElement(
      "div",
      null,
      options
        .map((option) => (typeof option === "string" ? option : option.label))
        .join(", ")
    );
  const { default: Catalog } = loadModule(
    booking
      ? "components/BookingContainer.tsx"
      : "components/ServicesSection.tsx",
    {
      mocks: {
        react: {
          useState(initial) {
            const index = cursor++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (next) => {
                writes++;
                state[index] =
                  typeof next === "function" ? next(state[index]) : next;
              },
            ];
          },
          useEffect(callback, dependencies) {
            const index = effectCursor++;
            const effect = effects[index];
            if (
              !effect ||
              dependencies.some(
                (value, index) => value !== effect.dependencies[index]
              )
            ) {
              effect?.cleanup?.();
              effects[index] = { dependencies, callback, pending: true };
            }
          },
          useRef(initial) {
            return (refs[refCursor++] ??= { current: initial });
          },
        },
        "react/jsx-runtime": jsxRuntime,
        "next/link": { default: (props) => React.createElement("a", props) },
        "./ServicesSection": loadModule("components/ServicesSection.tsx", {
          mocks: { react: {}, "react/jsx-runtime": jsxRuntime },
        }),
        "./Dropdown": {
          MultiSelectDropdown: picker,
          SingleSelectDropdown: picker,
          DatePickerDropdown: picker,
          TimePickerDropdown: picker,
        },
        "./BookingForm": { default: () => null },
        "@/lib/validations/booking": {
          BOOKING_LIMITS: { services: 4 },
          bookingSelectionSchema: {},
        },
        "@/lib/dateUtils": { toDateParam: () => "2026-11-20" },
      },
      globals: {
        AbortController,
        fetch: (...args) => {
          if (args[0] === "/api/services") requests++;
          if (booking && args[0] !== "/api/services")
            return Promise.resolve(response([]));
          return fetchMock(...args);
        },
      },
    }
  );
  function render() {
    cursor = effectCursor = refCursor = 0;
    const tree = Catalog();
    for (const effect of effects) {
      if (!effect.pending) continue;
      effect.pending = false;
      effect.cleanup = effect.callback();
    }
    return tree;
  }
  function findButton(node) {
    if (!React.isValidElement(node)) return;
    if (node.type === "button") return node;
    return React.Children.toArray(node.props.children)
      .map(findButton)
      .find(Boolean);
  }
  return {
    html: () => renderToStaticMarkup(render()),
    retry() {
      findButton(render()).props.onClick();
    },
    unmount() {
      for (const effect of effects) effect.cleanup?.();
    },
    get requests() {
      return requests;
    },
    get writes() {
      return writes;
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("catalog loads prices including free services and exposes a loading state", async () => {
  const fixture = catalogFixture(async (url, options) => {
    assert.equal(url, "/api/services");
    assert.equal(options.cache, "no-store");
    return response(services);
  });
  assert.match(fixture.html(), /aria-busy="true".*Loading services/s);
  await flush();
  const html = fixture.html();
  assert.match(html, /Brow Consult/);
  assert.match(html, /Free/);
  assert.match(html, /\$15/);
  assert.doesNotMatch(html, /Retry services|Loading services/);
  assert.equal(fixture.requests, 1);
});

for (const [label, failure] of [
  [
    "HTTP error",
    async () => ({
      ok: false,
      json() {
        assert.fail("Error body must not be rendered");
      },
    }),
  ],
  [
    "network failure",
    async () => {
      throw new TypeError("Failed to fetch");
    },
  ],
  [
    "invalid JSON",
    async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("Invalid JSON");
      },
    }),
  ],
  ["error object", async () => response({ error: "Internal details" })],
  ["null entry", async () => response([null])],
  [
    "invalid name",
    async () => response([{ ...services[0], name: { unexpected: true } }]),
  ],
  ["invalid price", async () => response([{ ...services[0], price: "15" }])],
  [
    "invalid duration",
    async () => response([{ ...services[0], durationMinutes: 0 }]),
  ],
]) {
  for (const booking of [false, true]) {
    test(`${booking ? "booking picker" : "catalog"} handles ${label} and recovers only on explicit retry`, async () => {
      let recover = false;
      const fixture = catalogFixture(
        () => (recover ? response(services) : failure()),
        booking
      );
      fixture.html();
      await flush();
      assert.match(fixture.html(), /couldn’t load/);
      assert.match(fixture.html(), /Retry (services|booking options)/);
      assert.doesNotMatch(fixture.html(), /Internal details|\$15/);
      await flush();
      assert.equal(fixture.requests, 1, "no automatic retry");
      recover = true;
      fixture.retry();
      assert.match(fixture.html(), /Loading (services|booking options)/);
      assert.doesNotMatch(fixture.html(), /Retry (services|booking options)/);
      await flush();
      assert.match(fixture.html(), /Eyebrow/);
      assert.doesNotMatch(fixture.html(), /couldn’t load/);
      assert.equal(fixture.requests, 2);
    });
  }
}

test("an empty catalog is distinct from an error", async () => {
  const fixture = catalogFixture(async () => response([]));
  fixture.html();
  await flush();
  assert.match(fixture.html(), /No services are currently available online/);
  assert.doesNotMatch(fixture.html(), /Retry services|couldn’t load/);
});

test("unmount aborts the request and ignores a late response", async () => {
  let finish;
  let signal;
  const fixture = catalogFixture((url, options) => {
    signal = options.signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  fixture.html();
  fixture.unmount();
  assert.equal(signal.aborted, true);
  finish(response(services));
  await flush();
  assert.equal(fixture.writes, 0);
});

test("location offers the address and directions with or without a map key", () => {
  for (const key of [undefined, "fixture-key"]) {
    const { default: Location } = loadModule("components/LocationSection.tsx", {
      mocks: { "react/jsx-runtime": jsxRuntime },
      env: key ? { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: key } : {},
    });
    const html = renderToStaticMarkup(React.createElement(Location));
    assert.match(html, /1215 Colusa Ave, Yuba City, CA 95991/);
    assert.match(
      html,
      /href="https:\/\/www.google.com\/maps\/dir\/\?api=1&amp;destination=1215%20Colusa/
    );
    assert.match(html, /Get directions on Google Maps/);
    assert.doesNotMatch(html, /NEXT_PUBLIC|\.env.local/);
    assert.equal(html.includes("<iframe"), Boolean(key));
  }
});
