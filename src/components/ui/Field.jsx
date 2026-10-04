import { forwardRef, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import cn from '../../utils/cn';

const baseControl =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-ink transition placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50';

const controlTone = (error, disabled) =>
  cn(
    error
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/15 dark:border-rose-500/50'
      : 'border-slate-200 focus:border-primary-400 focus:ring-primary-500/15 dark:border-slate-700',
    disabled && 'cursor-not-allowed opacity-70'
  );

/** Label + control + animated hint/error. */
export function FormField({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200"
        >
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </label>
      ) : null}

      {children}

      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 overflow-hidden pt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pt-1.5 text-xs text-muted"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, hint, error, required, icon: Icon, className, containerClassName, rightSlot, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FormField
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={containerClassName}
    >
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            baseControl,
            controlTone(error, props.disabled),
            'h-11',
            Icon && 'pl-10',
            rightSlot && 'pr-11',
            className
          )}
          {...props}
        />
        {rightSlot ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}
      </div>
    </FormField>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label, hint, error, required, id, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FormField label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={cn(baseControl, controlTone(error, props.disabled), 'h-11 pr-11')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, rows = 3, id, className, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FormField label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn(baseControl, controlTone(error, props.disabled), 'py-2.5 leading-relaxed', className)}
        {...props}
      />
    </FormField>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required, options = [], placeholder, id, className, children, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FormField label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            baseControl,
            controlTone(error, props.disabled),
            'h-11 cursor-pointer appearance-none pr-10',
            className
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option
              key={option.value ?? option}
              value={option.value ?? option}
              disabled={option.disabled}
            >
              {option.label ?? option}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </FormField>
  );
});

export const Checkbox = forwardRef(function Checkbox(
  { label, description, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={inputId}
        className={cn(
          'group flex cursor-pointer items-start gap-3 select-none',
          props.disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white transition checked:border-primary-600 checked:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-600 dark:bg-slate-800"
            {...props}
          />
          <Check className="pointer-events-none absolute h-3.5 w-3.5 scale-0 text-white transition-transform duration-200 peer-checked:scale-100" strokeWidth={3} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-muted">{description}</span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p className="flex items-center gap-1.5 pt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
});

export function Switch({ label, description, checked, onChange, disabled, className, id }) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={switchId} className="min-w-0 cursor-pointer select-none">
        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-dark',
          checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

/** Card-style radio option used in the seating wizard. */
export function RadioCard({ name, value, checked, onChange, title, description, icon: Icon, disabled }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all',
        checked
          ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-primary-500/40',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="sr-only"
      />
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition',
          checked ? 'border-primary-600' : 'border-slate-300 dark:border-slate-600'
        )}
      >
        {checked ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-2.5 w-2.5 rounded-full bg-primary-600"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
          {Icon ? <Icon className="h-4 w-4 text-primary-600 dark:text-primary-300" /> : null}
          {title}
        </span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export default Input;