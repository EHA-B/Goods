import { Badge } from "../ui";
export default function TransactionTypeBadge({type}:{type:"income"|"expense"}){return <Badge variant={type==="income"?"success":"danger"}>{type==="income"?"إيراد":"مصروف"}</Badge>}
