export const instant = false;

import { Suspense } from "react";
import ProjectClient from "./project-client";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">กำลังโหลดโปรเจกต์...</p>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <ProjectClient projectId={id} />
    </Suspense>
  );
}