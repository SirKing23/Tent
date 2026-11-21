export type CashbookEntryType = "cashIn" | "cashOut";

export type Cashbook = {
  id: string;
  title: string;
  description: string;
  initialCashIn: number;
  initialCashOut: number;
  date: string;
  autoCreateMonthly: boolean;
  createdAt: string;
};

export type CashbookEntry = {
  id: string;
  cashbookId: string;
  type: CashbookEntryType;
  amount: number;
  paymentMode: string;
  description: string;
  date: string;
  imageUri?: string;
  createdAt: string;
};
