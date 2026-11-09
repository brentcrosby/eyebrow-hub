import assert from "node:assert/strict";
import { test } from "node:test";
import * as jsxRuntime from "react/jsx-runtime";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const appointmentDate = new Date("2030-01-02T18:00:00.000Z");
function routeContext(id = 42) {
  return { params: Promise.resolve({ id: String(id) }) };
}

function createAppointment(id, status) {
  return {
    id,
    serviceId: 7,
    startTime: appointmentDate,
    endTime: new Date(appointmentDate.getTime() + 30 * 60_000),
    customerName: `Customer ${id}`,
    customerPhone: "5550100100",
    customerEmail: `customer${id}@example.invalid`,
    notes: null,
    status,
    source: "online",
    createdAt: new Date("2029-12-01T12:00:00.000Z"),
    updatedAt: new Date("2029-12-01T12:00:00.000Z"),
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

function createWorkflow() {
  const appointments = [
    createAppointment(42, "pending"),
    createAppointment(43, "pending"),
    createAppointment(44, "confirmed"),
    createAppointment(45, "confirmed"),
  ];
  const writes = [];
  const dateRange = {
    todayStart: new Date("2029-01-01T00:00:00.000Z"),
    tomorrowStart: new Date("2031-01-01T00:00:00.000Z"),
    weekStart: new Date("2029-01-01T00:00:00.000Z"),
    nextWeekStart: new Date("2031-01-01T00:00:00.000Z"),
  };

  function matchesRange(appointment, range) {
    if (!range) return true;
    if (range.gte && appointment.startTime < range.gte) return false;
    if (range.lt && appointment.startTime >= range.lt) return false;
    if (range.gt && appointment.endTime <= range.gt) return false;
    return true;
  }

  const db = {
    $queryRaw: async () => [dateRange],
    appointment: {
      findUnique: async ({ where, select }) => {
        const appointment = appointments.find((row) => row.id === where.id);
        if (!appointment) return null;
        if (select?.status && Object.keys(select).length === 1) {
          return { status: appointment.status };
        }
        if (select?.id) {
          return {
            id: appointment.id,
            status: appointment.status,
            notes: appointment.notes,
          };
        }
        return { ...appointment };
      },
      findMany: async ({ where = {} }) =>
        appointments.filter(
          (appointment) =>
            (!where.id || appointment.id === where.id) &&
            (!where.status || appointment.status === where.status) &&
            matchesRange(appointment, where.startTime) &&
            matchesRange(appointment, where.endTime)
        ),
      count: async ({ where = {} }) =>
        appointments.filter(
          (appointment) =>
            (!where.status || appointment.status === where.status) &&
            matchesRange(appointment, where.startTime)
        ).length,
      updateMany: async ({ where, data }) => {
        writes.push({ where, data });
        const appointment = appointments.find(
          (row) => row.id === where.id && row.status === where.status
        );
        if (!appointment) return { count: 0 };
        Object.assign(appointment, data);
        return { count: 1 };
      },
    },
  };

  const mocks = {
    "next/server": { NextResponse },
    "@/lib/db": { db },
    "@/lib/adminAuth": {
      requireAdmin: async () => ({ authenticated: true }),
    },
  };
  const statusRoute = loadModule(
    "app/api/admin/appointments/[id]/status/route.ts",
    { mocks }
  );
  const dashboardStats = loadModule("app/api/admin/dashboard/stats/route.ts", {
    mocks: {
      ...mocks,
      "@/lib/appointmentStatus": loadModule("lib/appointmentStatus.ts"),
    },
  });
  const dashboardAppointments = loadModule(
    "app/api/admin/dashboard/appointments/route.ts",
    {
      mocks: {
        ...mocks,
        "@/lib/appointmentStatus": loadModule("lib/appointmentStatus.ts"),
      },
    }
  );
  const scheduleAppointments = loadModule(
    "app/api/admin/appointments/route.ts",
    {
      mocks: {
        ...mocks,
        "@prisma/client": { Prisma: {} },
        "@/lib/appointmentStatus": loadModule("lib/appointmentStatus.ts"),
        "@/lib/salonTime": {},
        "@/lib/validations/manualAppointment": {},
        "@/lib/appointmentSource": {},
        "@/lib/bookingReservation": {},
        "@/lib/bookingClosures": {},
      },
    }
  );

  const request = (body) => ({
    cookies: { get: () => ({ value: "fixture-token" }) },
    json: async () => body,
  });

  async function getDashboard() {
    const [statsResponse, appointmentsResponse] = await Promise.all([
      dashboardStats.GET({}),
      dashboardAppointments.GET({}),
    ]);
    assert.equal(statsResponse.status, 200);
    assert.equal(appointmentsResponse.status, 200);
    return {
      stats: await statsResponse.json(),
      appointments: await appointmentsResponse.json(),
    };
  }

  async function getSchedule() {
    const response = await scheduleAppointments.GET({
      url: "http://localhost/api/admin/appointments?start=2029-01-01T00:00:00.000Z&end=2031-01-01T00:00:00.000Z",
    });
    assert.equal(response.status, 200);
    return response.json();
  }

  return {
    appointments,
    writes,
    statusRoute,
    request,
    getDashboard,
    getSchedule,
  };
}

function createHooks() {
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;

  return {
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
      const index = refIndex++;
      return (refs[index] ??= { current: initial });
    },
    useEffect() {},
    render(Component, props) {
      stateIndex = 0;
      refIndex = 0;
      return Component(props);
    },
  };
}

function createDecisionPanel(workflow, appointment, refresh) {
  const hooks = createHooks();
  const panelModule = loadModule(
    "components/admin/AppointmentDetailPanel.tsx",
    {
      mocks: {
        react: hooks,
        "react/jsx-runtime": jsxRuntime,
        "@/lib/appointmentStatus": loadModule("lib/appointmentStatus.ts"),
        "@/lib/appointmentSource": loadModule("lib/appointmentSource.ts"),
      },
      globals: { AbortController },
    }
  );
  let closed = 0;
  let inFlight;
  const dialogModule = loadModule(
    "components/admin/schedule/AppointmentDetailDialog.tsx",
    {
      mocks: {
        "react/jsx-runtime": jsxRuntime,
        "@/components/admin/AppointmentDetailPanel": {
          default: function AppointmentDetailPanelMarker() {},
        },
        "./ScheduleDialog": { default: function ScheduleDialogMarker() {} },
      },
      globals: {
        fetch: async (_url, options) => {
          const response = await workflow.statusRoute.PATCH(
            workflow.request(JSON.parse(options.body)),
            routeContext(appointment.id)
          );
          return {
            ok: response.ok,
            status: response.status,
            json: () => response.json(),
          };
        },
      },
    }
  );
  const dialog = dialogModule.default({
    appointment,
    onClose: () => {
      closed++;
    },
    onStatusChange: refresh,
  });
  const panelElement = dialog.props.children;
  const panelProps = {
    ...panelElement.props,
    onApprove: (signal) => {
      inFlight = panelElement.props.onApprove(signal);
      return inFlight;
    },
    onReject: (reason, signal) => {
      inFlight = panelElement.props.onReject(reason, signal);
      return inFlight;
    },
    onCancel: (signal) => {
      inFlight = panelElement.props.onCancel(signal);
      return inFlight;
    },
    onComplete: (signal) => {
      inFlight = panelElement.props.onComplete(signal);
      return inFlight;
    },
  };

  function render() {
    return hooks.render(panelModule.default, panelProps);
  }

  return {
    render,
    panelProps,
    get closed() {
      return closed;
    },
    get inFlight() {
      return inFlight;
    },
  };
}

function flatten(root) {
  if (!root || typeof root !== "object") return [];
  return [root, ...[root.props?.children].flat(Infinity).flatMap(flatten)];
}

function text(root) {
  if (root == null || typeof root === "boolean") return "";
  if (typeof root !== "object") return String(root);
  return [root.props?.children].flat(Infinity).map(text).join("");
}

function findButton(tree, label) {
  return flatten(tree).find(
    (element) => element.type === "button" && text(element) === label
  );
}

async function click(tree, label, panel) {
  const button = findButton(tree, label);
  assert.ok(button, `Expected visible button "${label}"`);
  button.props.onClick();
  if (panel.inFlight) await panel.inFlight;
  await new Promise((resolve) => setImmediate(resolve));
}

async function refreshConsumers(workflow, refreshes) {
  const dashboard = await workflow.getDashboard();
  const schedule = await workflow.getSchedule();
  refreshes.push({ dashboard, schedule });
  return { dashboard, schedule };
}

function expectedSnapshot(snapshot) {
  return {
    pending: snapshot.dashboard.stats.pendingRequests,
    today: snapshot.dashboard.stats.todaysAppointments,
    week: snapshot.dashboard.stats.thisWeeksAppointments,
    cancelled: snapshot.dashboard.stats.thisWeeksCancellations,
    pendingIds: snapshot.dashboard.appointments.pendingRequests.map(
      (appointment) => appointment.id
    ),
    dashboardTodayIds: snapshot.dashboard.appointments.todaysAppointments.map(
      (appointment) => appointment.id
    ),
    scheduleIds: snapshot.schedule.map((appointment) => appointment.id),
  };
}

test("dashboard and schedule decision consumers refresh counts and lists for every action", async () => {
  const scenarios = [
    {
      action: "Approve",
      initialStatus: "pending",
      target: "confirmed",
      expected: { pending: 1, today: 4, week: 4, cancelled: 0 },
    },
    {
      action: "Reject",
      initialStatus: "pending",
      target: "rejected",
      reason: "Customer requested a different time",
      expected: { pending: 1, today: 3, week: 3, cancelled: 0 },
    },
    {
      action: "Cancel appointment",
      initialStatus: "confirmed",
      target: "cancelled",
      expected: { pending: 2, today: 3, week: 3, cancelled: 1 },
    },
    {
      action: "Complete appointment",
      initialStatus: "confirmed",
      target: "completed",
      expected: { pending: 2, today: 4, week: 4, cancelled: 0 },
    },
  ];

  for (const scenario of scenarios) {
    const workflow = createWorkflow();
    const appointment = workflow.appointments.find(
      (row) => row.status === scenario.initialStatus
    );
    const refreshes = [];
    const panel = createDecisionPanel(workflow, appointment, () =>
      refreshConsumers(workflow, refreshes)
    );
    let tree = panel.render();

    if (scenario.action === "Reject") {
      await click(tree, "Reject", panel);
      tree = panel.render();
      const textarea = flatten(tree).find(
        (element) => element.type === "textarea"
      );
      assert.ok(textarea);
      textarea.props.onChange({ target: { value: scenario.reason } });
      tree = panel.render();
      await click(tree, "Confirm rejection", panel);
    } else if (scenario.action === "Cancel appointment") {
      await click(tree, scenario.action, panel);
      tree = panel.render();
      await click(tree, "Confirm cancellation", panel);
    } else if (scenario.action === "Complete appointment") {
      await click(tree, scenario.action, panel);
      tree = panel.render();
      await click(tree, "Confirm completion", panel);
    } else {
      await click(tree, scenario.action, panel);
    }

    assert.equal(appointment.status, scenario.target);
    assert.equal(workflow.writes.length, 1);
    assert.equal(refreshes.length, 1);
    assert.equal(panel.closed, 1);
    const activeIds = workflow.appointments
      .filter(
        (row) => !["rejected", "cancelled", "canceled"].includes(row.status)
      )
      .map((row) => row.id);
    assert.deepEqual(expectedSnapshot(refreshes[0]), {
      ...scenario.expected,
      pendingIds:
        scenario.target === "rejected" || scenario.target === "confirmed"
          ? [43]
          : [42, 43],
      dashboardTodayIds: activeIds,
      scheduleIds: activeIds,
    });
    if (scenario.reason) {
      assert.equal(appointment.notes, `Rejection reason: ${scenario.reason}`);
    }

    const repeatedDecision =
      scenario.target === "confirmed"
        ? panel.panelProps.onApprove()
        : scenario.target === "rejected"
          ? panel.panelProps.onReject(scenario.reason)
          : scenario.target === "cancelled"
            ? panel.panelProps.onCancel()
            : panel.panelProps.onComplete();
    await assert.rejects(repeatedDecision, /Cannot change appointment/);
    assert.equal(refreshes.length, 2);
    assert.equal(workflow.writes.length, 1);
    assert.equal(panel.closed, 1);
    assert.deepEqual(
      refreshes[0].dashboard.appointments.todaysAppointments.map(
        (row) => row.id
      ),
      activeIds
    );
    assert.deepEqual(
      refreshes[0].schedule.map((row) => row.id),
      activeIds
    );
  }
});

test("terminal appointment details render no decision controls", () => {
  for (const status of ["rejected", "cancelled", "completed"]) {
    const workflow = createWorkflow();
    const panel = createDecisionPanel(
      workflow,
      {
        ...workflow.appointments[0],
        status,
      },
      async () => {}
    );
    const tree = panel.render();

    for (const action of [
      "Approve",
      "Reject",
      "Cancel appointment",
      "Complete appointment",
    ]) {
      assert.equal(findButton(tree, action), undefined);
    }
  }
});

test("decision endpoint denies unapproved admins without exposing appointment data", async () => {
  const calls = [];
  const route = loadModule("app/api/admin/appointments/[id]/status/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": {
        db: {
          appointment: {
            findUnique: async () => {
              calls.push("database");
              return null;
            },
          },
        },
      },
      "@/lib/adminAuth": {
        requireAdmin: async () => ({
          authenticated: false,
          response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        }),
      },
    },
  });
  const response = await route.PATCH(
    {
      cookies: { get: () => ({ value: "fixture-token" }) },
      json: async () => ({ status: "confirmed" }),
    },
    routeContext(42)
  );

  assert.equal(response.status, 403);
  assert.deepEqual(calls, []);
  assert.doesNotMatch(
    await response.text(),
    /Customer|5550100100|example\.invalid/
  );
});

