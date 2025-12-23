
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Check for Database URL.
const dbUrl = process.env.DATABASE_URL;
const authKey = process.env.AUTH_KEY; // The secret password you set in Railway
let pool = null;

if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  console.log("Database connection initialized.");
} else {
  console.warn("WARNING: DATABASE_URL is missing. Cloud Sync features will be unavailable.");
}

// Middleware to check Auth Key
const validateAuth = (req, res, next) => {
  // If no AUTH_KEY is set in environment, we allow requests (convenience for initial setup)
  if (!authKey) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${authKey}`) {
    return res.status(401).json({ error: 'Unauthorized', details: 'Invalid or missing API Security Token.' });
  }
  next();
};

// Middleware to check DB availability
const checkDb = (req, res, next) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Database not configured', 
      details: 'This server instance is not linked to a PostgreSQL database.' 
    });
  }
  next();
};

// Health check for frontend
app.get('/api/health', async (req, res) => {
  if (!pool) {
    return res.json({ status: 'warning', database: 'not_configured', message: 'Running without persistent storage.' });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PULL: Fetch all data
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

    const profile = {
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
    };

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUSH: Save all data
app.post('/api/push', validateAuth, checkDb, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const p = req.body;

    await client.query('DELETE FROM users');
    await client.query('DELETE FROM debts');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM income');
    await client.query('DELETE FROM goals');
    await client.query('DELETE FROM cards');
    await client.query('DELETE FROM lent_money');
    await client.query('DELETE FROM profile_config');

    for (const u of p.users) {
      await client.query('INSERT INTO users (id, name, role, avatar_color) VALUES ($1, $2, $3, $4)', [u.id, u.name, u.role, u.avatarColor]);
    }
    
    for (const d of p.debts) {
      await client.query('INSERT INTO debts (id, name, type, balance, interest_rate, minimum_payment, can_overpay, overpayment_penalty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [d.id, d.name, d.type, d.balance, d.interestRate, d.minimumPayment, d.canOverpay, d.overpaymentPenalty]);
    }

    for (const e of p.expenses) {
      await client.query('INSERT INTO expenses (id, category, description, amount, is_recurring, is_subscription, contract_end_date) VALUES ($1, $2, $3, $4, $5, $6, $7)', [e.id, e.category, e.description, e.amount, e.isRecurring, e.isSubscription || false, e.contractEndDate || null]);
    }

    for (const i of p.income) {
      await client.query('INSERT INTO income (id, source, amount) VALUES ($1, $2, $3)', [i.id, i.source, i.amount]);
    }

    for (const g of p.goals) {
      await client.query('INSERT INTO goals (id, name, type, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5, $6)', [g.id, g.name, g.type, g.targetAmount, g.currentAmount, g.targetDate || null]);
    }

    for (const c of p.cards) {
      await client.query('INSERT INTO cards (id, name, last4, owner) VALUES ($1, $2, $3, $4)', [c.id, c.name, c.last4, c.owner || null]);
    }

    for (const l of (p.lentMoney || [])) {
      await client.query('INSERT INTO lent_money (id, recipient, purpose, total_amount, remaining_balance, default_repayment) VALUES ($1, $2, $3, $4, $5, $6)', [l.id, l.recipient, l.purpose, l.totalAmount, l.remainingBalance, l.defaultRepayment]);
    }

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

// Serve static frontend
app.use(express.static(path.join(__dirname, '.')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
