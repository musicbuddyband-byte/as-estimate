export const instant = false;

import { Suspense } from "react";
import PedestalClient from "./pedestal-client";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">กำลังโหลด...</p>
    </div>
  );
}

export default async function PedestalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <PedestalClient projectId={id} />
    </Suspense>
  );
}