import { Button, SearchInput, Select } from "../ui";
import EntityToolbar from "../ui/entity-toolbar/EntityToolbar";

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "payable", label: "له رصيد" },
  { value: "advance", label: "عليه رصيد" },
];

type Props = {
  searchQuery: string;
  statusFilter: string;
  filtersAreActive: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
};

export default function SuppliersToolbar(props: Props) {
  return (
    <EntityToolbar
      search={<SearchInput value={props.searchQuery} placeholder="ابحث بالاسم أو الهاتف أو البريد أو العنوان" onChange={(event) => props.onSearchChange(event.target.value)} />}
      filters={<Select value={props.statusFilter} options={STATUS_OPTIONS} onChange={(event) => props.onStatusChange(event.target.value)} />}
      actions={props.filtersAreActive && <Button variant="ghost" onClick={props.onClearFilters}>مسح التصفية</Button>}
    />
  );
}
