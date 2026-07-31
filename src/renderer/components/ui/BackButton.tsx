import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

type Props = {
  to?: string;
  label?: string;
};

export default function BackButton({ to, label = "رجوع" }: Props) {
  const navigate = useNavigate();
  return (
    <Button
      variant="secondary"
      startIcon={<ArrowRight size={17} />}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      {label}
    </Button>
  );
}
