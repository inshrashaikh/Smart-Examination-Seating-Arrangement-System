import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseDelimited } from '../../services';
import Button from './Button';
import { ProgressBar } from './Progress';
import cn from '../../utils/cn';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Drag-and-drop CSV/Excel uploader with client-side validation, row preview
 * and a progress bar. On accept it hands parsed rows to `onRows`.
 */
export default function Dropzone({ onRows, accept = '.csv,.tsv,.txt', rowsPreview = 6, disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setRows([]);
    setError('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (selected) => {
    if (!selected) return;
    setError('');
    if (selected.size > MAX_BYTES) {
      setError('File is larger than 5 MB. Split it into smaller batches.');
      return;
    }
    const name = selected.name.toLowerCase();
    const isText = /\.(csv|tsv|txt)$/.test(name);
    if (!isText) {
      setError('Demo mode parses CSV/TSV directly. Excel (.xlsx) files are handled by the backend upload endpoint.');
      return;
    }
    const text = await selected.text();
    const parsed = parseDelimited(text);
    if (!parsed.length) {
      setError('No data rows found. The first line must contain column headers.');
      return;
    }
    setFile(selected);
    setRows(parsed);
    onRows?.(parsed);
    setProgress(100);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Upload file"
      />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300',
            dragging
              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-500/10'
              : 'border-slate-300 bg-slate-50/60 hover:border-primary-400 hover:bg-primary-50/40 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-primary-500',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          <div
            className={cn(
              'absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary-400/20 blur-2xl transition-opacity duration-300',
              dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
            )}
          />
          <motion.span
            animate={dragging ? { y: -8, scale: 1.08 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow"
          >
            <UploadCloud className="h-7 w-7" />
          </motion.span>
          <p className="mt-5 text-sm font-bold text-ink dark:text-white">
            Drag & drop your register here
          </p>
          <p className="mt-1 text-xs text-muted">
            or <span className="font-semibold text-primary-600 dark:text-primary-300">browse files</span> · CSV / TSV up to 5 MB
          </p>
          <p className="mt-4 rounded-lg bg-white/80 px-3 py-1.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            rollNo, name, department, year, section, email
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink dark:text-white">{file.name}</p>
              <p className="text-xs text-muted">
                {(file.size / 1024).toFixed(1)} KB · {rows.length} data rows · {Object.keys(rows[0] ?? {}).length} columns
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Remove file"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ProgressBar value={progress} tone="emerald" className="mt-4" />

          <div className="mt-4 overflow-x-auto scrollbar-thin rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {Object.keys(rows[0] ?? {}).map((key) => (
                    <th key={key} className="whitespace-nowrap px-3 py-2 font-bold uppercase tracking-wide text-slate-500">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, rowsPreview).map((row, i) => (
                  <tr key={i}>
                    {Object.keys(rows[0]).map((key) => (
                      <td key={key} className="max-w-[160px] truncate px-3 py-1.5 text-slate-600 dark:text-slate-300">
                        {row[key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > rowsPreview ? (
            <p className="mt-2 text-[11px] text-muted">+ {rows.length - rowsPreview} more rows…</p>
          ) : null}

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Ready to import {rows.length} students.
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {!file ? (
        <Button variant="ghost" size="sm" className="mt-2" onClick={reset} disabled>
          Template: rollNo,name,department,year
        </Button>
      ) : null}
    </div>
  );
}

export { Dropzone };
