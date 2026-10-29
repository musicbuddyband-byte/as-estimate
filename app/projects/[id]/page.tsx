export const dynamic = "force-dynamic";
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

export default function ProjectPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProjectClient />
    </Suspense>
  );
}