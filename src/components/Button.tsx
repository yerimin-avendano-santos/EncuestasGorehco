import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '../lib/format';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export function buttonClass(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  return classNames(
    'btn',
    `btn-${options?.variant ?? 'ghost'}`,
    options?.size && options.size !== 'md' ? `btn-${options.size}` : '',
    options?.fullWidth ? 'btn-full' : '',
    options?.className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
