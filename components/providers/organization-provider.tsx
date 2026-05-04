"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Organization } from "@/lib/api/types";
import { useMe } from "@/hooks/use-me";
import { useOrganizations } from "@/hooks/use-organizations";

const activeOrganizationStorageKey = "box-planner-active-organization-id";

interface OrganizationContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (organizationId: string | null) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    string | null
  >(null);
  const meQuery = useMe();
  const organizationsQuery = useOrganizations(meQuery.isSuccess);
  const organizations = organizationsQuery.data ?? [];

  useEffect(() => {
    setActiveOrganizationIdState(
      localStorage.getItem(activeOrganizationStorageKey),
    );
  }, []);

  useEffect(() => {
    if (!organizationsQuery.isSuccess) {
      return;
    }

    if (organizations.length === 0) {
      setActiveOrganizationIdState(null);
      localStorage.removeItem(activeOrganizationStorageKey);
      return;
    }

    const currentExists = organizations.some(
      (organization) => organization.id === activeOrganizationId,
    );

    if (!activeOrganizationId || !currentExists) {
      const nextOrganizationId = organizations[0]?.id ?? null;
      setActiveOrganizationIdState(nextOrganizationId);

      if (nextOrganizationId) {
        localStorage.setItem(activeOrganizationStorageKey, nextOrganizationId);
      }
    }
  }, [activeOrganizationId, organizations, organizationsQuery.isSuccess]);

  const setActiveOrganizationId = (organizationId: string | null) => {
    setActiveOrganizationIdState(organizationId);

    if (organizationId) {
      localStorage.setItem(activeOrganizationStorageKey, organizationId);
      return;
    }

    localStorage.removeItem(activeOrganizationStorageKey);
  };

  const activeOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrganization,
      activeOrganizationId,
      setActiveOrganizationId,
      loading: meQuery.isLoading || organizationsQuery.isLoading,
      error:
        meQuery.error instanceof Error
          ? meQuery.error
          : organizationsQuery.error instanceof Error
          ? organizationsQuery.error
          : null,
      refetch: async () => {
        await meQuery.refetch();
        return organizationsQuery.refetch();
      },
    }),
    [
      activeOrganization,
      activeOrganizationId,
      organizations,
      meQuery.error,
      meQuery.isLoading,
      organizationsQuery.error,
      organizationsQuery.isLoading,
      organizationsQuery.refetch,
      meQuery.refetch,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useActiveOrganization() {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      "useActiveOrganization must be used within OrganizationProvider",
    );
  }

  return context;
}
