import { useEffect, useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { DEPARTMENTS, YEARS } from '../../data/departments';

const EMPTY = {
  name: '',
  rollNo: '',
  email: '',
  phone: '',
  department: 'CSE',
  year: 2,
  section: 'A',
  gender: 'Female',
  prn: '',
  notes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Create / edit student modal with animated validation errors. */
export default function StudentFormModal({ open, onClose, onSubmit, student, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const isEdit = Boolean(student);

  useEffect(() => {
    if (open) {
      setForm(student ? { ...EMPTY, ...student } : EMPTY);
      setErrors({});
      setTouched({});
    }
  }, [open, student]);

  const update = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) validate({ ...form, [field]: value });
  };

  const validate = (values) => {
    const next = {};
    if (!values.name?.trim()) next.name = 'Full name is required.';
    else if (values.name.trim().length < 3) next.name = 'Name looks too short.';
    if (!values.rollNo?.trim()) next.rollNo = 'Roll number is required.';
    else if (!/^[A-Za-z0-9]{4,14}$/.test(values.rollNo.trim()))
      next.rollNo = 'Use 4–14 letters or digits (no spaces).';
    if (values.email && !EMAIL_RE.test(values.email)) next.email = 'Enter a valid email address.';
    if (values.phone && !/^\+?[\d\s-]{8,16}$/.test(values.phone)) next.phone = 'Enter a valid phone number.';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form);
    setTouched({ name: true, rollNo: true, email: true, phone: true });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== '' && value !== undefined)
    );
    payload.year = Number(payload.year);
    await onSubmit?.(payload);
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={isEdit ? Save : UserPlus}
      title={isEdit ? `Edit ${student?.name}` : 'Add a new student'}
      description={
        isEdit
          ? 'Update the register entry. Changes apply to future allocations only.'
          : 'Add a single student to the examination register.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} leftIcon={Save}>
            {isEdit ? 'Save changes' : 'Add student'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            placeholder="Aarav Sharma"
            value={form.name}
            onChange={update('name')}
            onBlur={() => {
              setTouched((t) => ({ ...t, name: true }));
              setErrors(validate(form));
            }}
            error={errorFor('name')}
            required
          />
          <Input
            label="Roll number"
            placeholder="3CS012"
            value={form.rollNo}
            onChange={update('rollNo')}
            onBlur={() => {
              setTouched((t) => ({ ...t, rollNo: true }));
              setErrors(validate(form));
            }}
            error={errorFor('rollNo')}
            required
          />
          <Select
            label="Department"
            value={form.department}
            onChange={update('department')}
            options={DEPARTMENTS.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` }))}
            required
          />
          <Select
            label="Year"
            value={form.year}
            onChange={update('year')}
            options={YEARS.map((y) => ({ value: y.value, label: y.label }))}
            required
          />
          <Select
            label="Section"
            value={form.section}
            onChange={update('section')}
            options={['A', 'B', 'C'].map((s) => ({ value: s, label: `Section ${s}` }))}
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={update('gender')}
            options={['Female', 'Male', 'Other'].map((g) => ({ value: g, label: g }))}
          />
          <Input
            label="Email"
            type="email"
            placeholder="student@university.edu"
            value={form.email}
            onChange={update('email')}
            error={errorFor('email')}
          />
          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
            error={errorFor('phone')}
          />
          <Input
            label="PRN"
            placeholder="PRN22010042"
            value={form.prn}
            onChange={update('prn')}
            className="sm:col-span-2"
          />
        </div>

        <Textarea
          label="Remarks"
          placeholder="Optional note visible to the examination cell"
          rows={2}
          value={form.notes}
          onChange={update('notes')}
        />
      </form>
    </Modal>
  );
}

export { StudentFormModal };
