export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerMovementType = "sale" | "purchase";

export type CustomerMovement = {
  id: number;
  customerId: number;
  type: CustomerMovementType;
  reference: string;
  date: string;
  total: number;
  paid: number;
  remaining: number;
  notes?: string;
};
