import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/** Runs `reload` every time the screen gains focus. */
export function useFocusReload(reload: () => void): void {
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
}
