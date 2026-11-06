import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong shadow-sm disabled:bg-line disabled:text-muted',
  secondary: 'bg-surface text-ink border border-line hover:border-ink/30 disabled:text-muted',
  ghost: 'text-muted hover:text-ink hover:bg-sunken',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', block = false) =>
  [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'disabled:cursor-not-allowed select-none touch-manipulation',
    variants[variant],
    sizes[size],
    block ? 'w-full' : '',
  ].join(' ');

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block = false, className = '', type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={`${buttonClass(variant, size, block)} ${className}`} {...props} />;
});

export default Button;
