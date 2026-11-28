import { HOME_COUNTRY, isHomeCountry } from "../countries";
import {
  barangaysForCity,
  citiesForProvince,
  findCityCode,
  findProvinceCode,
  matchesAddressQuery,
  MAX_PICKER_RESULTS,
  toPickerItems,
  type PhAddressDataset,
} from "../phAddresses";

const dataset: PhAddressDataset = {
  version: "2026-11-27",
  source: "test",
  provinces: [
    { code: "130000000", name: "Metro Manila" },
    { code: "012800000", name: "Ilocos Norte" },
  ],
  cities: [
    { code: "130000001", name: "City of Makati", province: "130000000" },
    { code: "130000002", name: "Pasay City", province: "130000000" },
    { code: "012801000", name: "Adams", province: "012800000" },
  ],
  barangays: {
    "130000001": ["Bangkal", "Bel-Air", "Poblacion"],
    "012801000": ["Adams (Pob.)"],
  },
};

describe("address lookup", () => {
  it("resolves a stored province name regardless of casing or spacing", () => {
    expect(findProvinceCode(dataset, "ilocos   norte")).toBe("012800000");
    expect(findProvinceCode(dataset, "  METRO MANILA ")).toBe("130000000");
  });

  it("leaves hand-typed names unresolved", () => {
    expect(findProvinceCode(dataset, "Somewhere Else")).toBeUndefined();
    expect(findProvinceCode(dataset, "")).toBeUndefined();
  });

  it("lists only the cities of the chosen province", () => {
    expect(
      citiesForProvince(dataset, "130000000").map((city) => city.name),
    ).toEqual(["City of Makati", "Pasay City"]);
    expect(citiesForProvince(dataset, undefined)).toEqual([]);
  });

  it("resolves a stored city inside its province only", () => {
    expect(findCityCode(dataset, "130000000", "Pasay City")).toBe("130000002");
    expect(findCityCode(dataset, "012800000", "Pasay City")).toBeUndefined();
    expect(findCityCode(dataset, "130000000", "ADAMS")).toBeUndefined();
  });

  it("returns the barangays of the chosen city", () => {
    expect(barangaysForCity(dataset, "130000001")).toEqual([
      "Bangkal",
      "Bel-Air",
      "Poblacion",
    ]);
    expect(barangaysForCity(dataset, undefined)).toEqual([]);
  });
});

describe("picker helpers", () => {
  it("filters case-insensitively and shows everything for an empty query", () => {
    expect(matchesAddressQuery("City of Makati", "maka")).toBe(true);
    expect(matchesAddressQuery("City of Makati", "  pasay ")).toBe(false);
    expect(matchesAddressQuery("City of Makati", "   ")).toBe(true);
  });

  it("maps options to list rows with stable keys", () => {
    expect(toPickerItems([{ code: "1", name: "Makati" }])).toEqual([
      { key: "1", label: "Makati", hint: undefined },
    ]);
    expect(toPickerItems([{ name: "Typed" }])[0].key).toBe("Typed-0");
    expect(MAX_PICKER_RESULTS).toBe(200);
  });
});

describe("isHomeCountry", () => {
  it("accepts the country name and its ISO code", () => {
    expect(isHomeCountry(HOME_COUNTRY)).toBe(true);
    expect(isHomeCountry(" philippines ")).toBe(true);
    expect(isHomeCountry("PH")).toBe(true);
    expect(isHomeCountry("United States")).toBe(false);
  });
});
