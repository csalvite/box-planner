export interface ApiUser {
  id: string;
  email?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  type?: OrganizationType | string | null;
  role?: OrganizationRole | string | null;
  membership?: OrganizationMembership | null;
  member?: OrganizationMembership | null;
  organizationUser?: OrganizationMembership | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type OrganizationType = "GYM" | "COACH" | "TEAM" | "OTHER";
export type OrganizationRole = "OWNER" | "ADMIN" | "COACH" | "VIEWER";

export interface OrganizationMembership {
  role?: OrganizationRole | string | null;
  [key: string]: unknown;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type?: OrganizationType;
  [key: string]: unknown;
}

export type MeResponse =
  | ApiUser
  | {
      user?: ApiUser | null;
      data?: ApiUser | null;
    };

export type OrganizationsResponse =
  | Organization[]
  | {
      organizations?: Organization[];
      data?: Organization[];
    };

export type CreateOrganizationResponse =
  | Organization
  | {
      organization?: Organization;
      data?: Organization;
    };

export type BlockVisibility = "PRIVATE" | "PUBLIC";

export interface BlockCategory {
  id: number;
  key: string;
  name: string;
  description?: string | null;
}

export interface ApiBlock {
  id: string;
  organizationId?: string;
  createdById?: string;
  name: string;
  description?: string | null;
  level?: string | null;
  estimatedDurationSec?: number;
  visibility?: BlockVisibility;
  categoryId?: number | null;
  category?: BlockCategory | null;
  exercises?: unknown[];
  _count?: {
    exercises: number;
  };
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  [key: string]: unknown;
}

export interface CreateBlockInput {
  name: string;
  description?: string;
  level?: string;
  categoryId?: number;
  isPublic?: boolean;
}

export type UpdateBlockInput = Partial<CreateBlockInput> & {
  categoryId?: number | null;
};

export type BlocksResponse =
  | ApiBlock[]
  | {
      blocks?: ApiBlock[];
      data?: ApiBlock[];
    };

export type BlockResponse =
  | ApiBlock
  | {
      block?: ApiBlock;
      data?: ApiBlock;
    };

export type BlockCategoriesResponse =
  | BlockCategory[]
  | {
      categories?: BlockCategory[];
      data?: BlockCategory[];
    };
