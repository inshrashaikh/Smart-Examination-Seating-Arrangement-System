import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select, Checkbox } from '../ui/Field';

const FACILITY_OPTIONS = ['Projector', 'Smart Board', 'Fans', 'Charging Points', 'Wi-Fi', 'Clock', 'Audio System'];

const EMPTY = {
  name: '',
  code: '',
  block: 'Academic Block A',
  floor: 1,
  rows: 5,
  cols: 6,
  type: 'AC',
  board: 'Whiteboard',
  facilities: ['Projector'],
  blockedSeats: [],
};

/** Add / edit hall modal. Capacity is derived from rows × columns. */
export default function HallFormModal({ open, onClose, onSubmit, hall, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const isEdit = Boolean(hall);

  useEffect(() => {
    if (open) {
      setForm(hall ? { ...EMPTY, ...hall } : EMPTY);
      setErrors({});
      setTouched({});
    }
  }, [open, hall]);

  const capacity = Math.max(0, Number(form.rows) * Number(form.cols));

  const update = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) validate({ ...form, [field]: value });
  };

  const validate = (values) => {
    const next = {};
    if (!values.name?.trim()) next.name = 'Hall name is required.';
    if (!values.code?.trim()) next.code = 'Hall code is required (e.g. A-101).';
    else if (values.code.trim().length < 3) next.code = 'Use at least 3 characters.';
    const rows = Number(values.rows);
    const cols = Number(values.cols);
    if (!rows || rows < 1) next.rows = 'Minimum 1 row.';
    else if (rows > 14) next.rows = 'Maximum 14 rows per hall.';
    if (!cols || cols < 1) next.cols = 'Minimum 1 column.';
    else if (cols > 14) next.cols = 'Maximum 14 columns per hall.';
    if ((values.blockedSeats?.length ?? 0) >= rows * cols) {
      next.rows = 'Cannot block every seat in the hall.';
    }
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form);
    setTouched({ name: true, code: true, rows: true, cols: true });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const payload = {
      ...form,
      rows: Number(form.rows),
      cols: Number(form.cols),
      floor: Number(form.floor),
      capacity,
    };
    await onSubmit?.(payload);
  };

  const toggleFacility = (facility) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Building2}
      title={isEdit ? `Edit ${hall?.name}` : 'Add an examination hall'}
      description={
        isEdit
          ? 'Capacity is recalculated from rows × columns.'
          : 'Define the seating geometry used by the allocation engine.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Add hall'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Hall name"
            placeholder="Hall A-101"
            value={form.name}
            onChange={update('name')}
            error={errorFor('name')}
            required
          />
          <Input
            label="Hall code"
            placeholder="A-101"
            value={form.code}
            onChange={update('code')}
            error={errorFor('code')}
            required
          />
          <Input label="Block" placeholder="Academic Block A" value={form.block} onChange={update('block')} />
          <Input
            label="Floor"
            type="number"
            min={0}
            max={12}
            value={form.floor}
            onChange={update('floor')}
          />
          <Input
            label="Rows"
            type="number"
            min={1}
            max={14}
            value={form.rows}
            onChange={update('rows')}
            error={errorFor('rows')}
            required
          />
          <Input
            label="Columns"
            type="number"
            min={1}
            max={14}
            value={form.cols}
            onChange={update('cols')}
            error={errorFor('cols')}
            required
          />
          <Select
            label="Hall type"
            value={form.type}
            onChange={update('type')}
            options={[
              { value: 'AC', label: 'Air conditioned' },
              { value: 'NON_AC', label: 'Non air conditioned' },
              { value: 'SEMINAR', label: 'Seminar hall' },
            ]}
          />
          <Select
            label="Board / display"
            value={form.board}
            onChange={update('board')}
            options={[
              'Whiteboard',
              'Smart Board',
              'Interactive Panel',
              'Large Display',
              'Chalkboard',
            ].map((b) => ({ value: b, label: b }))}
          />
        </div>

        <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-3.5 dark:border-primary-500/30 dark:bg-primary-500/10">
          <p className="text-[12px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
            Computed capacity
          </p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-primary-700 dark:text-primary-300">
            {capacity} <span className="text-sm font-semibold">seats</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {form.rows} rows × {form.cols} columns
            {(form.blockedSeats?.length ?? 0) > 0 ? ` · ${form.blockedSeats.length} blocked seat(s)` : ''}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Facilities</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FACILITY_OPTIONS.map((facility) => (
              <Checkbox
                key={facility}
                label={facility}
                checked={form.facilities.includes(facility)}
                onChange={() => toggleFacility(facility)}
              />
            ))}
          </div>
        </div>

        {(hall?.blockedSeats?.length ?? 0) > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Blocked seats
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {hall.blockedSeats.map((seat) => (
                <li key={`${seat.row}-${seat.col}`} className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] dark:bg-slate-900">
                  R{seat.row + 1}C{seat.col + 1}
                  <span className="ml-1 font-sans text-slate-400">· {seat.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export { HallFormModal };
