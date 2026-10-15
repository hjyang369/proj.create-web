import { redirect } from "next/navigation";
import { boardWritePath } from "@/entities/board";

export default async function BoardWritePage({
  params,
}: {
  params: Promise<{ siteId: string; slug: string }>;
}) {
  const { siteId, slug } = await params;
  redirect(boardWritePath(siteId, slug));
}
