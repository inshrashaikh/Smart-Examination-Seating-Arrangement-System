import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { DEPARTMENTS, YEARS } from '../../data/departments';
import { getDepartment } from '../../data/departments';
import cn from '../../utils/cn';

const EMPTY = {
  code: '',
  title: '',
  subject: '',
  course: 'B.Tech',
  date: new Date().toISOString().slice(0, 10),
  startTime: '10:00',
  endTime: '13:00',
  departments: ['CSE'],
  years: [3, 4],
  minYear: 3,
  hallIds: [],
};

/** Create / edit exam modal — subject, date, time, departments and halls. */
export default function ExamFormModal({ open, onClose, onSubmit, exam, halls = [], students = [], saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const isEdit = Boolean(exam);

  useEffect(() => {
    if (open) {
      setForm(exam ? { ...EMPTY, ...exam } : { ...EMPTY, date: new Date().toISOString().slice(0, 10) });
      setErrors({});
      setTouched({});
    }
  }, [open, exam]);

  const update = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) validate({ ...form, [field]: value });
  };

  const validate = (values) => {
    const next = {};
    if (!values.code?.trim()) next.code = 'Exam code is required (e.g. CS601).';
    else if (values.code.trim().length < 3) next.code = 'Use at least 3 characters.';
    if (!values.title?.trim()) next.title = 'Exam title is required.';
    if (!values.date) next.date = 'Choose the exam date.';
    if (!values.startTime) next.startTime = 'Start time is required.';
    if (!values.endTime) next.endTime = 'End time is required.';
    else if (values.startTime && values.endTime <= values.startTime)
      next.endTime = 'End time must be after the start time.';
    if (!values.departments?.length) next.departments = 'Select at least one department.';
    if (!values.years?.length) next.years = 'Select at least one year.';
    return next;
  };

  const eligibleStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          form.departments.includes(s.department) &&
          form.years.includes(Number(s.year)) &&
          Number(s.year) >= Number(form.minYear)
      ).length,
    [students, form.departments, form.years, form.minYear]
  );

  const selectedCapacity = useMemo(
    () => halls.filter((h) => form.hallIds.includes(h.id)).reduce((sum, h) => sum + h.capacity, 0),
    [halls, form.hallIds]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form);
    setTouched({
      code: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      departments: true,
      years: true,
    });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    await onSubmit?.({
      ...form,
      durationHours:
        form.startTime && form.endTime
          ? Math.max(
              1,
              Math.round(
                ((Number(form.endTime.split(':')[0]) * 60 + Number(form.endTime.split(':')[1])) -
                  (Number(form.startTime.split(':')[0]) * 60 + Number(form.startTime.split(':')[1]))) /
                  60
              )
            )
          : 3,
    });
  };

  const toggleList = (field, value) =>
    setForm((prev) => {
      const list = prev[field];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [field]: next };
    });

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CalendarPlus}
      size="lg"
      title={isEdit ? `Edit ${exam?.title}` : 'Schedule a new exam'}
      description="Define the session, the eligible cohort and the halls reserved for it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} leftIcon={Save}>
            {isEdit ? 'Save changes' : 'Schedule exam'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Exam code"
            placeholder="CS601"
            value={form.code}
            onChange={update('code')}
            error={errorFor('code')}
            required
          />
          <Input
            label="Exam title"
            placeholder="Operating Systems"
            value={form.title}
            onChange={update('title')}
            error={errorFor('title')}
            required
          />
          <Input
            label="Subject"
            placeholder="Operating Systems"
            value={form.subject}
            onChange={update('subject')}
            className="sm:col-span-2"
          />
          <Input label="Course" placeholder="B.Tech CSE" value={form.course} onChange={update('course')} />
          <Input label="Date" type="date" value={form.date} onChange={update('date')} error={errorFor('date')} required />
          <Input
            label="Start time"
            type="time"
            value={form.startTime}
            onChange={update('startTime')}
            error={errorFor('startTime')}
            required
          />
          <Input
            label="End time"
            type="time"
            value={form.endTime}
            onChange={update('endTime')}
            error={errorFor('endTime')}
            required
          />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Departments <span className="text-rose-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => {
              const isActive = form.departments.includes(dept.code);
              return (
                <button
                  key={dept.code}
                  type="button"
                  onClick={() => toggleList('departments', dept.code)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-bold transition',
                    isActive
                      ? 'border-transparent text-white shadow-soft'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
                  )}
                  style={isActive ? { background: dept.color } : undefined}
                >
                  <span
                    className={cn('h-2 w-2 rounded-full', isActive ? 'bg-white/80' : 'bg-current')}
                    style={!isActive ? { color: dept.color } : undefined}
                  />
                  {dept.code}
                </button>
              );
            })}
          </div>
          {errorFor('departments') ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.departments}</p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Eligible years <span className="text-rose-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((year) => {
              const isActive = form.years.includes(year.value);
              return (
                <button
                  key={year.value}
                  type="button"
                  onClick={() => toggleList('years', year.value)}
                  className={cn(
                    'rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition',
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-500/15 dark:text-primary-300'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
                  )}
                >
                  {year.label}
                </button>
              );
            })}
          </div>
          {errorFor('years') ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.years}</p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Reserve halls <span className="text-muted font-normal">(optional — can be chosen in the wizard)</span>
            </p>
            <span className="text-[11px] font-semibold text-muted">
              {selectedCapacity} seats selected
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {halls.map((hall) => {
              const isActive = form.hallIds.includes(hall.id);
              return (
                <button
                  key={hall.id}
                  type="button"
                  onClick={() => toggleList('hallIds', hall.id)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition',
                    isActive
                      ? 'border-accent-400 bg-accent-50 dark:border-accent-500 dark:bg-accent-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink dark:text-white">
                      {hall.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {hall.rows} × {hall.cols} · {hall.capacity} seats
                    </span>
                  </span>
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[10px] font-bold',
                      isActive
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isActive ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* eligibility summary */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-500/30 dark:bg-primary-500/10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Eligible students
            </p>
            <p className="font-display text-2xl font-extrabold text-primary-700 dark:text-primary-300">
              {eligibleStudents}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Selected capacity
            </p>
            <p className="font-display text-2xl font-extrabold text-primary-700 dark:text-primary-300">
              {selectedCapacity}
            </p>
          </div>
          <p className="col-span-2 text-[11px] font-medium text-primary-700/80 dark:text-primary-300/80">
            {selectedCapacity >= eligibleStudents
              ? 'Capacity is sufficient for every eligible student.'
              : `Add ${Math.max(0, eligibleStudents - selectedCapacity)} more seat(s) or leave some halls for the next session.`}
          </p>
        </div>
      </form>
    </Modal>
  );
}

export { getDepartment };

export { ExamFormModal };
