export type ProvinceOption = { code: string; name: string };

export type CityOption = {
  code: string;
  name: string;
  /** Province code, or the region code for Metro Manila / independent cities. */
  province: string;
};

export type PhAddressDataset = {
  version: string;
  source: string;
  provinces: ProvinceOption[];
  cities: CityOption[];
  /** Barangay names keyed by city/municipality code. */
  barangays: Record<string, readonly string[]>;
};

const normalize = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

/** Province code for a stored name; `undefined` when it was typed by hand. */
export function findProvinceCode(
  dataset: PhAddressDataset,
  name: string,
): string | undefined {
  const target = normalize(name);
  if (!target) return undefined;
  return dataset.provinces.find(
    (province) => normalize(province.name) === target,
  )?.code;
}

export function citiesForProvince(
  dataset: PhAddressDataset,
  provinceCode: string | undefined,
): CityOption[] {
  if (!provinceCode) return [];
  return dataset.cities.filter((city) => city.province === provinceCode);
}

/** City code for a stored name inside the selected province. */
export function findCityCode(
  dataset: PhAddressDataset,
  provinceCode: string | undefined,
  name: string,
): string | undefined {
  const target = normalize(name);
  if (!target) return undefined;
  return citiesForProvince(dataset, provinceCode).find(
    (city) => normalize(city.name) === target,
  )?.code;
}

export function barangaysForCity(
  dataset: PhAddressDataset,
  cityCode: string | undefined,
): readonly string[] {
  if (!cityCode) return [];
  return dataset.barangays[cityCode] ?? [];
}

/** Case-insensitive "contains" search used by the picker. */
export const matchesAddressQuery = (label: string, query: string): boolean =>
  !query.trim() || normalize(label).includes(normalize(query));

/** Truncated search results keep the list responsive on long barangay lists. */
export const MAX_PICKER_RESULTS = 200;

export type AddressPickerItem = { key: string; label: string; hint?: string };

export function toPickerItems(
  options: readonly { code?: string; name: string; hint?: string }[],
): AddressPickerItem[] {
  return options.map((option, index) => ({
    key: option.code ?? `${option.name}-${index}`,
    label: option.name,
    hint: option.hint,
  }));
}
