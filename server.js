
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Check for Database URL. If missing, we run in "Frontend-Only" mode.
const dbUrl = process.env.DATABASE_URL;
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

// PULL: Fetch all data from tables and reconstruct the profile JSON
app.get('/api/pull', checkDb, async (req, res) => {
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

// PUSH: Receive full profile and update relational tables
app.post('/api/push', checkDb, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const p = req.body;

    // Clear existing data (Simplest approach for sync)
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM debts');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM income');
    await client.query('DELETE FROM goals');
    await client.query('DELETE FROM cards');
    await client.query('DELETE FROM lent_money');
    await client.query('DELETE FROM profile_config');

    // Re-insert users
    for (const u of p.users) {
      await client.query('INSERT INTO users (id, name, role, avatar_color) VALUES ($1, $2, $3, $4)', [u.id, u.name, u.role, u.avatarColor]);
    }
    
    // Re-insert debts
    for (const d of p.debts) {
      await client.query('INSERT INTO debts (id, name, type, balance, interest_rate, minimum_payment, can_overpay, overpayment_penalty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [d.id, d.name, d.type, d.balance, d.interestRate, d.minimumPayment, d.canOverpay, d.overpaymentPenalty]);
    }

    // Save Config
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
