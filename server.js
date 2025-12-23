
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const esbuild = require('esbuild');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Database & Auth Setup
const dbUrl = process.env.DATABASE_URL;
const authKey = process.env.AUTH_KEY;
const geminiKey = process.env.API_KEY || "";
let pool = null;

if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
}

/**
 * JIT Transpiler Middleware
 * Intercepts requests for .tsx, .ts, or extension-less files that exist as TSX/TS.
 */
app.get('*', async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) return next();
  
  // Determine physical file path
  let filePath = path.join(__dirname, req.path);
  
  // If the request doesn't have an extension, try to find a matching .tsx or .ts file
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.tsx')) filePath += '.tsx';
    else if (fs.existsSync(filePath + '.ts')) filePath += '.ts';
    else return next(); // Not a TS/TSX file, let express.static handle it
  }

  // Only handle .tsx and .ts files
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
    return next();
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await esbuild.transform(code, {
      loader: filePath.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'es2020',
      sourcemap: 'inline',
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.NODE_ENV': '"production"'
      }
    });

    res.setHeader('Content-Type', 'application/javascript');
    res.send(result.code);
  } catch (err) {
    console.error(`Transpilation Error at ${req.path}:`, err);
    res.status(500).send(`Error transpiling ${req.path}: ${err.message}`);
  }
});

// Auth & DB Middlewares
const validateAuth = (req, res, next) => {
  if (!authKey) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${authKey}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const checkDb = (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  next();
};

// API Endpoints
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
    const users = await pool.query('SELECT * FROM users');
    const debts = await pool.query('SELECT * FROM debts');
    const expenses = await pool.query('SELECT * FROM expenses');
    const income = await pool.query('SELECT * FROM income');
    const goals = await pool.query('SELECT * FROM goals');
    const cards = await pool.query('SELECT * FROM cards');
    const lent = await pool.query('SELECT * FROM lent_money');
    const config = await pool.query('SELECT * FROM profile_config LIMIT 1');

    res.json({
      users: users.rows,
      debts: debts.rows,
      expenses: expenses.rows,
      income: income.rows,
      goals: goals.rows,
      cards: cards.rows,
      lentMoney: lent.rows,
      luxuryBudget: config.rows[0]?.luxury_budget || 0,
      savingsBuffer: config.rows[0]?.savings_buffer || 0,
      strategy: config.rows[0]?.strategy || 'Avalanche (Save Interest)',
      paymentLogs: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push', validateAuth, checkDb, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const p = req.body;
    await client.query('DELETE FROM users; DELETE FROM debts; DELETE FROM expenses; DELETE FROM income; DELETE FROM goals; DELETE FROM cards; DELETE FROM lent_money; DELETE FROM profile_config;');

    for (const u of p.users) await client.query('INSERT INTO users (id, name, role, avatar_color) VALUES ($1, $2, $3, $4)', [u.id, u.name, u.role, u.avatarColor]);
    for (const d of p.debts) await client.query('INSERT INTO debts (id, name, type, balance, interest_rate, minimum_payment, can_overpay, overpayment_penalty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [d.id, d.name, d.type, d.balance, d.interestRate, d.minimumPayment, d.canOverpay, d.overpaymentPenalty]);
    for (const e of p.expenses) await client.query('INSERT INTO expenses (id, category, description, amount, is_recurring, is_subscription, contract_end_date) VALUES ($1, $2, $3, $4, $5, $6, $7)', [e.id, e.category, e.description, e.amount, e.isRecurring, e.isSubscription || false, e.contractEndDate || null]);
    for (const i of p.income) await client.query('INSERT INTO income (id, source, amount) VALUES ($1, $2, $3)', [i.id, i.source, i.amount]);
    for (const g of p.goals) await client.query('INSERT INTO goals (id, name, type, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5, $6)', [g.id, g.name, g.type, g.targetAmount, g.currentAmount, g.targetDate || null]);
    for (const c of p.cards) await client.query('INSERT INTO cards (id, name, last4, owner) VALUES ($1, $2, $3, $4)', [c.id, c.name, c.last4, c.owner || null]);
    for (const l of (p.lentMoney || [])) await client.query('INSERT INTO lent_money (id, recipient, purpose, total_amount, remaining_balance, default_repayment) VALUES ($1, $2, $3, $4, $5, $6)', [l.id, l.recipient, l.purpose, l.totalAmount, l.remainingBalance, l.defaultRepayment]);
    await client.query('INSERT INTO profile_config (luxury_budget, savings_buffer, strategy) VALUES ($1, $2, $3)', [p.luxuryBudget, p.savingsBuffer, p.strategy]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Static Assets & SPA Fallback
app.use(express.static(path.join(__dirname, '.')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
