import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { persistPhoto } from "../../../services/photoStorage";
import { createTimestampId } from "../../../utils/id";
import type { ValidationResult } from "../../../types/validation";
import { validateTenantDraft } from "../logic/tenantRules";
import {
  deleteTenantRecord,
  getTenants,
  saveTenantRecord,
} from "../services/tenantRepository";
import type { TenantDraft } from "../types";

const EMPTY_TENANT_DRAFT: TenantDraft = {
  tenantStatus: "Active",
  photo: null,
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  idType: "",
  idNumber: "",
  idPhoto: null,
};

/** Create/edit tenant form, including photo persistence. */
export function useTenantForm(id?: string) {
  const [draft, setDraft] = useState<TenantDraft>(EMPTY_TENANT_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  useFocusReload(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const tenant = (await getTenants()).find((item) => item.id === id);
        if (tenant) {
          setDraft({
            tenantStatus: tenant.tenantStatus,
            photo: tenant.photo,
            firstName: tenant.firstName,
            middleName: tenant.middleName,
            lastName: tenant.lastName,
            phone: tenant.phone,
            email: tenant.email,
            idType: tenant.idType,
            idNumber: tenant.idNumber,
            idPhoto: tenant.idPhoto,
          });
        }
      })();
    }, [id]),
  );

  const update = useCallback(
    <K extends keyof TenantDraft>(field: K, value: TenantDraft[K]) =>
      setDraft((current) => ({ ...current, [field]: value })),
    [],
  );

  const save = useCallback(async (): Promise<ValidationResult> => {
    const validation = validateTenantDraft(draft);
    if (!validation.valid) return validation;

    setIsSaving(true);
    try {
      // Copy freshly picked photos into app-private storage; existing
      // app-private paths are returned unchanged.
      const photo = await persistPhoto(draft.photo, "tenant-photo");
      const idPhoto = await persistPhoto(draft.idPhoto, "tenant-id");

      await saveTenantRecord({
        ...draft,
        photo,
        idPhoto,
        id: id ?? createTimestampId(),
      });
      return validation;
    } finally {
      setIsSaving(false);
    }
  }, [draft, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    await deleteTenantRecord(id);
  }, [id]);

  return { draft, update, save, remove, isSaving };
}
