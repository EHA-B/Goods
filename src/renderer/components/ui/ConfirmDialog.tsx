import Dialog from "./Dialog";
import Button from "./Button";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title = "تأكيد",
  message,
  loading,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            {cancelText}
          </Button>

          <Button
            variant="danger"
            isLoading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="leading-7 text-[var(--text-secondary)]">
        {message}
      </p>
    </Dialog>
  );
}