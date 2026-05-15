export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  currency: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type CoupleStatus = "pending" | "active" | "dissolved";

export type Couple = {
  id: string;
  owner_id: string;
  partner_id: string | null;
  status: CoupleStatus;
  invite_token: string | null;
  invite_email: string | null;
  created_at: string;
  updated_at: string;
  owner?: UserProfile;
  partner?: UserProfile;
};

export type AccountType = "checking" | "savings" | "investment" | "credit" | "cash" | "other";

export type Account = {
  id: string;
  user_id: string;
  couple_id: string | null;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryType = "income" | "expense" | "investment";

export type Category = {
  id: string;
  user_id: string | null;
  couple_id: string | null;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
};

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "completed" | "cancelled";
export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";

export type Transaction = {
  id: string;
  user_id: string;
  couple_id: string | null;
  account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  notes: string | null;
  date: string;
  is_shared: boolean;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;
  status: TransactionStatus;
  tags: string[];
  attachments: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category?: Category;
  account?: Account;
};

export type FutureTransaction = {
  id: string;
  user_id: string;
  couple_id: string | null;
  account_id: string | null;
  category_id: string | null;
  type: "income" | "expense";
  amount: number;
  description: string;
  scheduled_date: string;
  is_shared: boolean;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;
  status: "pending" | "processed" | "cancelled";
  processed_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
};

export type AssetClass = "fixed_income" | "variable_income" | "crypto" | "real_estate" | "other";

export type Investment = {
  id: string;
  user_id: string;
  couple_id: string | null;
  asset_class: AssetClass;
  subcategory: string;
  broker: string | null;
  asset_name: string;
  ticker: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  invested_amount: number;
  current_value: number;
  profitability: number | null;
  dividends_received: number;
  is_shared: boolean;
  is_active: boolean;
  purchase_date: string | null;
  maturity_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalCategory = "travel" | "car" | "house" | "emergency" | "retirement" | "education" | "other";
export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export type Goal = {
  id: string;
  user_id: string;
  couple_id: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  icon: string;
  is_shared: boolean;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

export type GoalContribution = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  notes: string | null;
  contributed_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  action_url: string | null;
  created_at: string;
};

export type DashboardStats = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  totalInvestments: number;
  projectedBalance: number;
  incomeChange: number;
  expenseChange: number;
};

export type ChartDataPoint = {
  name: string;
  value: number;
  color?: string;
};

export type CashFlowDataPoint = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export type FilterOptions = {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType | "";
  categoryId?: string;
  accountId?: string;
  status?: TransactionStatus | "";
  isShared?: boolean;
  search?: string;
};

export type PaginationOptions = {
  page: number;
  pageSize: number;
};

export type SortOptions = {
  field: string;
  direction: "asc" | "desc";
};
