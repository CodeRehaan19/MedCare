const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const path = require("path");

const app = express();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Add your Neon connection string in Render environment variables.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicines (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      quantity INTEGER NOT NULL,
      expiry_date DATE NOT NULL,
      supplier TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (
      id BIGSERIAL PRIMARY KEY,
      customer TEXT DEFAULT 'Walk-in Customer',
      total DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id BIGSERIAL PRIMARY KEY,
      sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      medicine_id BIGINT NOT NULL,
      medicine_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price DOUBLE PRECISION NOT NULL
    );
  `);

  const result = await pool.query("SELECT COUNT(*)::int AS n FROM medicines");
  if (result.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO medicines(name,category,batch_no,price,quantity,expiry_date,supplier)
       VALUES
       ('Paracetamol 500mg','Tablet','PCM2401',2.5,240,'2027-12-31','HealthCare Distributors'),
       ('Cetirizine 10mg','Tablet','CTZ2402',3,90,'2027-08-30','MediSupply'),
       ('Vitamin C 500mg','Supplement','VTC2403',5,65,'2027-06-30','Wellness Pharma'),
       ('ORS Sachet','First Aid','ORS2404',18,32,'2027-03-31','HealthCare Distributors'),
       ('Antiseptic Liquid 100ml','Personal Care','ANT2405',42,18,'2027-11-30','Care Plus')`
    );
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-medcare-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use(express.static(path.join(__dirname, "public")));

const auth = (req, res, next) =>
  req.session.loggedIn ? next() : res.status(401).json({ error: "Please log in" });

app.post("/api/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "MedCare@123") {
    req.session.loggedIn = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Incorrect username or password" });
});

app.post("/api/logout", (req, res) =>
  req.session.destroy(() => res.json({ ok: true }))
);

app.get("/api/me", (req, res) => res.json({ loggedIn: !!req.session.loggedIn }));

app.get("/api/dashboard", auth, async (req, res) => {
  try {
    const [medicines, low, expired, sales] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM medicines"),
      pool.query("SELECT COUNT(*)::int AS n FROM medicines WHERE quantity <= 20"),
      pool.query("SELECT COUNT(*)::int AS n FROM medicines WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days'"),
      pool.query("SELECT COALESCE(SUM(total),0)::double precision AS n FROM sales WHERE created_at::date = CURRENT_DATE")
    ]);
    res.json({
      medicines: medicines.rows[0].n,
      low: low.rows[0].n,
      expired: expired.rows[0].n,
      sales: Number(sales.rows[0].n)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load dashboard." });
  }
});

app.get("/api/medicines", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM medicines ORDER BY name");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load medicines." });
  }
});

app.post("/api/medicines", auth, async (req, res) => {
  try {
    const { name, category, batch_no, price, quantity, expiry_date, supplier = "" } = req.body;
    if (!name || !category || !batch_no || !expiry_date ||
        !Number.isFinite(Number(price)) || Number(price) < 0 ||
        !Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ error: "Please enter valid medicine details." });
    }
    const result = await pool.query(
      `INSERT INTO medicines(name,category,batch_no,price,quantity,expiry_date,supplier)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [name, category, batch_no, Number(price), Number(quantity), expiry_date, supplier]
    );
    res.json({ id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not save medicine." });
  }
});

app.put("/api/medicines/:id", auth, async (req, res) => {
  try {
    const { name, category, batch_no, price, quantity, expiry_date, supplier = "" } = req.body;
    await pool.query(
      `UPDATE medicines SET name=$1,category=$2,batch_no=$3,price=$4,quantity=$5,
       expiry_date=$6,supplier=$7 WHERE id=$8`,
      [name, category, batch_no, Number(price), Number(quantity), expiry_date, supplier, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update medicine." });
  }
});

app.delete("/api/medicines/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM medicines WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not delete medicine." });
  }
});

app.post("/api/sales", auth, async (req, res) => {
  const items = req.body.items || [];
  if (!items.length) return res.status(400).json({ error: "Add at least one item." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let total = 0;
    const selected = [];

    for (const item of items) {
      const result = await client.query(
        "SELECT * FROM medicines WHERE id=$1 FOR UPDATE",
        [Number(item.id)]
      );
      const medicine = result.rows[0];
      const qty = Number(item.quantity);
      if (!medicine || !Number.isInteger(qty) || qty < 1 || medicine.quantity < qty) {
        throw new Error("Insufficient stock or invalid quantity for an item.");
      }
      selected.push({ medicine, qty });
      total += Number(medicine.price) * qty;
    }

    const saleResult = await client.query(
      "INSERT INTO sales(customer,total) VALUES($1,$2) RETURNING id",
      [req.body.customer || "Walk-in Customer", total]
    );
    const saleId = saleResult.rows[0].id;

    for (const { medicine, qty } of selected) {
      await client.query(
        "UPDATE medicines SET quantity=quantity-$1 WHERE id=$2",
        [qty, medicine.id]
      );
      await client.query(
        `INSERT INTO sale_items(sale_id,medicine_id,medicine_name,quantity,price)
         VALUES($1,$2,$3,$4,$5)`,
        [saleId, medicine.id, medicine.name, qty, medicine.price]
      );
    }

    await client.query("COMMIT");
    res.json({ id: saleId, total });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.get("/api/sales", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sales ORDER BY id DESC LIMIT 100");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load sales." });
  }
});

app.get("/api/sales/:id", auth, async (req, res) => {
  try {
    const sale = await pool.query("SELECT * FROM sales WHERE id=$1", [req.params.id]);
    if (!sale.rows[0]) return res.status(404).json({ error: "Invoice not found" });
    const items = await pool.query("SELECT * FROM sale_items WHERE sale_id=$1", [req.params.id]);
    res.json({ sale: sale.rows[0], items: items.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load invoice." });
  }
});

const port = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => console.log(`MedCare running on ${port}`));
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
