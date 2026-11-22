import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

type CaptureTarget = { readonly current: unknown };

const isWeb = Platform.OS === "web";

const captureInvoice = (ref: CaptureTarget): Promise<string> =>
  captureRef(ref as Parameters<typeof captureRef>[0], {
    format: "png",
    quality: 1,
    result: isWeb ? "data-uri" : "tmpfile",
  });

const downloadDataUri = (dataUri: string, fileName: string): void => {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUri;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const webFileFromDataUri = async (
  dataUri: string,
  fileName: string,
): Promise<File> => {
  const blob = await (await fetch(dataUri)).blob();
  return new File([blob], fileName, { type: "image/png" });
};

export const buildInvoiceFileName = (
  propertyName: string,
  period: string,
): string => {
  const slug = propertyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tent-invoice-${slug || "property"}-${period}.png`;
};

/** Returns `"downloaded"` when the browser fallback was used instead of a share sheet. */
export const shareInvoiceImage = async (
  ref: CaptureTarget,
  fileName: string,
): Promise<"shared" | "downloaded"> => {
  const uri = await captureInvoice(ref);

  if (isWeb) {
    const file = await webFileFromDataUri(uri, fileName);
    const navigatorWithShare = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (
      navigatorWithShare.share &&
      navigatorWithShare.canShare?.({ files: [file] })
    ) {
      try {
        await navigatorWithShare.share({
          files: [file],
          title: "Property invoice",
        });
      } catch (error) {
        // Closing the browser share sheet is not a failure.
        if (!(error instanceof Error && error.name === "AbortError")) {
          throw error;
        }
      }
      return "shared";
    }
    downloadDataUri(uri, fileName);
    return "downloaded";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: "Share invoice",
    mimeType: "image/png",
    UTI: "public.png",
  });
  return "shared";
};

export type SaveInvoiceResult = "saved" | "downloaded" | "permission-denied";

export const saveInvoiceImage = async (
  ref: CaptureTarget,
  fileName: string,
): Promise<SaveInvoiceResult> => {
  const uri = await captureInvoice(ref);

  if (isWeb) {
    downloadDataUri(uri, fileName);
    return "downloaded";
  }

  const permission = await requestPermissionsAsync(true);
  if (permission.status !== "granted") return "permission-denied";

  await Asset.create(uri);
  return "saved";
};
