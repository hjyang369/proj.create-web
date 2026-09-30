export type AppNavAction = {
  label: string;
  href?: string;
  kind?: "logout";
};

export function getAppNavActions(user: { name: string } | null): AppNavAction[] {
  if (!user) {
    return [{ href: "/login", label: "로그인" }];
  }

  return [
    { label: `${user.name}님` },
    { href: "/create", label: "사이트 만들기" },
    { kind: "logout", label: "로그아웃" },
  ];
}
