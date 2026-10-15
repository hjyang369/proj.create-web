import { Suspense } from "react";
import { CrepBoardWriteScreen } from "@/widgets/site-board";

export default function WritePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1200px] px-6 py-12">
          <p className="text-sm text-gray-500">글을 준비하는 중입니다.</p>
        </main>
      }
    >
      <CrepBoardWriteScreen />
    </Suspense>
  );
}
