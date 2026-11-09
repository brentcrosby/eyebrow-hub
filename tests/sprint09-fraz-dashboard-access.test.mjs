import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./helpers/loadModule.mjs";

const stats = {
  pendingRequests: 1,
  todaysAppointments: 2,
  thisWeeksAppointments: 3,
  thisWeeksCancellations: 0,
};

function appointment(id, customerName, startTime) {
  return {
    id,
    customerName,
    customerPhone: "5550100100",
    customerEmail: `${id}@example.invalid`,
    notes: null,
    startTime,
    endTime: new Date(
      new Date(startTime).getTime() + 30 * 60_000
    ).toISOString(),
    status: "pending",
    source: "online",
    createdAt: startTime,
    service: {
      id: 7,
      name: "Fixture service",
      price: "30.00",
      durationMinutes: 30,
      active: true,
    },
    stylist: { id: 3, name: "Fixture stylist" },
  };
}

function appointments(rows) {
  return { pendingRequests: rows, todaysAppointments: rows };
}

function response(status, data) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
  };
}

function createDashboard(fetchImpl, { now } = {}) {
  const states = [];
  const refs = [];
  const effects = [];
  let stateIndex = 0;
  let refIndex = 0;
  const window = {
    fetch: fetchImpl,
    setInterval: () => 1,
    clearInterval: () => {},
  };
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] =
            typeof value === "function" ? value(states[index]) : value;
        },
      ];
    },
    useRef(initial) {
      return (refs[refIndex] ??= { current: initial });
    },
    useCallback(callback) {
      return callback;
    },
    useEffect(callback) {
      effects.push(callback);
    },
  };
  const jsxRuntime = {
    jsx: (type, props) => ({ type, props: props ?? {} }),
    jsxs: (type, props) => ({ type, props: props ?? {} }),
  };
  class FixedDate extends Date {
    constructor(...args) {
      if (args.length) super(...args);
      else if (now === undefined) super();
      else super(now);
    }

    static now() {
      return now ?? Date.now();
    }
  }
  const dashboardModule = loadModule("app/admin/(panel)/dashboard/page.tsx", {
    mocks: {
      react,
      "react/jsx-runtime": jsxRuntime,
      "next/link": ({ children, ...props }) => ({
        type: "a",
        props: { ...props, children },
      }),
      "@/components/admin/schedule/AppointmentDetailDialog": () => null,
      "@/lib/salonTime": loadModule("lib/salonTime.ts"),
      "@/lib/appointmentStatus": {
        getStatusBadgeClasses: () => "",
        getStatusLabel: (status) => status,
      },
    },
    globals: {
      Date: FixedDate,
      fetch: (...args) => window.fetch(...args),
      window,
    },
  });

  function render() {
    stateIndex = 0;
    refIndex = 0;
    return dashboardModule.default();
  }

  function inspect(tree) {
    const text = [];
    const buttons = [];

    function visit(node) {
      if (node == null || typeof node === "boolean") return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node === "string" || typeof node === "number") {
        text.push(String(node));
        return;
      }
      if (typeof node.type === "function") {
        visit(node.type(node.props));
        return;
      }
      if (node.type === "button") buttons.push(node.props);
      visit(node.props?.children);
    }

    visit(tree);
    return { text: text.join(" "), buttons };
  }

  async function mount() {
    render();
    effects[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return inspect(render());
  }

  return { mount, render, inspect, window };
}

test("403 clears previously loaded customer data and shows one stable denial", async () => {
  let statsCalls = 0;
  let appointmentsCalls = 0;
  const customer = appointment(
    1,
    "Sensitive Customer",
    "2030-01-02T19:00:00.000Z"
  );
  const dashboard = createDashboard(async (url) => {
    if (url.endsWith("/stats")) {
      statsCalls += 1;
      return statsCalls === 1 ? response(200, stats) : response(403);
    }
    appointmentsCalls += 1;
    return response(200, appointments([customer]));
  });

  const loaded = await dashboard.mount();
  assert.match(loaded.text, /Sensitive Customer/);

  const refresh = loaded.buttons.find(
    (button) => button.children === "Refresh Dashboard"
  );
  refresh.onClick();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const denied = dashboard.inspect(dashboard.render());
  assert.match(
    denied.text,
    /You do not have permission to view this dashboard/
  );
  assert.doesNotMatch(denied.text, /Sensitive Customer/);
  assert.equal(
    denied.buttons.some((button) => /Try again/i.test(button.children)),
    false
  );
  assert.equal(appointmentsCalls, 2);
});

test("401 uses the shared expired-session redirect", async () => {
  const redirects = [];
  const logoutCalls = [];
  const window = {
    fetch: async (url) => {
      if (url === "/api/admin/logout") {
        logoutCalls.push(url);
        return response(200, {});
      }
      return response(401);
    },
    location: { replace: (url) => redirects.push(url) },
  };
  const session = loadModule("lib/adminSession.ts", {
    globals: {
      window,
      fetch: (...args) => window.fetch(...args),
      Request,
      localStorage: { removeItem: () => {} },
      document: { cookie: "" },
    },
  });
  session.watchAdminApi();
  const dashboard = createDashboard((...args) => window.fetch(...args));

  const view = await dashboard.mount();

  assert.deepEqual(redirects, ["/admin/login?expired=1"]);
  assert.equal(logoutCalls.length, 1);
  assert.match(view.text, /Your admin session has expired/);
  assert.doesNotMatch(view.text, /Try Again/);
});

test("partial failure shows only the failed section and retry recovers without stale totals", async () => {
  let statsCalls = 0;
  const customer = appointment(
    1,
    "Current Customer",
    "2030-01-02T19:00:00.000Z"
  );
  const dashboard = createDashboard(async (url) => {
    if (url.endsWith("/stats")) {
      statsCalls += 1;
      return statsCalls === 1 ? response(503) : response(200, stats);
    }
    return response(200, appointments([customer]));
  });

  const failed = await dashboard.mount();
  assert.match(failed.text, /Dashboard totals could not be loaded/);
  assert.match(failed.text, /Current Customer/);
  assert.doesNotMatch(failed.text, /Pending requests could not be loaded/);

  failed.buttons.find((button) => button.children === "Try again").onClick();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const recovered = dashboard.inspect(dashboard.render());
  assert.match(recovered.text, /Pending Requests 1/);
  assert.match(recovered.text, /Current Customer/);
  assert.doesNotMatch(recovered.text, /could not be loaded/);
});

test("dashboard appointment labels and times use Pacific time in a UTC browser", async () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    const today = appointment(1, "Today Customer", "2030-01-02T07:45:00.000Z");
    const tomorrow = appointment(
      2,
      "Tomorrow Customer",
      "2030-01-02T08:30:00.000Z"
    );
    const dashboard = createDashboard(
      async (url) =>
        url.endsWith("/stats")
          ? response(200, stats)
          : response(200, appointments([today, tomorrow])),
      { now: Date.parse("2030-01-02T07:30:00.000Z") }
    );

    const view = await dashboard.mount();
    assert.match(view.text, /Today - 11:45 PM/);
    assert.match(view.text, /Tomorrow - 12:30 AM/);
    assert.match(view.text, /11:45 PM/);
    assert.equal(new Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC");
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
