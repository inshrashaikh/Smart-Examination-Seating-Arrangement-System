import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Copy, Check, Navigation } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getDepartment } from '../../data/departments';
import { useToast } from '../../context/ToastContext';
import { Tooltip } from '../ui/Tooltip';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useState } from 'react';

/**
 * Seat finder result with a QR code.
 *
 * The QR encodes a deep link back to this exact seat
 * (`/admin/hall-plan?seat=A3&exam=EX-001&hall=H-1`), so an invigilator standing
 * in the hall can scan the code on a printed plan and land on the same seat
 * in the browser — the page reads the query parameter and highlights it.
 *
 * The code is generated in the browser by `react-qr-code`; nothing leaves the
 * machine.
 */
export default function SeatFinderCard({ plan, seat, onLocate }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const dept = getDepartment(seat.department);

  const deepLink = useMemo(() => {
    const base = `${window.location.origin}/admin/hall-plan`;
    const params = new URLSearchParams({ seat: seat.label, exam: plan.examId, hall: plan.hallId });
    return `${base}?${params.toString()}`;
  }, [plan, seat]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      toast.success('Seat link copied to clipboard.');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy the link — the address bar has it.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-primary-200 dark:border-primary-500/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
            <Navigation className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seat found</p>
            <p className="truncate text-[15px] font-extrabold text-ink dark:text-white">
              {seat.name} <span className="font-mono text-[12px] font-bold text-muted">· {seat.rollNo}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: dept.color }}
              >
                {seat.department}
              </span>
              <span>Year {seat.year} · Sec {seat.section}</span>
              <span className="font-mono font-bold text-ink dark:text-white">Seat {seat.label}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <QRCode value={deepLink} size={72} fgColor="#0F172A" bgColor="transparent" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Tooltip content="Copy seat link" side="left">
                <Button variant="secondary" size="iconSm" onClick={copyLink} aria-label="Copy seat link">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </Tooltip>
              <Tooltip content="Highlight on the grid" side="left">
                <Button variant="secondary" size="iconSm" onClick={() => onLocate?.(seat)} aria-label="Highlight seat on the grid">
                  <QrCode className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-muted dark:border-slate-800">
          <QrCode className="h-3.5 w-3.5 shrink-0 text-primary-500" />
          Scan the code to open this seat on any device — handy printed at the hall entrance.
        </p>
      </Card>
    </motion.div>
  );
}

export { SeatFinderCard };
