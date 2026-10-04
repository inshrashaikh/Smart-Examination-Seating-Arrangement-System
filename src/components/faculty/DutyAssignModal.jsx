import { useEffect, useMemo, useState } from 'react';
import {
  UserPlus, CalendarDays, Building2, ShieldCheck, Info, CheckCircle2,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select, Input } from '../ui/Field';
import { DeptBadge } from '../ui/Badge';
import { formatDate, formatTimeRange } from '../../utils/format';

const ROLES = [
  { value: 'INVIGILATOR', label: 'Invigilator' },
  { value: 'CHIEF_INVIGILATOR', label: 'Chief Invigilator' },
  { value: 'EXTERNAL_SUPERVISOR', label: 'External Supervisor' },
];

/**
 * Assign an invigilation duty. Times default to the exam's window so the
 * officer only has to pick person, exam, hall and date.
 */
export default function DutyAssignModal({
  open,
  onClose,
  onSubmit,
  faculty = [],
  exams = [],
  halls = [],
  existingDuties = [],
  saving = false,
}) {
  const [form, setForm] = useState({
    facultyId: '',
    examId: '',
    hallId: '',
    date: '',
    role: 'INVIGILATOR',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const firstExam = exams.find((e) => e.status !== 'COMPLETED') ?? exams[0];
    setForm({
      facultyId: faculty[0]?.id ?? '',
      examId: firstExam?.id ?? '',
      hallId: firstExam?.hallIds?.[0] ?? halls[0]?.id ?? '',
      date: firstExam?.date ?? '',
      role: 'INVIGILATOR',
    });
    setErrors({});
  }, [open, exams, halls, faculty]);

  const exam = exams.find((e) => e.id === form.examId);

  const clash = useMemo(
    () =>
      existingDuties.find(
        (d) =>
          d.facultyId === form.facultyId &&
          d.examId === form.examId &&
          d.hallId === form.hallId &&
          d.date === form.date
      ) ?? null,
    [existingDuties, form.facultyId, form.examId, form.hallId, form.date]
  );

  const sameDayLoad = useMemo(
    () =>
      existingDuties.filter((d) => d.facultyId === form.facultyId && d.date === form.date).length,
    [existingDuties, form.facultyId, form.date]
  );

  const person = faculty.find((f) => f.id === form.facultyId);

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Keep hall + date in sync with the chosen exam.
      if (key === 'examId') {
        const chosen = exams.find((e) => e.id === value);
        next.hallId = chosen?.hallIds?.[0] ?? prev.hallId;
        next.date = chosen?.date ?? prev.date;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.facultyId) next.facultyId = 'Choose a faculty member.';
    if (!form.examId) next.examId = 'Choose an exam.';
    if (!form.hallId) next.hallId = 'Choose a hall.';
    if (!form.date) next.date = 'Pick the duty date.';
    else if (exam && form.date !== exam.date)
      next.date = `This exam is scheduled on ${formatDate(exam.date)}.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({
      facultyId: form.facultyId,
      examId: form.examId,
      hallId: form.hallId,
      date: form.date,
      startTime: exam?.startTime ?? '10:00',
      endTime: exam?.endTime ?? '13:00',
      role: form.role,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserPlus}
      title="Assign invigilation duty"
      description="The duty appears immediately in the faculty member's portal."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button leftIcon={CheckCircle2} loading={saving} onClick={submit}>
            Assign duty
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Faculty member"
            required
            value={form.facultyId}
            onChange={set('facultyId')}
            error={errors.facultyId}
            options={faculty.map((f) => ({ value: f.id, label: `${f.name} — ${f.department}` }))}
          />
          <Select
            label="Role"
            required
            value={form.role}
            onChange={set('role')}
            options={ROLES}
          />
        </div>

        {person ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[12px] dark:bg-slate-800/50">
            <DeptBadge code={person.department} size="sm" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">{person.designation}</span>
            <span className="text-muted">{person.employeeId}</span>
            <PreferenceChip tone={person.dutyPreference} />
            <span className="ml-auto text-muted">
              {sameDayLoad} / {person.maxDutiesPerDay} duties on this day
            </span>
          </div>
        ) : null}

        <Select
          label="Exam"
          required
          value={form.examId}
          onChange={set('examId')}
          error={errors.examId}
          options={exams.map((e) => ({
            value: e.id,
            label: `${e.code} · ${e.title} · ${formatDate(e.date)}`,
          }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Hall"
            required
            value={form.hallId}
            onChange={set('hallId')}
            error={errors.hallId}
            options={halls.map((h) => ({ value: h.id, label: `${h.name} (${h.capacity} seats)` }))}
          />
          <Input
            label="Duty date"
            type="date"
            required
            value={form.date}
            onChange={set('date')}
            error={errors.date}
          />
        </div>

        {exam ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-primary-200 bg-primary-50/60 p-3.5 text-[12.5px] text-primary-800 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              {formatDate(exam.date, 'long')} · {formatTimeRange(exam.startTime, exam.endTime)} ·{' '}
              <Building2 className="mr-1 inline h-3.5 w-3.5" />
              {halls.find((h) => h.id === form.hallId)?.name ?? 'hall'}
              {exam.status === 'COMPLETED' ? (
                <span className="ml-1 font-bold">· This exam is already completed.</span>
              ) : null}
            </p>
          </div>
        ) : null}

        {clash ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {person?.name} already has a duty in {clash.hallName} for this exam. Choose another hall or person.
            </span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function PreferenceChip({ tone }) {
  const styles = {
    MORNING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    EVENING: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
    ANY: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[tone] ?? styles.ANY}`}>
      Prefers {String(tone ?? 'ANY').toLowerCase()}
    </span>
  );
}

export { DutyAssignModal };
