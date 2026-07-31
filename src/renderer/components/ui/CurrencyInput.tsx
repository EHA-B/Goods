import NumberInput from "./NumberInput";
import type { NumberInputProps } from "./NumberInput";

export default function CurrencyInput(
  props: NumberInputProps,
) {
  return (
    <NumberInput
      suffix="ل.س"
      step={100}
      min={0}
      {...props}
    />
  );
}