import { useEffect, useState } from "react";

import type { PhAddressDataset } from "../logic/phAddresses";
import { loadPhAddresses } from "../logic/phAddressesAsset";

type PhAddressState = {
  dataset: PhAddressDataset | null;
  isLoading: boolean;
  error: string | null;
};

/** Loads the bundled PSGC lists once and keeps them for the session. */
export function usePhAddresses(): PhAddressState {
  const [dataset, setDataset] = useState<PhAddressDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPhAddresses()
      .then((next) => {
        if (active) setDataset(next);
      })
      .catch((loadError: unknown) => {
        console.error("Unable to load the address lists:", loadError);
        if (active) setError("The address lists could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  return { dataset, isLoading: !dataset && !error, error };
}
