import Image from 'next/image';
import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/bh-assurance-logo-cropped.png"
      alt="BH Assurance"
      width={1411}
      height={163}
      priority
      className={cn('block h-auto max-w-full object-contain', className)}
    />
  );
}
