import {
  Button,
  SearchInput,
  Select,
} from "../ui";
import EntityToolbar from "../ui/entity-toolbar/EntityToolbar";

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "available", label: "متوفر" },
  { value: "low", label: "كمية منخفضة" },
  { value: "out", label: "غير متوفر" },
];

type Props = {
  searchQuery: string;
  statusFilter: string;
  filtersAreActive: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
};

export default function ProductsToolbar({
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
          placeholder="ابحث بالاسم أو الكود أو التصنيف"
          onChange={(e) =>
            onSearchChange(e.target.value)
          }
        />
      }
      filters={
        <Select
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) =>
            onStatusChange(e.target.value)
          }
        />
      }
      actions={
        filtersAreActive && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
          >
            مسح التصفية
          </Button>
        )
      }
    />
  );
}