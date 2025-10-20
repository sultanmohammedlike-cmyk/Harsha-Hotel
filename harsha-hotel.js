/*
 * Harsha Hotel - Full Stack Web App (Single File)
 * Frontend + Backend in one Node.js script
 * Author: ChatGPT GPT-5
 */

const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database("harsha.db");
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price REAL,
    rating REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    item_name TEXT,
    qty INTEGER,
    table_no TEXT,
    served INTEGER DEFAULT 0
  )`);
});

const uid = () => "i" + Math.random().toString(36).slice(2, 9);

// ===== API ROUTES =====

// Get menu
app.get("/api/menu", (req, res) => {
  db.all("SELECT * FROM menu", [], (err, rows) => res.json(rows));
});

// Add menu item
app.post("/api/menu", (req, res) => {
  const { name, description = "", price = 0, rating = 0 } = req.body;
  const id = uid();
  db.run(
    "INSERT INTO menu VALUES (?,?,?,?,?)",
    [id, name, description, price, rating],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ id });
    }
  );
});

// Place order
app.post("/api/orders", (req, res) => {
  const { item_id, table_no = "Takeaway", qty = 1 } = req.body;
  db.get("SELECT name FROM menu WHERE id=?", [item_id], (err, row) => {
    if (!row) return res.status(400).json({ error: "Invalid item" });
    const id = uid();
    db.run(
      "INSERT INTO orders (id,item_id,item_name,qty,table_no) VALUES (?,?,?,?,?)",
      [id, item_id, row.name, qty, table_no],
      (e) => {
        if (e) res.status(500).json(e);
        else res.json({ id });
      }
    );
  });
});

// Get all orders
app.get("/api/orders", (req, res) => {
  db.all("SELECT * FROM orders", [], (err, rows) => res.json(rows));
});

// Aggregated plates
app.get("/api/orders/aggregated", (req, res) => {
  db.all(
    "SELECT item_name, SUM(qty) AS plates FROM orders WHERE served=0 GROUP BY item_name",
    [],
    (err, rows) => res.json(rows)
  );
});

// ===== FRONTEND (HTML + CSS + JS) =====
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Harsha Hotel</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; }
  body { background: #f9f9f9; color: #333; }
  header { background: #b11f24; color: #fff; text-align: center; padding: 20px; }
  header h1 { margin-bottom: 5px; }
  nav { display: flex; justify-content: center; background: #fff; border-bottom: 1px solid #ddd; }
  nav button { border: none; background: none; padding: 12px 18px; font-weight: 600; cursor: pointer; }
  nav button.active { color: #b11f24; border-bottom: 3px solid #b11f24; }
  main { max-width: 900px; margin: auto; padding: 20px; }
  .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
  .card { background: #fff; border-radius: 10px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
  .card h3 { color: #b11f24; }
  .price { font-weight: bold; }
  .rating { color: gold; }
  .order-btn { margin-top: 10px; background: #b11f24; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; width: 100%; }
  section { display: none; }
  section.active { display: block; }
  .admin-panel { display: flex; flex-direction: column; gap: 20px; }
  input, textarea { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; }
  .order-table { width: 100%; border-collapse: collapse; }
  .order-table th, .order-table td { border: 1px solid #ddd; padding: 8px; }
  .order-table th { background: #b11f24; color: #fff; }
  footer { text-align: center; background: #222; color: #eee; padding: 15px; margin-top: 40px; }
  @media (max-width:600px){ header h1{font-size:1.3rem;} }
</style>
</head>
<body>
<header><h1>🍽️ Harsha Hotel</h1><p>Classic Taste, Served Right.</p></header>
<nav>
  <button id="menuBtn" class="active">Menu</button>
  <button id="topBtn">Top Rated</button>
  <button id="adminBtn">Admin</button>
</nav>
<main>
  <section id="menuSec" class="active">
    <h2>Menu</h2><div class="menu-grid" id="menuList"></div>
  </section>
  <section id="topSec"><h2>Top Rated</h2><div class="menu-grid" id="topList"></div></section>
  <section id="adminSec">
    <h2>Admin Panel</h2>
    <div class="admin-panel">
      <div>
        <h3>Add Menu Item</h3>
        <input id="iName" placeholder="Name">
        <textarea id="iDesc" placeholder="Description"></textarea>
        <input id="iPrice" placeholder="Price (₹)" type="number">
        <input id="iRating" placeholder="Rating (1-5)" type="number">
        <button onclick="addItem()">Add</button>
      </div>
      <div>
        <h3>Current Orders</h3>
        <table class="order-table"><thead><tr><th>Item</th><th>Qty</th><th>Table</th></tr></thead><tbody id="orders"></tbody></table>
      </div>
      <div>
        <h3>To Serve</h3>
        <table class="order-table"><thead><tr><th>Item</th><th>Plates</th></tr></thead><tbody id="plates"></tbody></table>
      </div>
    </div>
  </section>
</main>
<footer>© 2025 Harsha Hotel</footer>
<script>
  const API = "";
  const s = (id)=>document.getElementById(id);
  function show(x){["menu","top","admin"].forEach(n=>s(n+"Sec").classList.remove("active"));s(x+"Sec").classList.add("active");
    ["menu","top","admin"].forEach(n=>s(n+"Btn").classList.remove("active"));s(x+"Btn").classList.add("active");if(x==="admin")loadOrders();}
  s("menuBtn").onclick=()=>show("menu");
  s("topBtn").onclick=()=>show("top");
  s("adminBtn").onclick=()=>show("admin");
  async function loadMenu(){
    const r=await fetch("/api/menu");const d=await r.json();
    const l=s("menuList");l.innerHTML="";
    d.forEach(i=>{const c=document.createElement("div");c.className="card";
      c.innerHTML=\`<h3>\${i.name}</h3><p>\${i.description||""}</p><p class="price">₹\${i.price}</p><p class="rating">⭐\${i.rating}</p><button class="order-btn" onclick="order('\${i.id}','\${i.name}')">Order</button>\`;
      l.appendChild(c);
    });
    const t=d.filter(i=>i.rating>=4);
    const tl=s("topList");tl.innerHTML="";
    t.forEach(i=>{const c=document.createElement("div");c.className="card";c.innerHTML=\`<h3>\${i.name}</h3><p>\${i.description||""}</p><p class="price">₹\${i.price}</p><p class="rating">⭐\${i.rating}</p><button class="order-btn" onclick="order('\${i.id}','\${i.name}')">Order</button>\`;tl.appendChild(c);});
  }
  async function order(id,name){
    const table=prompt("Enter table number:");if(!table)return;
    await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({item_id:id,table_no:table})});
    alert("✅ Ordered "+name);
  }
  async function addItem(){
    const name=s("iName").value.trim();const desc=s("iDesc").value.trim();const price=parseFloat(s("iPrice").value);const rating=parseFloat(s("iRating").value);
    if(!name||!price)return alert("Fill name & price");
    await fetch("/api/menu",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description:desc,price,rating})});
    alert("Item added");loadMenu();
  }
  async function loadOrders(){
    const r=await fetch("/api/orders");const o=await r.json();
    s("orders").innerHTML=o.map(a=>\`<tr><td>\${a.item_name}</td><td>\${a.qty}</td><td>\${a.table_no}</td></tr>\`).join("");
    const p=await fetch("/api/orders/aggregated");const pl=await p.json();
    s("plates").innerHTML=pl.map(a=>\`<tr><td>\${a.item_name}</td><td>\${a.plates}</td></tr>\`).join("");
  }
  loadMenu();
</script>
</body>
</html>
`;

// Serve frontend
app.get("/", (req, res) => res.send(html));

// Run server
app.listen(PORT, () => console.log(`✅ Harsha Hotel running at http://localhost:${PORT}`));
