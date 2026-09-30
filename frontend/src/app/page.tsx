import { HomeSessionActions, SessionGreeting } from "@/features/auth";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold text-gray-900">CREP AI</h1>
      <SessionGreeting />
      <HomeSessionActions />
    </main>
  );
}
