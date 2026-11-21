import {
  formatPeriodLabel,
  getCurrentPeriod,
  shiftPeriod,
} from "../period";

describe("billing periods", () => {
  it("formats the current month as YYYY-MM", () => {
    expect(getCurrentPeriod(new Date(2026, 10, 5))).toBe("2026-11");
    expect(getCurrentPeriod(new Date(2026, 0, 1))).toBe("2026-01");
  });

  it("shifts across year boundaries", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-11", 0)).toBe("2026-11");
  });

  it("renders a human-readable month label", () => {
    expect(formatPeriodLabel("2026-11")).toBe("November 2026");
  });
});
