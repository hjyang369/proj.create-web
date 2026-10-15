import { SiteBoardListScreen } from "@/widgets/site-board";

export default async function BoardListPage({
  params,
}: {
  params: Promise<{ siteId: string; slug: string }>;
}) {
  const { siteId, slug } = await params;
  return <SiteBoardListScreen siteId={siteId} slug={slug} />;
}
