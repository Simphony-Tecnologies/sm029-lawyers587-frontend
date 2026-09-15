import { Suspense } from 'react';
import LeadManagement from './LeadManagement';

// L587-10 — LeadManagement usa useSearchParams (?status=), que en App Router
// exige un límite de Suspense en el árbol de render.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LeadManagement />
    </Suspense>
  );
}
