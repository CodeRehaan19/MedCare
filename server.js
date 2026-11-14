const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(process.env.DB_FILE || path.join(__dirname, "medcare.db"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS medicines (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
 batch_no TEXT NOT NULL, price REAL NOT NULL, quantity INTEGER NOT NULL,
 expiry_date TEXT NOT NULL, supplier TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT DEFAULT 'Walk-in Customer',
 total REAL NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sale_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, medicine_id INTEGER NOT NULL,
 medicine_name TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL
);
`);
const count = db.prepare("SELECT COUNT(*) n FROM medicines").get().n;
if (!count) {
  const add = db.prepare("INSERT INTO medicines(name,category,batch_no,price,quantity,expiry_date,supplier) VALUES(?,?,?,?,?,?,?)");
  [
    ["Paracetamol 500mg","Tablet","PCM2401",2.5,240,"2027-12-31","HealthCare Distributors"],
    ["Cetirizine 10mg","Tablet","CTZ2402",3,90,"2027-08-30","MediSupply"],
    ["Vitamin C 500mg","Supplement","VTC2403",5,65,"2027-06-30","Wellness Pharma"],
    ["ORS Sachet","First Aid","ORS2404",18,32,"2027-03-31","HealthCare Distributors"],
    ["Antiseptic Liquid 100ml","Personal Care","ANT2405",42,18,"2027-11-30","Care Plus"]
  ].forEach(x => add.run(...x));
}
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET || "change-this-medcare-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use(express.static(path.join(__dirname,"public")));
const auth=(req,res,next)=>req.session.loggedIn?next():res.status(401).json({error:"Please log in"});
app.post("/api/login",(req,res)=>{
  if(req.body.username==="admin" && req.body.password==="MedCare@123"){req.session.loggedIn=true;return res.json({ok:true});}
  res.status(401).json({error:"Incorrect username or password"});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({loggedIn:!!req.session.loggedIn}));
app.get("/api/dashboard",auth,(req,res)=>{
 const medicines=db.prepare("SELECT COUNT(*) n FROM medicines").get().n;
 const low=db.prepare("SELECT COUNT(*) n FROM medicines WHERE quantity<=20").get().n;
 const expired=db.prepare("SELECT COUNT(*) n FROM medicines WHERE expiry_date<=date('now','+90 days')").get().n;
 const sales=db.prepare("SELECT COALESCE(SUM(total),0) n FROM sales WHERE date(created_at)=date('now')").get().n;
 res.json({medicines,low,expired,sales});
});
app.get("/api/medicines",auth,(req,res)=>res.json(db.prepare("SELECT * FROM medicines ORDER BY name").all()));
app.post("/api/medicines",auth,(req,res)=>{
 const {name,category,batch_no,price,quantity,expiry_date,supplier=""}=req.body;
 if(!name||!category||!batch_no||!expiry_date||Number(price)<0||!Number.isInteger(Number(quantity))||Number(quantity)<0)return res.status(400).json({error:"Please enter valid medicine details."});
 const info=db.prepare("INSERT INTO medicines(name,category,batch_no,price,quantity,expiry_date,supplier) VALUES(?,?,?,?,?,?,?)").run(name,category,batch_no,Number(price),Number(quantity),expiry_date,supplier);
 res.json({id:info.lastInsertRowid});
});
app.put("/api/medicines/:id",auth,(req,res)=>{
 const {name,category,batch_no,price,quantity,expiry_date,supplier=""}=req.body;
 db.prepare("UPDATE medicines SET name=?,category=?,batch_no=?,price=?,quantity=?,expiry_date=?,supplier=? WHERE id=?").run(name,category,batch_no,Number(price),Number(quantity),expiry_date,supplier,req.params.id);
 res.json({ok:true});
});
app.delete("/api/medicines/:id",auth,(req,res)=>{db.prepare("DELETE FROM medicines WHERE id=?").run(req.params.id);res.json({ok:true});});
app.post("/api/sales",auth,(req,res)=>{
 const items=req.body.items||[];
 if(!items.length)return res.status(400).json({error:"Add at least one item."});
 const sell=db.transaction(()=>{
   let total=0; const selected=[];
   for(const item of items){
     const m=db.prepare("SELECT * FROM medicines WHERE id=?").get(Number(item.id));
     const qty=Number(item.quantity);
     if(!m||!Number.isInteger(qty)||qty<1||m.quantity<qty)throw new Error("Insufficient stock or invalid quantity for an item.");
     selected.push({m,qty}); total+=m.price*qty;
   }
   const sale=db.prepare("INSERT INTO sales(customer,total) VALUES(?,?)").run(req.body.customer||"Walk-in Customer",total);
   for(const {m,qty} of selected){
     db.prepare("UPDATE medicines SET quantity=quantity-? WHERE id=?").run(qty,m.id);
     db.prepare("INSERT INTO sale_items(sale_id,medicine_id,medicine_name,quantity,price) VALUES(?,?,?,?,?)").run(sale.lastInsertRowid,m.id,m.name,qty,m.price);
   }
   return {id:sale.lastInsertRowid,total};
 });
 try{res.json(sell());}catch(e){res.status(400).json({error:e.message});}
});
app.get("/api/sales",auth,(req,res)=>res.json(db.prepare("SELECT * FROM sales ORDER BY id DESC LIMIT 100").all()));
app.get("/api/sales/:id",auth,(req,res)=>{
 const sale=db.prepare("SELECT * FROM sales WHERE id=?").get(req.params.id);
 if(!sale)return res.status(404).json({error:"Invoice not found"});
 res.json({sale,items:db.prepare("SELECT * FROM sale_items WHERE sale_id=?").all(req.params.id)});
});
const port=process.env.PORT||3000;
app.listen(port,"0.0.0.0",()=>console.log(`MedCare running on ${port}`));
