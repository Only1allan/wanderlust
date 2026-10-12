import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'solid' | 'ghost' | 'quiet';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    'text-ink bg-[linear-gradient(110deg,#c7d2fe,#e9d5ff_45%,#a7f3d0)] shadow-[0_10px_40px_-10px_rgb(139_92_246/0.7)] hover:shadow-[0_14px_50px_-8px_rgb(139_92_246/0.9)]',
  solid: 'bg-[#e9e6ff] text-ink hover:bg-white focus-visible:outline-offset-4',
  ghost: 'glass text-white hover:bg-white/10',
  quiet: 'text-mist hover:text-white hover:bg-white/5',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={`relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium tracking-tight transition-[box-shadow,background-color,color] duration-300 disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
