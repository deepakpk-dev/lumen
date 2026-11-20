import Image from 'next/image';
import Link from 'next/link';

export function LumenMark({ className, alt = '' }: { className: string; alt?: string }) {
  return <Image src="/lumen-mark-96.webp" width={96} height={96} alt={alt} className={className} unoptimized />;
}

export function LumenBrand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="lumen-brand" aria-label="Lumen home">
      <LumenMark className="lumen-brand-icon" />
      <span>Lumen</span>
    </Link>
  );
}
