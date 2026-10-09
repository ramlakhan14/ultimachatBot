import { ObjectId } from 'mongodb';

export const WALLET_TRANSACTION_COLLECTION = 'wallet_transactions';

// wallet-transaction.schema.ts
export interface WalletTransaction {
  orderId: string;
  userId: ObjectId;
  amount: number;
  currency: string;
  plan: string;
  addedCredits: number;
  bonusPercentage: number;
  provider: 'lemonsqueezy';
  type: 'topup';
  createdAt: Date;
}
