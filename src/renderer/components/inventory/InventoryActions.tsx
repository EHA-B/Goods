import { Eye, SlidersHorizontal } from "lucide-react";

import { Button, RowActions } from "../ui";
import type { InventoryItem } from "./types";

type Props = {
  item: InventoryItem;
  onViewDetails: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
};

export default function InventoryActions({
  item,
  onViewDetails,
  onAdjust,
}: Props) {
  return (
    <RowActions>
      <Button
        size="sm"
        variant="secondary"
        startIcon={<Eye size={15} />}
        onClick={() => onViewDetails(item)}
      >
        استعراض
      </Button>

      <Button
        size="sm"
        variant="ghost"
        startIcon={<SlidersHorizontal size={15} />}
        onClick={() => onAdjust(item)}
      >
        تسوية
      </Button>
    </RowActions>
  );
}
