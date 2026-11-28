/**
 * Regenerates `assets/psgc/ph-addresses.psgc` from the PSA Philippine Standard
 * Geographic Code (PSGC) API.
 *
 * Run with: `node scripts/build-ph-addresses.mjs`
 *
 * The output is committed, so a normal build never needs the network. Re-run it
 * when PSA publishes a new PSGC release (barangays are created, merged, or
 * renamed a few times a year).
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://psgc.gitlab.io/api";
const OUTPUT = path.resolve("assets/psgc/ph-addresses.psgc");

/** Regions that own cities directly, so the province step still has a value. */
const REGION_AS_PROVINCE = {
  "130000000": "Metro Manila",
};

const fetchJson = async (pathname) => {
  const response = await fetch(`${API}/${pathname}`);
  if (!response.ok) {
    throw new Error(`PSGC ${pathname} failed: ${response.status}`);
  }
  return response.json();
};

const byName = (a, b) => a.name.localeCompare(b.name, "en");

const main = async () => {
  const [regions, provinces, cities, barangays] = await Promise.all([
    fetchJson("regions.json"),
    fetchJson("provinces.json"),
    fetchJson("cities-municipalities.json"),
    fetchJson("barangays.json"),
  ]);

  const regionNames = new Map(
    regions.map((region) => [region.code, region.name]),
  );

  // Every city/municipality belongs to a province, except the ones the PSGC
  // attaches straight to a region (Metro Manila, City of Isabela, City of
  // Cotabato). Those regions become province-level options of their own.
  const regionAsProvince = new Set(
    cities.filter((city) => !city.provinceCode).map((city) => city.regionCode),
  );

  const provinceOptions = [
    ...provinces.map((province) => ({
      code: province.code,
      name: province.name,
    })),
    ...[...regionAsProvince].map((code) => ({
      code,
      name: REGION_AS_PROVINCE[code] ?? regionNames.get(code) ?? code,
    })),
  ].sort(byName);

  const cityOptions = cities
    .map((city) => ({
      code: city.code,
      name: city.name,
      province: city.provinceCode || city.regionCode,
    }))
    .sort(byName);

  const barangaysByCity = {};
  for (const barangay of barangays) {
    const cityCode = barangay.municipalityCode || barangay.cityCode;
    if (!cityCode) continue;
    (barangaysByCity[cityCode] ??= []).push(barangay.name);
  }
  for (const names of Object.values(barangaysByCity)) {
    names.sort((a, b) => a.localeCompare(b, "en"));
  }

  const payload = {
    version: new Date().toISOString().slice(0, 10),
    source: "PSA Philippine Standard Geographic Code (PSGC)",
    provinces: provinceOptions,
    cities: cityOptions,
    barangays: barangaysByCity,
  };

  const json = JSON.stringify(payload);
  await writeFile(OUTPUT, json, "utf8");

  console.log(
    [
      `wrote ${OUTPUT}`,
      `${provinceOptions.length} provinces`,
      `${cityOptions.length} cities/municipalities`,
      `${barangays.length} barangays`,
      `${(json.length / 1024).toFixed(0)} KB`,
    ].join(" · "),
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
