import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  getUserProfile,
  saveUserProfile,
} from "../services/userProfileRepository";
import {
  EMPTY_USER_PROFILE,
  type UserProfile,
} from "../types";

/** Local account settings: the name shown in the dashboard greeting. */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setProfile(await getUserProfile());
    setIsLoading(false);
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const save = useCallback(
    async (next: UserProfile) => {
      await saveUserProfile(next);
      await refresh();
    },
    [refresh],
  );

  return { profile, isLoading, save, refresh };
}
