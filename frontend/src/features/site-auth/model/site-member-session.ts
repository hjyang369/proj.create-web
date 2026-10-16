export type SiteMember = {
  id: number;
  siteId: number;
  email: string;
  name: string;
};

export type SiteMemberSession = {
  accessToken: string;
  member: SiteMember;
};

function tokenKey(siteId: number): string {
  return `site_member_token_${siteId}`;
}

function userKey(siteId: number): string {
  return `site_member_user_${siteId}`;
}

function isMember(value: unknown, siteId: number): value is SiteMember {
  if (typeof value !== "object" || value === null) return false;
  const member = value as Record<string, unknown>;
  return (
    member.siteId === siteId &&
    typeof member.id === "number" &&
    Number.isInteger(member.id) &&
    member.id > 0 &&
    typeof member.email === "string" &&
    typeof member.name === "string"
  );
}

export function readSiteMember(siteId: number): SiteMemberSession | null {
  const accessToken = localStorage.getItem(tokenKey(siteId));
  const raw = localStorage.getItem(userKey(siteId));
  if (!accessToken || !raw) return null;

  try {
    const member = JSON.parse(raw) as unknown;
    if (!isMember(member, siteId)) return null;
    return { accessToken, member };
  } catch {
    return null;
  }
}

export function saveSiteMember(
  siteId: number,
  accessToken: string,
  member: SiteMember,
): void {
  localStorage.setItem(tokenKey(siteId), accessToken);
  localStorage.setItem(userKey(siteId), JSON.stringify(member));
}

export function clearSiteMember(siteId: number): void {
  localStorage.removeItem(tokenKey(siteId));
  localStorage.removeItem(userKey(siteId));
}
