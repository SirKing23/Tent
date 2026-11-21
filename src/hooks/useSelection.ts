import { useCallback, useState } from "react";

/**
 * Long-press selection state shared by every list screen: selecting,
 * toggling, select-all replacement, and leaving selection mode.
 */
export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const selectOnly = useCallback((id: string) => setSelectedIds([id]), []);

  const replace = useCallback((ids: string[]) => setSelectedIds(ids), []);

  return {
    selectedIds,
    isSelectionMode: selectedIds.length > 0,
    toggle,
    clear,
    selectOnly,
    replace,
  };
}
