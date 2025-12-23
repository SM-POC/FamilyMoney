
export enum DebtType {
  CREDIT_CARD = 'Credit Card',
  FINANCE = 'Finance',
  BANK_LOAN = 'Bank Loan',
  MORTGAGE = 'Mortgage',
  OTHER = 'Other'
}

export enum StrategyType {
  AVALANCHE = 'Avalanche (Save Interest)',
  SNOWBALL = 'Snowball (Smallest First)'
}

export enum GoalType {
  SAVINGS = 'Savings',
  DEBT_FREEDOM = 'Debt Freedom',
  LIFESTYLE = 'Lifestyle',
  EMERGENCY = 'Emergency Fund'
}

export interface FamilyUser {
  id: string;
  name: string;
  role: 'Admin' | 'Member';
  avatarColor: string;
  password?: string;
}

export interface SyncConfig {
  endpoint: string;
  apiKey?: string;
  lastSynced?: string;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  category: string;
  monthlyContribution?: number;
}

export interface Card {
  id: string;
  name: string;
  last4: string;
  owner?: string;
  userId?: string;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  canOverpay: boolean;
  overpaymentPenalty?: number;
}

export interface LentMoney {
  id: string;
  recipient: string;
  purpose: string;
  totalAmount: number;
  remainingBalance: number;
  defaultRepayment: number;
}

export interface Expense {
  id: string;
  category: string;
  description: string; 
  amount: number;
  isRecurring: boolean;
  date: string;
  merchant?: string;
  receiptId?: string;
  cardId?: string;
  cardLast4?: string;
  isSubscription?: boolean; 
  contractEndDate?: string;
  userId?: string; 
}

export interface SpecialEvent {
  id: string;
  name: string;
  month: number;
  budget: number;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  userId?: string;
}

export interface PayoffMonth {
  monthIndex: number;
  monthName: string;
  startingBalance: number;
  totalPayment: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
  debtBreakdown: {
    debtId: string;
    debtName: string;
    payment: number;
    interest: number;
    remaining: number;
    penalty: number;
    isNewlyCleared: boolean;
  }[];
  lentBreakdown: {
    lentId: string;
    recipient: string;
    received: number;
    remaining: number;
    isNewlyCleared: boolean;
  }[];
  savingsGoal: number;
  eventsBudgetUsed: number;
  luxuryBudgetUsed: number;
  totalInterestSaved: number;
}

export interface UserFinancialProfile {
  users: FamilyUser[];
  currentUserId?: string;
  debts: Debt[];
  lentMoney: LentMoney[];
  expenses: Expense[];
  income: Income[];
  specialEvents: SpecialEvent[];
  goals: Goal[];
  cards: Card[];
  paymentLogs: any[];
  luxuryBudget: number;
  savingsBuffer: number;
  strategy: StrategyType;
  syncConfig?: SyncConfig;
}

export interface ReceiptReviewItem {
  id: string;
  description: string;
  amount: number;
  category: string;
}

export interface ReceiptReviewState {
  merchant: string;
  date: string;
  paymentMethod: string;
  cardLast4: string;
  selectedCardId?: string;
  items: ReceiptReviewItem[];
}
