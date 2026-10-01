// Phase 6 — 편집 페이지
// 현재는 플레이스홀더입니다. Phase 6에서 실제 편집 UI를 구현합니다.

export default async function EditPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-6">
      <h1 className="text-2xl font-semibold text-black">편집 페이지</h1>
      <p className="text-sm text-gray-500">
        사이트 ID: <span className="font-medium text-black">{siteId}</span>
      </p>
      <p className="text-sm text-gray-400">
        Phase 6 에서 편집 UI가 여기에 구현됩니다.
      </p>
    </main>
  );
}
