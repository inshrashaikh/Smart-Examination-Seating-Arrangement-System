/**
 * Tiny class-name joiner. Uses `clsx` under the hood so callers can pass
 * strings, arrays and conditional objects interchangeably.
 */
import clsx from 'clsx';

export default function cn(...inputs) {
  return clsx(inputs);
}

export { cn };
