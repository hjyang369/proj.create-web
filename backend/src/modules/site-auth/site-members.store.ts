export type PublicSiteMember = {
  id: number;
  siteId: number;
  email: string;
  name: string;
};

export type StoredSiteMember = PublicSiteMember & {
  passwordHash: string;
};

export type SiteMembersStore = {
  siteExists: (siteId: number) => Promise<boolean>;
  findBySiteAndEmail: (
    siteId: number,
    email: string,
  ) => Promise<StoredSiteMember | null>;
  findById: (
    siteId: number,
    memberId: number,
  ) => Promise<PublicSiteMember | null>;
  create: (input: {
    siteId: number;
    email: string;
    name: string;
    passwordHash: string;
  }) => Promise<PublicSiteMember>;
};

export const SITE_MEMBERS_STORE = Symbol("SITE_MEMBERS_STORE");
