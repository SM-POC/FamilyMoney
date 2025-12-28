-- Core User Management
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    avatar_color TEXT,
    password TEXT NOT NULL
);

-- Global Family Settings (One row per family/profile)
CREATE TABLE profile_config (
    id TEXT PRIMARY KEY DEFAULT 'family_main',
    luxury_budget NUMERIC(15, 2) DEFAULT 0,
    savings_buffer NUMERIC(5, 2) DEFAULT 0,
    strategy TEXT,
    debt_plan JSONB,
    plan_progress JSONB
);

-- Financial Liability Tracking
CREATE TABLE debts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL,
    minimum_payment NUMERIC(15, 2) NOT NULL,
    can_overpay BOOLEAN DEFAULT TRUE,
    overpayment_penalty NUMERIC(15, 2) DEFAULT 0
);

-- Peer-to-Peer Lending
CREATE TABLE lent_money (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    purpose TEXT,
    total_amount NUMERIC(15, 2) NOT NULL,
    remaining_balance NUMERIC(15, 2) NOT NULL,
    default_repayment NUMERIC(15, 2) NOT NULL
);

-- Asset/Payment Method Management
CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    owner TEXT,
    user_id TEXT
);

-- Transaction & Obligation Tracking
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    category TEXT,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    date DATE,
    merchant TEXT,
    receipt_id TEXT,
    card_id TEXT,
    card_last4 VARCHAR(4),
    is_subscription BOOLEAN DEFAULT FALSE,
    contract_end_date DATE,
    user_id TEXT
);

-- Revenue Streams
CREATE TABLE income (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    user_id TEXT
);

-- Future Planning
CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) NOT NULL,
    target_date TEXT, -- Stored as YYYY-MM
    category TEXT,
    monthly_contribution NUMERIC(15, 2)
);

-- Budgeting for Occasions
CREATE TABLE special_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    month INTEGER,
    budget NUMERIC(15, 2) NOT NULL
);
