import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, RotateCcw,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ProgressBar } from '../ui/Progress';
import { useToast } from '../../context/ToastContext';
import { studentService, USE_MOCKS } from '../../services';

/** Server-side media types, mirrored for the accept attribute. */
const ACCEPT = '.csv,.tsv,.txt,.xlsx,.xls';
const STEPS = ['Select file', 'Upload', 'Result'];

/**
 * Bulk register upload.
 *
 * The file goes to `POST /api/students/upload` as multipart form data. The
 * backend does the parsing (OpenCSV for CSV/TSV, Apache POI for XLSX) and
 * answers with
 *
 *   { total, added, duplicates, invalid, fileName,
 *     errors: [{ row, rollNo, field, message }] }
 *
 * Invalid rows are *reported*, not silently dropped, so the result modal lists
 * them with their source row number. Progress comes from axios's
 * `onUploadProgress`, which is a real byte count rather than a fake timer —
 * the server-side parse happens after the upload completes, so the bar parks
 * at 99% until the response lands.
 */
export default function BulkUploadModal({
  open,
  onClose,
  onImport,
  onImportRows,
  onDone,
}) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (open) return;
    setFile(null);
    setRows([]);
    setStep(0);
    setProgress(0);
    setResult(null);
    setFailure(null);
    setBusy(false);
  }, [open]);

  /* --------------------------- client pre-check -------------------------- */
  const localIssues = useMemo(() => {
    if (!rows.length) return [];
    const seen = new Set();
    const issues = [];
    rows.forEach((row, index) => {
      const rollNo = String(row.rollNo ?? row['roll no'] ?? row.ROLLNO ?? '').trim();
      if (!rollNo) issues.push({ row: index + 2, message: 'Missing roll number' });
      else if (seen.has(rollNo)) {
        issues.push({ row: index + 2, message: `Duplicate roll number ${rollNo}` });
      } else seen.add(rollNo);
    });
    return issues;
  }, [rows]);

  /* ------------------------------ uploading ------------------------------ */
  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setFailure(null);
    setStep(1);
    setProgress(0);

    try {
      let response;
      if (USE_MOCKS) {
        // Demo mode: no multipart — ingest the parsed rows instead.
        response = await onImportRows?.(rows);
        setProgress(100);
      } else {
        response = await onImport(file, setProgress);
      }

      setProgress(100);
      setResult({
        total: response?.total ?? rows.length,
        added: response?.added ?? 0,
        duplicates: response?.duplicates ?? 0,
        invalid: response?.invalid ?? 0,
        fileName: response?.fileName ?? file.name,
        errors: response?.errors ?? [],
      });
      setStep(2);

      const added = response?.added ?? 0;
      if (added > 0) toast.success(`${added} students imported from ${file.name}.`);
      else toast.warning('No new students were added — every row was a duplicate or invalid.');

      onDone?.();
    } catch (error) {
      setStep(2);
      setFailure({
        message: error?.message ?? 'The upload failed.',
        detail: error?.errors ? Object.values(error.errors).flat().join(' ') : null,
      });
      toast.error(error?.message ?? 'The upload failed.');
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- helpers ------------------------------- */
  const pickFile = async (picked) => {
    if (!picked) return;
    setResult(null);
    setFailure(null);
    setProgress(0);
    setStep(0);
    setFile(picked);

    // The client parse is only a preview — the server is the authority. It is
    // skipped entirely for binaries, which the browser cannot read as text.
    if (/\.(csv|tsv|txt)$/i.test(picked.name)) {
      try {
        const text = await picked.text();
        const { parseDelimited } = await import('../../services');
        setRows(parseDelimited(text));
      } catch {
        setRows([]);
      }
    } else {
      setRows([]);
    }
  };

  const downloadTemplate = async () => {
    try {
      if (USE_MOCKS) {
        const csv = [
          'rollNo,name,department,year,section,email',
          '3CS011,Aarav Sharma,CSE,3,A,3cs011@university.edu',
          '2EC104,Ishita Nair,ECE,2,B,2ec104@university.edu',
        ].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'student-register-template.csv';
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        // Streams the authoritative template from the backend.
        await studentService.downloadTemplate();
      }
    } catch (error) {
      toast.error(error?.message ?? 'Could not download the template.');
    }
  };

  const canUpload = Boolean(file) && !busy;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UploadCloud}
      size="lg"
      title="Bulk upload students"
      description="Import the full register from a CSV or Excel export."
      footer={
        result || failure ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={busy} disabled={!canUpload} leftIcon={UploadCloud}>
              {busy ? 'Uploading…' : `Upload ${file?.name ? `“${file.name}”` : 'file'}`}
            </Button>
          </>
        )
      }
    >
      {/* stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, index) => {
          const isActive = index === step;
          const isDone = index < step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold transition-colors ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`text-[12px] font-semibold ${isActive ? 'text-ink dark:text-white' : 'text-muted'}`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {/* ------------------------- result ------------------------- */}
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div
              className={`rounded-2xl border p-6 text-center ${
                result.added > 0
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
              }`}
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className={`mx-auto grid h-16 w-16 place-items-center rounded-3xl text-white shadow-glow ${
                  result.added > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              >
                {result.added > 0 ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <AlertTriangle className="h-8 w-8" />
              )}
              </motion.div>
              <h3
                className={`mt-4 text-lg font-extrabold ${
                  result.added > 0
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                {result.added > 0 ? 'Import complete' : 'Nothing was imported'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                <span className="font-bold">{result.fileName}</span> · {result.total} rows read
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <SummaryTile label="Rows" value={result.total} tone="slate" />
              <SummaryTile label="Added" value={result.added} tone="emerald" />
              <SummaryTile
                label="Duplicates"
                value={result.duplicates}
                tone={result.duplicates ? 'amber' : 'slate'}
              />
              <SummaryTile
                label="Invalid"
                value={result.invalid}
                tone={result.invalid ? 'rose' : 'slate'}
              />
            </div>

            {result.errors?.length ? (
              <ErrorTable errors={result.errors} />
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              leftIcon={RotateCcw}
              onClick={() => {
                setResult(null);
                setFailure(null);
                setFile(null);
                setRows([]);
                setStep(0);
                setProgress(0);
              }}
            >
              Upload another file
            </Button>
          </motion.div>
        ) : failure ? (
          /* ------------------------- failure ------------------------- */
          <motion.div
            key="failure"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-500 text-white shadow-glow">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-rose-800 dark:text-rose-200">
                Upload failed
              </h3>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{failure.message}</p>
              {failure.detail ? (
                <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">{failure.detail}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[12px] text-muted dark:border-slate-700 dark:bg-slate-800/40">
              <p className="font-bold text-ink dark:text-white">What the server accepts</p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                <li>
                  <code className="font-mono">.csv</code> / <code className="font-mono">.tsv</code> — UTF-8,
                  with or without a BOM
                </li>
                <li>
                  <code className="font-mono">.xlsx</code> — a real OOXML workbook, header row required
                </li>
                <li>
                  Columns: <code className="font-mono">rollNo, name, department, year, section, email, phone, gender, prn</code>
                </li>
                <li>
                  <code className="font-mono">department</code> must be CSE, IT, ECE, MECH or CIVIL;{' '}
                  <code className="font-mono">year</code> must be 1–5
                </li>
              </ul>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setFailure(null)}>
              Back
            </Button>
          </motion.div>
        ) : (
          /* ------------------------- picker ------------------------- */
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className="group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-primary-400 hover:bg-primary-50/40 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-primary-500/50"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow transition-transform group-hover:scale-110">
                <UploadCloud className="h-6 w-6" />
              </span>
              {file ? (
                <>
                  <span className="text-sm font-bold text-ink dark:text-white">{file.name}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {(file.size / 1024).toFixed(1)} KB
                    {rows.length ? ` · ${rows.length} data rows detected` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-ink dark:text-white">
                    Drop a CSV or Excel file here
                  </span>
                  <span className="text-[12px] text-muted">
                    or click to browse — {ACCEPT}
                  </span>
                </>
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-muted">
                <FileSpreadsheet className="h-4 w-4 text-accent-500" />
                Need the right column layout?
              </span>
              <Button variant="ghost" size="xs" leftIcon={Download} onClick={downloadTemplate}>
                Download template
              </Button>
            </div>

            {rows.length ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <SummaryTile label="Rows found" value={rows.length} tone="primary" />
                  <SummaryTile
                    label="Local issues"
                    value={localIssues.length}
                    tone={localIssues.length ? 'amber' : 'emerald'}
                  />
                  <SummaryTile
                    label="Headers"
                    value={Object.keys(rows[0] ?? {}).length}
                    tone="slate"
                  />
                </div>

                {/* Column preview so a mis-mapped header is obvious before upload. */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin dark:border-slate-700">
                  <table className="min-w-full text-left text-[11.5px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        {Object.keys(rows[0] ?? {}).map((key) => (
                          <th
                            key={key}
                            className="whitespace-nowrap px-3 py-2 font-bold text-muted"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          {Object.keys(rows[0] ?? {}).map((key) => (
                            <td
                              key={key}
                              className="max-w-[180px] truncate whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-300"
                            >
                              {String(row[key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {localIssues.length ? (
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3 scrollbar-thin dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" /> {localIssues.length} issue(s) spotted
                      locally — the server will report the authoritative list
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {localIssues.slice(0, 8).map((issue, i) => (
                        <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300/90">
                          Row {issue.row}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <ProgressBar
              value={progress}
              tone={progress === 100 ? 'emerald' : 'primary'}
              label={
                busy
                  ? progress >= 99
                    ? 'Parsing on the server…'
                    : `Uploading… ${progress}%`
                  : result
                    ? 'Done'
                    : file
                      ? 'Ready to upload'
                      : 'No file selected'
              }
              showLabel
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

/** Row-level validation errors exactly as the backend reported them. */
function ErrorTable({ errors }) {
  return (
    <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-rose-500/30">
      <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-3.5 py-2.5 dark:border-rose-500/30 dark:bg-rose-500/10">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
        <p className="text-[12px] font-bold text-rose-800 dark:text-rose-200">
          {errors.length} row{errors.length === 1 ? '' : 's'} rejected — these were not imported
        </p>
      </div>
      <div className="max-h-56 overflow-y-auto scrollbar-thin">
        <table className="min-w-full text-left text-[11.5px]">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2 font-bold">Row</th>
              <th className="px-3 py-2 font-bold">Roll No</th>
              <th className="px-3 py-2 font-bold">Field</th>
              <th className="px-3 py-2 font-bold">Problem</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => (
              <tr
                key={`${err.row}-${i}`}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="whitespace-nowrap px-3 py-1.5 font-mono font-bold text-slate-500">
                  {err.row}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                  {err.rollNo || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{err.field || '—'}</td>
                <td className="px-3 py-1.5 text-rose-700 dark:text-rose-300">{err.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone = 'primary' }) {
  const tones = {
    primary: 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10',
    slate: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 text-center ${tones[tone]}`}>
      <p className="font-display text-xl font-extrabold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p>
    </div>
  );
}

export { BulkUploadModal };
