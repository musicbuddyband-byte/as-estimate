export const instant = false;

import { Suspense } from "react";
import BoqClient from "./boq-client";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">กำลังโหลด...</p>
    </div>
  );
}

export default async function BoqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <BoqClient projectId={id} />
    </Suspense>
  );
}