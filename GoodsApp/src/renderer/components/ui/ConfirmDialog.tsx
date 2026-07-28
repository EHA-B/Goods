import Dialog from "./Dialog";
import Button from "./Button";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title = "تأكيد",
  message,
  loading,
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
            إلغاء
          </Button>

          <Button
            variant="danger"
            isLoading={loading}
            onClick={onConfirm}
          >
            تأكيد
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