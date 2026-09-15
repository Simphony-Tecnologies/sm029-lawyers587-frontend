import { Suspense } from 'react';
import AllLeads from './AllLeads';

// L587-01 — AllLeads usa useSearchParams (?status=), que en App Router exige un
// límite de Suspense en el árbol de render.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllLeads />
    </Suspense>
  );
}
