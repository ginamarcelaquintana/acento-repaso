import React, { Suspense } from 'react';
import { AcentoApp } from '@/components/AcentoApp';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] text-sm font-semibold text-[#64748B]">
          Cargando Acento...
        </div>
      }
    >
      <AcentoApp />
    </Suspense>
  );
}
