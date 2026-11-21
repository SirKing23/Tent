import { validateCashbookDraft, validateCashbookEntry } from "../cashbookValidation";

describe("validateCashbookDraft", () => {
  it("requires a non-blank title", () => {
    expect(validateCashbookDraft("  ")).toEqual({
      valid: false,
      title: "Title required",
      message: "Please enter a name for this cash book.",
    });
    expect(validateCashbookDraft("Main")).toEqual({ valid: true });
  });
});

describe("validateCashbookEntry", () => {
  it("requires a selected cash book and explains how to pick one", () => {
    expect(
      validateCashbookEntry({
        rawAmount: "100",
        selectedCashbookId: undefined,
        isSelectingCashbook: true,
      }),
    ).toEqual({
      valid: false,
      title: "Cash book required",
      message: "Please select a cash book before saving this entry.",
    });
    expect(
      validateCashbookEntry({
        rawAmount: "100",
        selectedCashbookId: undefined,
        isSelectingCashbook: false,
      }),
    ).toMatchObject({ valid: false, message: "Open this form from a cash book." });
  });

  it("requires a positive amount and returns the parsed value", () => {
    expect(
      validateCashbookEntry({
        rawAmount: "0",
        selectedCashbookId: "book-1",
        isSelectingCashbook: false,
      }),
    ).toMatchObject({ valid: false, title: "Amount required" });

    expect(
      validateCashbookEntry({
        rawAmount: "1,250.50",
        selectedCashbookId: "book-1",
        isSelectingCashbook: false,
      }),
    ).toEqual({ valid: true, amount: 1250.5, cashbookId: "book-1" });
  });
});
