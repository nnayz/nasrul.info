import { cn } from '@/lib/className';
import { motion, type HTMLMotionProps } from 'framer-motion';

type PageInsetProps = HTMLMotionProps<'div'> & {
  wide?: boolean;
};

/** Shared reading-column spacing used by every content page. */
export default function PageInset({
  className,
  wide = false,
  ...props
}: PageInsetProps) {
  return (
    <motion.div
      className={cn(
        'page-inset w-full',
        wide ? 'max-w-6xl' : 'max-w-[720px]',
        className,
      )}
      initial={false}
      {...props}
    />
  );
}
