
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
 * Automatically converts TSX/TS to JS and fixes ESM import paths.
 */
app.get(/\.(tsx|ts)$|^\/[^.]+$/, async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) return next();

  let filePath = path.join(__dirname, req.path);

  // If no extension, resolve to .tsx or .ts
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.tsx')) filePath += '.tsx';
    else if (fs.existsSync(filePath + '.ts')) filePath += '.ts';
    else return next();
  }

  // Final check if file exists
  if (!fs.existsSync(filePath)) return next();

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await esbuild.transform(code, {
      loader: filePath.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'es2020',
      sourcemap: 'inline',
      // This injects the API key directly into the code
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.NODE_ENV': '"production"'
      }
    });

    // CRITICAL: Rewrite imports to include extensions for browser ESM resolution
    // Changes: import { X } from './View' -> import { X } from './View.tsx'
    const transformedCode = result.code.replace(
      /from\s+['"](\.\.?\/[^'"]+)(?<!\.(tsx|ts|js|css))['"]/g,
      (match, p1) => {
        const potentialTsx = path.join(path.dirname(filePath), p1 + '.tsx');
        const potentialTs = path.join(path.dirname(filePath), p1 + '.ts');
        if (fs.existsSync(potentialTsx)) return `from "${p1}.tsx"`;
        if (fs.existsSync(potentialTs)) return `from "${p1}.ts"`;
        return match;
      }
    );

    res.setHeader('Content-Type', 'application/javascript');
    res.send(transformedCode);
  } catch (err) {
    console.error(`Transpilation Error [${req.path}]:`, err);
    // Send back a self-alerting script so the user sees the error in the browser
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`console.error("Transpilation failed: ${err.message.replace(/"/g, '\\"')}"); 
              alert("Code Error: Check console for ${req.path}");`);
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
    // Clean slate for the sync (careful: this replaces local data with device data)
    await client.query('DELETE FROM users; DELETE FROM debts; DELETE FROM expenses; DELETE FROM income; DELETE FROM goals; DELETE FROM cards; DELETE FROM lent_money; DELETE FROM profile_config;');

    for (const u of (p.users || [])) await client.query('INSERT INTO users (id, name, role, avatar_color) VALUES ($1, $2, $3, $4)', [u.id, u.name, u.role, u.avatarColor]);
    for (const d of (p.debts || [])) await client.query('INSERT INTO debts (id, name, type, balance, interest_rate, minimum_payment, can_overpay, overpayment_penalty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [d.id, d.name, d.type, d.balance, d.interestRate, d.minimumPayment, d.canOverpay, d.overpaymentPenalty]);
    for (const e of (p.expenses || [])) await client.query('INSERT INTO expenses (id, category, description, amount, is_recurring, is_subscription, contract_end_date) VALUES ($1, $2, $3, $4, $5, $6, $7)', [e.id, e.category, e.description, e.amount, e.isRecurring, e.isSubscription || false, e.contractEndDate || null]);
    for (const i of (p.income || [])) await client.query('INSERT INTO income (id, source, amount) VALUES ($1, $2, $3)', [i.id, i.source, i.amount]);
    for (const g of (p.goals || [])) await client.query('INSERT INTO goals (id, name, type, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5, $6)', [g.id, g.name, g.type, g.targetAmount, g.currentAmount, g.targetDate || null]);
    for (const c of (p.cards || [])) await client.query('INSERT INTO cards (id, name, last4, owner) VALUES ($1, $2, $3, $4)', [c.id, c.name, c.last4, c.owner || null]);
    for (const l of (p.lentMoney || [])) await client.query('INSERT INTO lent_money (id, recipient, purpose, total_amount, remaining_balance, default_repayment) VALUES ($1, $2, $3, $4, $5, $6)', [l.id, l.recipient, l.purpose, l.totalAmount, l.remainingBalance, l.defaultRepayment]);
    await client.query('INSERT INTO profile_config (luxury_budget, savings_buffer, strategy) VALUES ($1, $2, $3)', [p.luxuryBudget || 0, p.savingsBuffer || 0, p.strategy || 'Avalanche (Save Interest)']);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Static Assets & Single Page Application Fallback
app.use(express.static(path.join(__dirname, '.')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on PORT ${PORT}`));
