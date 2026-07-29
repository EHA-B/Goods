export type TransactionDirection = "income" | "expense";
export type FinancialTransaction = {id:number;categoryId:number;categoryName:string;cashboxId:number;cashboxName:string;amount:number;direction:TransactionDirection;transactionDate:string;description:string;referenceNumber:string;notes:string};
