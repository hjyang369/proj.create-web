import { EditSiteScreen } from "@/widgets/edit-site";

export default async function EditPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  return <EditSiteScreen siteId={siteId} />;
}
