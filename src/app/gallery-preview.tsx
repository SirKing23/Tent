import "../../global.css";

import { GalleryViewerModal } from "../features/gallery/components/GalleryViewerModal";
import type { GalleryAsset } from "../features/gallery/types";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const asset: GalleryAsset = {
  key: "cashbook-demo",
  kind: "cashbook-entry",
  storedPath: "photos/demo.png",
  uri: TINY_PNG,
  savedAt: Date.now(),
  tag: "Cashbook receipt",
  title: "Payment for water bill",
  subtitle: "House expenses · Cash out",
  facts: [
    { label: "Amount", value: "₱1,250.00" },
    { label: "Payment mode", value: "GCash" },
    { label: "Entry date", value: "11/23/2026" },
    { label: "Saved", value: "Nov 23, 2026 · 9:42 AM" },
    { label: "Extra one", value: "Another long value here to push height" },
    { label: "Extra two", value: "Another long value here to push height" },
  ],
  target: { kind: "cashbook", cashbookId: "demo" },
  ref: { kind: "cashbook-entry", entryId: "demo" },
};

export default function GalleryPreview() {
  return (
    <GalleryViewerModal
      asset={asset}
      onClose={() => {}}
      onDelete={() => {}}
      onOpenSource={() => {}}
    />
  );
}
