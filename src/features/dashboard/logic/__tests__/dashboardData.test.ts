import type { BillingItem } from "../../../bills/types";
import type { Cashbook, CashbookEntry } from "../../../cashbooks/types";
import type { MonthlyBillEntry, UnitBillLine } from "../../../monthlyBilling/types";
import type { Property } from "../../../properties/types";
import type { Tenant } from "../../../tenants/types";
import type { DashboardUnit } from "../../types";
import {
  buildActivityFeed,
  buildDashboardMetrics,
  buildPaymentAlerts,
  filterActivity,
  formatRelativeTime,
  getDueStatus,
  getDueStatusLabel,
  resolveBillDueDate,
} from "../dashboardData";

const NOW = new Date(2026, 10, 21, 9, 0, 0);
const PERIOD = "2026-11";

const bill = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: "bill-rent",
  name: "Rent",
  utilityType: "Rent",
  billingType: "Fixed amount per month",
  displayUnit: "",
  dueDateType: "Recurring monthly",
  recurringRule: "Day of the month",
  recurringDay: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const property = (overrides: Partial<Property> = {}): Property => ({
  id: "unit-1",
  name: "Unit 3B",
  type: "Unit",
  parentBuildingId: null,
  street: "",
  street2: "",
  barangay: "",
  city: "",
  province: "",
  zipCode: "",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const tenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: "tenant-1",
  tenantStatus: "Active",
  photo: null,
  firstName: "Juan",
  middleName: "",
  lastName: "Dela Cruz",
  phone: "09171234567",
  email: "",
  idType: "",
  idNumber: "",
  idPhoto: null,
  ...overrides,
});

const line = (overrides: Partial<UnitBillLine> = {}): UnitBillLine => ({
  bill: bill(),
  source: "independent",
  amount: 12000,
  status: "recorded",
  ...overrides,
});

const unit = ({
  lines,
  tenants = [tenant()],
  unitProperty,
  parentName,
}: {
  lines: UnitBillLine[];
  tenants?: Tenant[];
  unitProperty?: Partial<Property>;
  parentName?: string;
}): DashboardUnit => ({
  property: property(unitProperty),
  tenants,
  lines,
  total: lines.reduce((total, item) => total + (item.amount ?? 0), 0),
  missingCount: 0,
  parentName,
});

describe("resolveBillDueDate", () => {
  it("projects a recurring day into the report period", () => {
    expect(resolveBillDueDate(bill(), PERIOD)).toEqual(new Date(2026, 10, 5));
  });

  it("supports first and last day rules", () => {
    expect(
      resolveBillDueDate(
        bill({ recurringRule: "First day of the month" }),
        PERIOD,
      ),
    ).toEqual(new Date(2026, 10, 1));
    expect(
      resolveBillDueDate(
        bill({ recurringRule: "Every last day of the month" }),
        PERIOD,
      ),
    ).toEqual(new Date(2026, 10, 30));
  });

  it("clamps a recurring day past the end of the month", () => {
    expect(
      resolveBillDueDate(bill({ recurringDay: 31 }), "2026-02"),
    ).toEqual(new Date(2026, 1, 28));
  });

  it("parses the stored MM/DD/YYYY fixed date", () => {
    expect(
      resolveBillDueDate(
        bill({ dueDateType: "Fixed date", fixedDueDate: "11/10/2026" }),
        PERIOD,
      ),
    ).toEqual(new Date(2026, 10, 10));
  });

  it("returns null when there is no due date or an invalid period", () => {
    expect(
      resolveBillDueDate(bill({ dueDateType: "No Due date" }), PERIOD),
    ).toBeNull();
    expect(resolveBillDueDate(bill(), "november")).toBeNull();
  });
});

