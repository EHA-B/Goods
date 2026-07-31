import { Button, SearchInput, Select } from "../ui";
import EntityToolbar from "../ui/entity-toolbar/EntityToolbar";

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "available", label: "متوفر" },
  { value: "low", label: "مخزون منخفض" },
  { value: "out", label: "نافد" },
];

type Props = {
  searchQuery: string;
  statusFilter: string;
  filtersAreActive: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
};

export default function InventoryToolbar({
  searchQuery,
  statusFilter,
  filtersAreActive,
  onSearchChange,
  onStatusChange,
  onClearFilters,
}: Props) {
  return (
    <EntityToolbar
      search={
        <SearchInput
          value={searchQuery}
          placeholder="ابحث باسم المادة أو الكود أو المورد"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      }
      filters={
        <Select
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(event) => onStatusChange(event.target.value)}
        />
      }
      actions={
        filtersAreActive && (
          <Button variant="ghost" onClick={onClearFilters}>
            مسح التصفية
          </Button>
        )
      }
    />
  );
}
