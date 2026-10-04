import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/** Reusable destructive-action confirmation. */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={AlertTriangle}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading || busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading || busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </Modal>
  );
}

export { ConfirmDialog };
