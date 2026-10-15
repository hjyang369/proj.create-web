import { SiteBoardDetailScreen } from "@/widgets/site-board";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; slug: string; postId: string }>;
}) {
  const { siteId, slug, postId } = await params;
  return (
    <SiteBoardDetailScreen siteId={siteId} slug={slug} postId={postId} />
  );
}
