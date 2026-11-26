import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  deleteGalleryAsset,
  getGalleryAssets,
} from "../services/galleryRepository";
import type { GalleryAsset } from "../types";

/** Every saved record photo, newest first, with pull-to-refresh and delete. */
export function useGallery() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setAssets(await getGalleryAssets());
    setIsLoading(false);
  }, []);

  useFocusReload(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const remove = useCallback(
    async (asset: GalleryAsset) => {
      await deleteGalleryAsset(asset);
      setAssets((current) =>
        current.filter((item) => item.key !== asset.key),
      );
      await load();
    },
    [load],
  );

  return { assets, isLoading, isRefreshing, refresh, remove };
}