describe("getDueStatus", () => {
  it("classifies overdue, today, and upcoming dates", () => {
    expect(getDueStatus(new Date(2026, 10, 20), NOW)).toEqual({
      status: "overdue",
      daysUntilDue: -1,
    });
    expect(getDueStatus(new Date(2026, 10, 21), NOW)).toEqual({
      status: "today",
      daysUntilDue: 0,
    });
    expect(getDueStatus(new Date(2026, 10, 24), NOW)).toEqual({
      status: "upcoming",
      daysUntilDue: 3,
    });
    expect(getDueStatus(null, NOW)).toEqual({
      status: "none",
      daysUntilDue: null,
    });
  });

  it("labels each status for the alert badge", () => {
    expect(getDueStatusLabel("overdue", -3)).toBe("Overdue 3d");
    expect(getDueStatusLabel("today", 0)).toBe("Due today");
    expect(getDueStatusLabel("upcoming", 2)).toBe("Due in 2d");
    expect(getDueStatusLabel("none", null)).toBe("No due date");
  });
});

describe("buildDashboardMetrics", () => {
  it("totals billed and collected amounts and counts occupancy", () => {
    const metrics = buildDashboardMetrics([
      unit({
        lines: [
          line({ amount: 10000, paidAt: "2026-11-03T00:00:00.000Z" }),
          line({ amount: 2000 }),
        ],
      }),
      unit({
        tenants: [tenant({ id: "tenant-2", tenantStatus: "Inactive" })],
        lines: [line({ amount: 5000 })],
        unitProperty: { id: "unit-2", name: "Unit 1A" },
      }),
    ]);

    expect(metrics).toEqual({
      collected: 10000,
      target: 17000,
      pending: 7000,
      progress: 10000 / 17000,
      occupiedUnits: 1,
      totalUnits: 2,
      occupancyRate: 50,
    });
  });

  it("returns zeros when there are no units", () => {
    expect(buildDashboardMetrics([])).toEqual({
      collected: 0,
      target: 0,
      pending: 0,
      progress: 0,
      occupiedUnits: 0,
      totalUnits: 0,
      occupancyRate: 0,
    });
  });
});

describe("buildPaymentAlerts", () => {
  it("aggregates unpaid bills per occupied unit", () => {
    const alerts = buildPaymentAlerts({
      units: [
        unit({
          parentName: "Subic Bay View",
          lines: [
            line({ amount: 12000 }),
            line({ amount: 500, bill: bill({ id: "bill-water", name: "Water", recurringDay: 25 }) }),
            line({ amount: 3000, paidAt: "2026-11-10T00:00:00.000Z" }),
          ],
        }),
      ],
      period: PERIOD,
      now: NOW,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      unitLabel: "Unit 3B",
      propertyName: "Subic Bay View",
      tenantName: "Juan Dela Cruz",
      amount: 12500,
      status: "overdue",
      daysUntilDue: -16,
      billLines: [
        { propertyId: "unit-1", billingItemId: "bill-rent" },
        { propertyId: "unit-1", billingItemId: "bill-water" },
      ],
    });
    expect(alerts[0].dueDate).toEqual(new Date(2026, 10, 5));
  });

  it("skips units without active tenants or outstanding balances", () => {
    const alerts = buildPaymentAlerts({
      units: [
        unit({
          tenants: [tenant({ tenantStatus: "Inactive" })],
          lines: [line({ amount: 12000 })],
        }),
        unit({
          unitProperty: { id: "unit-2", name: "Unit 1A" },
          lines: [line({ amount: 12000, paidAt: "2026-11-05T00:00:00.000Z" })],
        }),
      ],
      period: PERIOD,
      now: NOW,
    });

    expect(alerts).toEqual([]);
  });

  it("orders overdue alerts before upcoming ones", () => {
    const alerts = buildPaymentAlerts({
      units: [
        unit({
          lines: [line({ amount: 1000, bill: bill({ recurringDay: 25 }) })],
        }),
        unit({
          unitProperty: { id: "unit-2", name: "Unit 1A" },
          lines: [line({ amount: 2000, bill: bill({ recurringDay: 2 }) })],
        }),
      ],
      period: PERIOD,
      now: NOW,
    });

    expect(alerts.map((alert) => alert.unitLabel)).toEqual([
      "Unit 1A",
      "Unit 3B",
    ]);
  });
});

