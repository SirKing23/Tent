import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import type { PhAddressDataset } from "./phAddresses";

let cached: PhAddressDataset | null = null;
let pending: Promise<PhAddressDataset> | null = null;

/**
 * The PSGC lists are ~635 KB, so they ship as a bundled asset and are read the
 * first time an address picker opens instead of being parsed at app start.
 */
export function loadPhAddresses(): Promise<PhAddressDataset> {
  if (cached) return Promise.resolve(cached);
  pending ??= readAsset()
    .then((dataset) => {
      cached = dataset;
      return dataset;
    })
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

async function readAsset(): Promise<PhAddressDataset> {
  const [asset] = await Asset.loadAsync(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../../assets/psgc/ph-addresses.psgc"),
  );
  const uri = asset.localUri ?? asset.uri;
  const text =
    Platform.OS === "web"
      ? await (await fetch(uri)).text()
      : await new File(uri).text();
  return JSON.parse(text) as PhAddressDataset;
}
