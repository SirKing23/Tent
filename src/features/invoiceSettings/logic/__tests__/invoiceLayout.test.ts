import {
  getFooterImageSize,
  getInvoiceBillDetails,
} from "../invoiceLayout";

const formatAmount = (value: number) => `P${value.toFixed(2)}`;

describe("getFooterImageSize", () => {
  it("fills the content width of a square footer image", () => {
    expect(
      getFooterImageSize({
        contentWidth: 312,
        source: { width: 1200, height: 1200 },
      }),
    ).toEqual({ width: 312, height: 312 });
  });

  it("keeps the aspect ratio of a wide banner", () => {
    expect(
      getFooterImageSize({
        contentWidth: 300,
        source: { width: 900, height: 300 },
      }),
    ).toEqual({ width: 300, height: 100 });
  });

  it("falls back to a square before the image reports its size", () => {
    expect(getFooterImageSize({ contentWidth: 300 })).toEqual({
      width: 300,
      height: 300,
    });
    expect(
      getFooterImageSize({
        contentWidth: 300,
        source: { width: 0, height: 0 },
      }),
    ).toEqual({ width: 300, height: 300 });
  });
});

describe("getInvoiceBillDetails", () => {
  it("puts every metered detail on its own line, including the rate", () => {
    expect(
      getInvoiceBillDetails(
        {
          utilityType: "Electricity",
          displayUnit: "kWh",
          dueDate: "11/15/2026",
          reading: 1320,
          previousReading: 1200,
          consumption: 120,
          rate: 25,
        },
        formatAmount,
      ),
    ).toEqual([
      "Electricity",
      "Due 11/15/2026",
      "1,200 → 1,320 kWh",
      "120 kWh used",
      "Rate P25.00 per kWh",
    ]);
  });

  it("reports a missing due date and non-metered bills plainly", () => {
    expect(
      getInvoiceBillDetails(
        { utilityType: "Internet", displayUnit: "" },
        formatAmount,
      ),
    ).toEqual(["Internet", "No due date"]);
  });

  it("describes consumption without a reading", () => {
    expect(
      getInvoiceBillDetails(
        {
          utilityType: "Water",
          displayUnit: "cu.m",
          dueDate: "11/20/2026",
          consumption: 12.5,
          rate: 30,
        },
        formatAmount,
      ),
    ).toEqual([
      "Water",
      "Due 11/20/2026",
      "12.5 cu.m used",
      "Rate P30.00 per cu.m",
    ]);
  });

  it("describes a reading without consumption", () => {
    expect(
      getInvoiceBillDetails(
        {
          utilityType: "Electricity",
          displayUnit: "kWh",
          reading: 1320,
          dueDate: "11/15/2026",
        },
        formatAmount,
      ),
    ).toEqual(["Electricity", "Due 11/15/2026", "1,320 kWh reading"]);
  });
});
