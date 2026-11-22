import { DEFAULT_INVOICE_SETTINGS } from "../../types";
import { parseInvoiceSettings } from "../invoiceSettings";

describe("parseInvoiceSettings", () => {
  it("returns defaults when there is nothing stored", () => {
    expect(parseInvoiceSettings(null)).toEqual(DEFAULT_INVOICE_SETTINGS);
    expect(parseInvoiceSettings("not json")).toEqual(DEFAULT_INVOICE_SETTINGS);
  });

  it("keeps stored customizations and fills missing fields", () => {
    expect(
      parseInvoiceSettings(
        JSON.stringify({
          title: "Casa Verdad",
          footerImageUri: "photos/invoice-footer-qr.png",
        }),
      ),
    ).toEqual({
      ...DEFAULT_INVOICE_SETTINGS,
      title: "Casa Verdad",
      footerImageUri: "photos/invoice-footer-qr.png",
    });
  });

  it("falls back for a blank title and ignores non-string fields", () => {
    expect(
      parseInvoiceSettings(
        JSON.stringify({
          title: "   ",
          subtitle: 7,
          iconUri: "",
          paymentNote: "",
        }),
      ),
    ).toEqual({
      ...DEFAULT_INVOICE_SETTINGS,
      iconUri: null,
      paymentNote: "",
      subtitle: DEFAULT_INVOICE_SETTINGS.subtitle,
      title: DEFAULT_INVOICE_SETTINGS.title,
    });
  });
});
