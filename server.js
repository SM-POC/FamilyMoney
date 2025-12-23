
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const esbuild = require('esbuild');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Environment Config
const dbUrl = process.env.DATABASE_URL;
const authKey = process.env.AUTH_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || "";
let pool = null;

if (dbUrl) {
  console.log('[MoneyMate] PostgreSQL database URL detected.');
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000 // Increased for Railway cold starts
  });

  const initDb = async () => {
    let client;
    try {
      console.log('[MoneyMate] Attempting database handshake...');
      client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT CHECK (role IN ('Admin', 'Member')),
          avatar_color TEXT,
          password TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profile_config (
          id TEXT PRIMARY KEY DEFAULT 'family_main',
          luxury_budget NUMERIC(15, 2) DEFAULT 0,
          savings_buffer NUMERIC(5, 2) DEFAULT 0,
          strategy TEXT CHECK (strategy IN ('Avalanche (Save Interest)', 'Snowball (Smallest First)'))
        );
        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          last4 VARCHAR(4) NOT NULL,
          owner TEXT,
          user_id TEXT REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance NUMERIC(15, 2) NOT NULL,
          interest_rate NUMERIC(5, 2) NOT NULL,
          minimum_payment NUMERIC(15, 2) NOT NULL,
          can_overpay BOOLEAN DEFAULT TRUE,
          overpayment_penalty NUMERIC(15, 2) DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          category TEXT,
          description TEXT,
          amount NUMERIC(15, 2) NOT NULL,
          is_recurring BOOLEAN DEFAULT FALSE,
          date DATE,
          merchant TEXT,
          receipt_id TEXT,
          card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
          card_last4 VARCHAR(4),
          is_subscription BOOLEAN DEFAULT FALSE,
          contract_end_date DATE,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS income (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          amount NUMERIC(15, 2) NOT NULL,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          target_amount NUMERIC(15, 2) NOT NULL,
          current_amount NUMERIC(15, 2) NOT NULL,
          target_date TEXT,
          category TEXT,
          monthly_contribution NUMERIC(15, 2)
        );
        CREATE TABLE IF NOT EXISTS lent_money (
          id TEXT PRIMARY KEY,
          recipient TEXT NOT NULL,
          purpose TEXT,
          total_amount NUMERIC(15, 2) NOT NULL,
          remaining_balance NUMERIC(15, 2) NOT NULL,
          default_repayment NUMERIC(15, 2) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS special_events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          month INTEGER CHECK (month >= 0 AND month <= 11),
          budget NUMERIC(15, 2) NOT NULL
        );
      `);
      const alterStatements = [
        "ALTER TABLE profile_config ALTER COLUMN id TYPE TEXT USING id::TEXT",
        "ALTER TABLE profile_config ALTER COLUMN id SET DEFAULT 'family_main'",
        "ALTER TABLE profile_config ALTER COLUMN luxury_budget SET DEFAULT 0",
        "ALTER TABLE profile_config ALTER COLUMN savings_buffer SET DEFAULT 0",
        "ALTER TABLE profile_config ADD COLUMN IF NOT EXISTS strategy TEXT",
        "ALTER TABLE profile_config ADD COLUMN IF NOT EXISTS savings_buffer NUMERIC(5, 2)",
        "ALTER TABLE profile_config ADD COLUMN IF NOT EXISTS luxury_budget NUMERIC(15, 2)",
        "ALTER TABLE profile_config ADD COLUMN IF NOT EXISTS id TEXT",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date DATE",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS merchant TEXT",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_id TEXT",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_id TEXT",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4)",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS contract_end_date DATE",
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE",
        "ALTER TABLE income ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE",
        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL",
        "ALTER TABLE goals ADD COLUMN IF NOT EXISTS category TEXT",
        "ALTER TABLE goals ADD COLUMN IF NOT EXISTS monthly_contribution NUMERIC(15, 2)"
      ];

      for (const stmt of alterStatements) {
        try {
          await client.query(stmt);
        } catch (err) {
          console.warn('[MoneyMate] Schema alignment skip:', err.message);
        }
      }
      console.log('[MoneyMate] Database Ready.');
    } catch (err) {
      console.error('[MoneyMate] Handshake Failed:', err.message);
    } finally {
      if (client) client.release();
    }
  };
  initDb();
}

const validateAuth = (req, res, next) => {
  if (!authKey) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${authKey}`) {
    console.warn('[MoneyMate] Blocked Unauthorized Request');
    return res.status(401).json({ error: 'Unauthorized Access Token Required' });
  }
  next();
};

