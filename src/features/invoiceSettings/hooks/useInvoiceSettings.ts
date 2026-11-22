import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  deleteStoredPhoto,
  persistPhoto,
} from "../../../services/photoStorage";
import {
  getInvoiceSettings,
  saveInvoiceSettings,
} from "../services/invoiceSettingsRepository";
import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings } from "../types";

/** Global invoice branding and payment settings. */
export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoiceSettings>(
    DEFAULT_INVOICE_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSettings(await getInvoiceSettings());
    setIsLoading(false);
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const save = useCallback(
    async (next: InvoiceSettings) => {
      const previous = settings;
      const iconUri = await persistPhoto(next.iconUri, "invoice-icon");
      const footerImageUri = await persistPhoto(
        next.footerImageUri,
        "invoice-footer",
      );

      try {
        await saveInvoiceSettings({ ...next, iconUri, footerImageUri });
      } catch (error) {
        // The database still holds the old settings, so drop the new copies.
        if (iconUri && iconUri !== previous.iconUri) {
          deleteStoredPhoto(iconUri);
        }
        if (footerImageUri && footerImageUri !== previous.footerImageUri) {
          deleteStoredPhoto(footerImageUri);
        }
        throw error;
      }

      if (previous.iconUri && previous.iconUri !== iconUri) {
        deleteStoredPhoto(previous.iconUri);
      }
      if (
        previous.footerImageUri &&
        previous.footerImageUri !== footerImageUri
      ) {
        deleteStoredPhoto(previous.footerImageUri);
      }

      await refresh();
    },
    [refresh, settings],
  );

  return { settings, isLoading, save, refresh };
}
