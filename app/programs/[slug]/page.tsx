import { PROGRAMS } from '@/src/content/programs';
import { ProgramDetail } from '@/src/components/ProgramDetail';

// Programs are a static in-bundle list, so prerender every slug. This makes
// the route static, which lets <Link> fully prefetch it — without this, dynamic
// routes skip prefetching and every tap waits on a server round trip.
export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <ProgramDetail slug={(await params).slug} />;
}
