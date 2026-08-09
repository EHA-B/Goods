import { Navigate, useParams } from "react-router-dom";
export default function StockMovementDetailsPage() {
  const { productId } = useParams();
  return <Navigate to={`/inventory/${productId}`} replace />;
}
