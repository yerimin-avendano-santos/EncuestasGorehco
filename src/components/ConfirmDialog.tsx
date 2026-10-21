import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      closeOnOverlay={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
        <div
          className="kpi-icon"
          style={{
            background: destructive ? 'var(--color-rose-mist)' : 'var(--color-mint-mist)',
            color: destructive ? 'var(--color-crimson-ink)' : 'var(--color-emerald-signal)',
          }}
        >
          <AlertTriangle size={18} />
        </div>
        <p className="body-sm graphite" style={{ paddingTop: 2 }}>
          {description}
        </p>
      </div>
    </Modal>
  );
}
