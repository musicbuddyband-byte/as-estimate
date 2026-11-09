export const instant = false;

import { Suspense } from "react";
import FootingClient from "./footing-client";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">กำลังโหลด...</p>
    </div>
  );
}

export default async function FootingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <FootingClient projectId={id} />
    </Suspense>
  );
}