describe("buildActivityFeed", () => {
  const cashbooks: Cashbook[] = [
    {
      id: "book-1",
      title: "Main fund",
      description: "",
      initialCashIn: 0,
      initialCashOut: 0,
      date: "",
      autoCreateMonthly: false,
      createdAt: "",
    },
  ];

  const cashbookEntries: CashbookEntry[] = [
    {
      id: "cash-1",
      cashbookId: "book-1",
      type: "cashIn",
      amount: 5000,
      paymentMode: "Cash",
      description: "Rent cash",
      date: "2026-11-21",
      createdAt: "2026-11-21T08:00:00.000Z",
    },
    {
      id: "cash-2",
      cashbookId: "book-1",
      type: "cashOut",
      amount: 700,
      paymentMode: "Cash",
      description: "",
      date: "2026-11-20",
      createdAt: "2026-11-20T08:00:00.000Z",
    },
  ];

  const monthlyEntries: MonthlyBillEntry[] = [
    {
      id: "entry-1",
      period: PERIOD,
      propertyId: "unit-1",
      billingItemId: "bill-rent",
      amount: 12000,
      paidAt: "2026-11-21T10:00:00.000Z",
      note: "",
      createdAt: "2026-11-01T00:00:00.000Z",
    },
    {
      id: "entry-2",
      period: PERIOD,
      propertyId: "unit-1",
      billingItemId: "bill-water",
      amount: 500,
      note: "",
      createdAt: "2026-11-15T00:00:00.000Z",
    },
    {
      id: "entry-3",
      period: PERIOD,
      propertyId: "unit-1",
      billingItemId: "bill-rent",
      note: "",
      createdAt: "2026-11-02T00:00:00.000Z",
    },
  ];

  const feed = buildActivityFeed({
    monthlyEntries,
    cashbookEntries,
    cashbooks,
    properties: [property()],
    bills: [bill(), bill({ id: "bill-water", name: "Water" })],
  });

  it("merges and sorts cash movements with bill rows", () => {
    expect(feed.map((item) => item.id)).toEqual([
      "bill-entry-1",
      "cashbook-cash-1",
      "cashbook-cash-2",
      "bill-entry-2",
    ]);
  });

  it("marks paid bills as income and unpaid bills as pending", () => {
    expect(feed[0]).toMatchObject({
      kind: "bill",
      title: "Rent paid",
      tag: "Unit 3B",
      direction: "in",
    });
    expect(feed[3]).toMatchObject({
      kind: "bill",
      title: "Water bill",
      direction: "pending",
    });
    expect(feed[2]).toMatchObject({
      title: "Cash out",
      tag: "Main fund",
      direction: "out",
    });
  });

  it("filters the feed by source", () => {
    expect(filterActivity(feed, "cashbook")).toHaveLength(2);
    expect(filterActivity(feed, "bill")).toHaveLength(2);
    expect(filterActivity(feed, "all")).toHaveLength(4);
  });
});

describe("formatRelativeTime", () => {
  const relNow = new Date("2026-11-21T09:00:00.000Z");

  it("formats recent timestamps relative to now", () => {
    expect(formatRelativeTime("2026-11-21T08:59:30.000Z", relNow)).toBe(
      "Just now",
    );
    expect(formatRelativeTime("2026-11-21T08:30:00.000Z", relNow)).toBe(
      "30m ago",
    );
    expect(formatRelativeTime("2026-11-21T05:00:00.000Z", relNow)).toBe(
      "4h ago",
    );
    expect(formatRelativeTime("2026-11-20T09:00:00.000Z", relNow)).toBe(
      "Yesterday",
    );
    expect(formatRelativeTime("2026-11-18T09:00:00.000Z", relNow)).toBe(
      "3d ago",
    );
  });
});