test("conflicted decision shows a truthful error without stale customer details", async () => {
  const workflow = createWorkflow();
  const appointment = workflow.appointments[0];
  const staleAppointment = { ...appointment };
  appointment.status = "confirmed";
  const panel = createDecisionPanel(workflow, staleAppointment, async () => {
    await workflow.getDashboard();
    await workflow.getSchedule();
  });

  findButton(panel.render(), "Approve").props.onClick();
  await assert.rejects(panel.inFlight, /Cannot change appointment/);
  await new Promise((resolve) => setImmediate(resolve));
  const tree = panel.render();

  assert.match(text(tree), /This appointment has changed/);
  assert.doesNotMatch(text(tree), new RegExp(staleAppointment.customerName));
  assert.equal(panel.closed, 0);
  assert.equal(workflow.writes.length, 0);
});

test("decision panel uses wrapping and width-constrained controls for narrow screens", () => {
  const hooks = createHooks();
  const source = loadModule("components/admin/AppointmentDetailPanel.tsx", {
    mocks: {
      react: hooks,
      "react/jsx-runtime": jsxRuntime,
      "@/lib/appointmentStatus": loadModule("lib/appointmentStatus.ts"),
      "@/lib/appointmentSource": loadModule("lib/appointmentSource.ts"),
    },
    globals: { AbortController },
  });
  const panel = hooks.render(source.default, {
    appointment: createAppointment(42, "confirmed"),
    onCancel: async () => {},
    onComplete: async () => {},
  });
  const classes = flatten(panel)
    .map((element) => element.props?.className ?? "")
    .join(" ");

  assert.match(classes, /flex flex-wrap gap-3/);
  assert.match(classes, /min-h-10/);
  assert.match(classes, /max-w-full/);
});
