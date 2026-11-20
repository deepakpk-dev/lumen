import Link from 'next/link';
import { LumenIcon } from './LumenIcon';

export function LumenBrand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="lumen-brand" aria-label="Lumen home">
      <span className="lumen-brand-icon"><LumenIcon name="flower" size={22} /></span>
      <span>Lumen</span>
    </Link>
  );
}
