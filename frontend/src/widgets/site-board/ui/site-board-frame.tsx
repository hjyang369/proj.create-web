import type { ReactNode } from "react";
import Link from "next/link";

export function SiteBoardFrame({
  siteId,
  title,
  children,
}: {
  siteId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-12">
      <Link
        href={`/edit/${siteId}`}
        className="text-sm text-gray-500 hover:text-black"
      >
        ← 사이트로 돌아가기
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-black">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function BoardStatus({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}