const checkDb = (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Database not linked.' });
  next();
};

app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ status: 'warning', database: 'not_configured' });
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/pull', validateAuth, checkDb, async (req, res) => {
  try {
    const users = await pool.query('SELECT id, name, role, avatar_color, password FROM users');
    const debts = await pool.query('SELECT * FROM debts');
    const expenses = await pool.query('SELECT * FROM expenses');
    const income = await pool.query('SELECT * FROM income');
    const goals = await pool.query('SELECT * FROM goals');
    const cards = await pool.query('SELECT * FROM cards');
    const lent = await pool.query('SELECT * FROM lent_money');
    const events = await pool.query('SELECT * FROM special_events');
    const config = await pool.query('SELECT * FROM profile_config LIMIT 1');

    res.json({
      users: users.rows.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        avatarColor: u.avatar_color,
        password: u.password
      })),
      debts: debts.rows.map(d => ({ ...d, interestRate: parseFloat(d.interest_rate), minimumPayment: parseFloat(d.minimum_payment), balance: parseFloat(d.balance) })),
      expenses: expenses.rows.map(e => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: parseFloat(e.amount),
        isRecurring: e.is_recurring === null ? false : e.is_recurring,
        isSubscription: e.is_subscription === null ? false : e.is_subscription,
        date: e.date || '',
        merchant: e.merchant || null,
        receiptId: e.receipt_id || null,
        cardId: e.card_id || null,
        cardLast4: e.card_last4 || null,
        contractEndDate: e.contract_end_date || null,
        userId: e.user_id || null
      })),
      income: income.rows.map(i => ({ ...i, amount: parseFloat(i.amount), userId: i.user_id || null })),
      goals: goals.rows.map(g => ({ 
        ...g, 
        targetAmount: parseFloat(g.target_amount), 
        currentAmount: parseFloat(g.current_amount),
        monthlyContribution: g.monthly_contribution ? parseFloat(g.monthly_contribution) : null
      })),
      cards: cards.rows.map(c => ({ ...c, userId: c.user_id || null })),
      lentMoney: lent.rows.map(l => ({ ...l, totalAmount: parseFloat(l.total_amount), remainingBalance: parseFloat(l.remaining_balance), defaultRepayment: parseFloat(l.default_repayment) })),
      luxuryBudget: parseFloat(config.rows[0]?.luxury_budget || 0),
      savingsBuffer: parseFloat(config.rows[0]?.savings_buffer || 0),
      strategy: config.rows[0]?.strategy || 'Avalanche (Save Interest)',
      specialEvents: events.rows.map(ev => ({ ...ev, budget: ev.budget === null || ev.budget === undefined ? 0 : parseFloat(ev.budget) })),
      paymentLogs: []
    });
  } catch (err) {
    console.error('[MoneyMate] Pull Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push', validateAuth, checkDb, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const p = req.body;
    await client.query('DELETE FROM users; DELETE FROM debts; DELETE FROM expenses; DELETE FROM income; DELETE FROM goals; DELETE FROM cards; DELETE FROM lent_money; DELETE FROM special_events; DELETE FROM profile_config;');

    for (const u of (p.users || [])) await client.query('INSERT INTO users (id, name, role, avatar_color, password) VALUES ($1, $2, $3, $4, $5)', [u.id, u.name, u.role, u.avatarColor, u.password || null]);
    for (const d of (p.debts || [])) await client.query('INSERT INTO debts (id, name, type, balance, interest_rate, minimum_payment, can_overpay, overpayment_penalty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [d.id, d.name, d.type, d.balance, d.interestRate, d.minimumPayment, d.canOverpay, d.overpaymentPenalty]);
    for (const e of (p.expenses || [])) await client.query(
      'INSERT INTO expenses (id, category, description, amount, is_recurring, is_subscription, date, merchant, receipt_id, card_id, card_last4, contract_end_date, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [
        e.id,
        e.category,
        e.description,
        e.amount,
        e.isRecurring === undefined ? false : e.isRecurring,
        e.isSubscription === undefined ? false : e.isSubscription,
        e.date || null,
        e.merchant || null,
        e.receiptId || null,
        e.cardId || null,
        e.cardLast4 || null,
        e.contractEndDate || null,
        e.userId || null
      ]
    );
    for (const i of (p.income || [])) await client.query('INSERT INTO income (id, source, amount, user_id) VALUES ($1, $2, $3, $4)', [i.id, i.source, i.amount, i.userId || null]);
    for (const g of (p.goals || [])) await client.query('INSERT INTO goals (id, name, type, target_amount, current_amount, target_date, category, monthly_contribution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [g.id, g.name, g.type, g.targetAmount, g.currentAmount, g.targetDate || null, g.category || null, g.monthlyContribution || null]);
    for (const c of (p.cards || [])) await client.query('INSERT INTO cards (id, name, last4, owner, user_id) VALUES ($1, $2, $3, $4, $5)', [c.id, c.name, c.last4, c.owner || null, c.userId || null]);
    for (const l of (p.lentMoney || [])) await client.query('INSERT INTO lent_money (id, recipient, purpose, total_amount, remaining_balance, default_repayment) VALUES ($1, $2, $3, $4, $5, $6)', [l.id, l.recipient, l.purpose, l.totalAmount, l.remainingBalance, l.defaultRepayment]);
    for (const ev of (p.specialEvents || [])) await client.query('INSERT INTO special_events (id, name, month, budget) VALUES ($1, $2, $3, $4)', [ev.id, ev.name, ev.month, ev.budget]);
    await client.query('INSERT INTO profile_config (id, luxury_budget, savings_buffer, strategy) VALUES ($1, $2, $3, $4)', ['family_main', p.luxuryBudget || 0, p.savingsBuffer || 0, p.strategy || 'Avalanche (Save Interest)']);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get(/\.(tsx|ts)$/, async (req, res) => {
  const relPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
  const filePath = path.resolve(process.cwd(), relPath);

  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await esbuild.transform(code, {
      loader: filePath.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'es2020',
      define: {
        'process.env.API_KEY': JSON.stringify(openAiKey),
        'process.env.OPENAI_API_KEY': JSON.stringify(openAiKey),
        'process.env.AUTH_KEY': JSON.stringify(authKey),
        'process.env.NODE_ENV': '"production"'
      }
    });

    let transformedCode = result.code.replace(
      /from\s+['"](\.\.?\/[^'"]+)['"]/g,
      (match, p1) => {
        if (p1.match(/\.(tsx|ts|js|css)$/)) return match;
        const dir = path.dirname(filePath);
        if (fs.existsSync(path.resolve(dir, p1 + '.tsx'))) return `from "${p1}.tsx"`;
        if (fs.existsSync(path.resolve(dir, p1 + '.ts'))) return `from "${p1}.ts"`;
        return match;
      }
    );

    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.send(transformedCode);
  } catch (err) {
    res.status(500).send(`console.error("Transpilation failed: ${err.message}");`);
  }
});

app.use(express.static(process.cwd()));
app.get('*', (req, res) => res.sendFile(path.resolve(process.cwd(), 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MoneyMate] Listening on ${PORT}`);
});
