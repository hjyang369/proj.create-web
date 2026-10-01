"use client";

import { usePathname } from "next/navigation";
import { showsAppNav } from "../model/app-nav-actions";
import { AppNav } from "./app-nav";

export function AppNavSlot() {
  const pathname = usePathname();

  if (!showsAppNav(pathname)) {
    return null;
  }

  return <AppNav />;
}
