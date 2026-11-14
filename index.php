<?php
require_once "auth.php";
require_login();
require_once "db.php";
$notice = "";
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (isset($_POST["add_medicine"])) {
        $stmt = $conn->prepare("INSERT INTO medicines(name, category, batch_no, price, quantity, expiry_date) VALUES(?,?,?,?,?,?)");
        $stmt->bind_param("sssdis", $_POST["name"], $_POST["category"], $_POST["batch_no"], $_POST["price"], $_POST["quantity"], $_POST["expiry_date"]);
        $stmt->execute();
        $notice = "Medicine added successfully.";
    } elseif (isset($_POST["delete_id"])) {
        $stmt = $conn->prepare("DELETE FROM medicines WHERE id=?");
        $stmt->bind_param("i", $_POST["delete_id"]);
        $stmt->execute();
        $notice = "Medicine deleted.";
    } elseif (isset($_POST["sell"])) {
        $id = (int)$_POST["medicine_id"];
        $qty = max(1, (int)$_POST["sell_qty"]);
        $stmt = $conn->prepare("SELECT name, price, quantity FROM medicines WHERE id=?");
        $stmt->bind_param("i", $id); $stmt->execute();
        $med = $stmt->get_result()->fetch_assoc();
        if (!$med || $med["quantity"] < $qty) {
            $notice = "Medicine not found or insufficient stock.";
        } else {
            $total = $med["price"] * $qty;
            $conn->begin_transaction();
            $u = $conn->prepare("UPDATE medicines SET quantity=quantity-? WHERE id=?");
            $u->bind_param("ii", $qty, $id); $u->execute();
            $s = $conn->prepare("INSERT INTO sales(medicine_id, medicine_name, quantity, unit_price, total) VALUES(?,?,?,?,?)");
            $s->bind_param("isidd", $id, $med["name"], $qty, $med["price"], $total); $s->execute();
            $conn->commit();
            $notice = "Sale recorded. Total: ₹" . number_format($total, 2);
        }
    }
}
$medicines = $conn->query("SELECT * FROM medicines ORDER BY name");
$stats = $conn->query("SELECT COUNT(*) items, COALESCE(SUM(quantity),0) units, COALESCE(SUM(CASE WHEN quantity<=10 THEN 1 ELSE 0 END),0) low FROM medicines")->fetch_assoc();
$salesTotal = $conn->query("SELECT COALESCE(SUM(total),0) total FROM sales WHERE DATE(sold_at)=CURDATE()")->fetch_assoc()["total"];
$recent = $conn->query("SELECT * FROM sales ORDER BY sold_at DESC LIMIT 6");
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MedCare | Store Management</title><link rel="stylesheet" href="style.css"></head><body>
<aside class="sidebar"><div class="brand"><span class="logo">✚</span><div><b>MedCare</b><small>STORE MANAGEMENT</small></div></div>
<nav><a class="active" href="#dashboard">▦ &nbsp; Dashboard</a><a href="#inventory">▤ &nbsp; Inventory</a><a href="#add">＋ &nbsp; Add medicine</a><a href="#sales">▧ &nbsp; Sales</a></nav>
<div class="side-note">Manage your pharmacy<br>simply and efficiently.</div></aside>
<main><header><div><p class="eyebrow">PHARMACY WORKSPACE</p><h1>Good day, Admin <span>✦</span></h1><p class="muted">Here's what's happening in your store today.</p></div><div class="admin">● &nbsp; Administrator &nbsp; <a href="logout.php" style="color:#6558d3;text-decoration:none;font-weight:700">Logout</a></div></header>
<?php if ($notice): ?><div class="notice"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<section id="dashboard" class="cards">
<div class="stat"><div class="stat-icon purple">▤</div><p>Total medicines</p><h2><?= (int)$stats["items"] ?></h2><small>Different products</small></div>
<div class="stat"><div class="stat-icon green">▦</div><p>Units in stock</p><h2><?= (int)$stats["units"] ?></h2><small>Across all products</small></div>
<div class="stat"><div class="stat-icon orange">!</div><p>Low stock items</p><h2><?= (int)$stats["low"] ?></h2><small>10 units or less</small></div>
<div class="stat"><div class="stat-icon blue">₹</div><p>Today's sales</p><h2>₹<?= number_format((float)$salesTotal,2) ?></h2><small>Sales recorded today</small></div>
</section>
<section class="panel" id="inventory"><div class="panel-head"><div><h2>Medicine inventory</h2><p class="muted">View and manage available medicines.</p></div><a class="button" href="#add">＋ Add medicine</a></div>
<div class="toolbar"><input id="search" type="search" placeholder="Search medicine, category or batch..."><span class="muted"><?= $medicines->num_rows ?> products</span></div>
<div class="table-wrap"><table><thead><tr><th>MEDICINE</th><th>CATEGORY</th><th>BATCH NO.</th><th>PRICE</th><th>STOCK</th><th>EXPIRY</th><th>ACTION</th></tr></thead><tbody id="medicineRows">
<?php while($m=$medicines->fetch_assoc()): ?><tr><td><b><?= htmlspecialchars($m["name"]) ?></b></td><td><?= htmlspecialchars($m["category"]) ?></td><td><?= htmlspecialchars($m["batch_no"]) ?></td><td>₹<?= number_format($m["price"],2) ?></td><td><span class="badge <?= $m["quantity"]<=10?'warning':'good' ?>"><?= (int)$m["quantity"] ?> units</span></td><td><?= htmlspecialchars($m["expiry_date"]) ?></td><td><form method="post" onsubmit="return confirm('Delete this medicine?')"><button class="delete" name="delete_id" value="<?= $m["id"] ?>">Delete</button></form></td></tr><?php endwhile; ?>
</tbody></table></div></section>
<section class="bottom-grid">
<div class="panel" id="add"><div class="panel-head"><div><h2>Add a medicine</h2><p class="muted">Enter product details to update inventory.</p></div></div>
<form method="post" class="form-grid">
<label>Medicine name<input name="name" required placeholder="e.g. Paracetamol 500mg"></label><label>Category<input name="category" required placeholder="e.g. Pain relief"></label>
<label>Batch number<input name="batch_no" required placeholder="e.g. PCM2401"></label><label>Price (₹)<input type="number" name="price" min="0.01" step="0.01" required></label>
<label>Quantity<input type="number" name="quantity" min="0" required></label><label>Expiry date<input type="date" name="expiry_date" required></label>
<button class="button full" name="add_medicine">Save medicine</button></form></div>
<div class="panel" id="sales"><div class="panel-head"><div><h2>Record a sale</h2><p class="muted">Stock is reduced automatically.</p></div></div>
<form method="post" class="sale-form"><label>Select medicine<select name="medicine_id" required><?php
$opts=$conn->query("SELECT id,name,quantity FROM medicines WHERE quantity>0 ORDER BY name");
while($o=$opts->fetch_assoc()) echo '<option value="'.(int)$o["id"].'">'.htmlspecialchars($o["name"]).' — '.$o["quantity"].' left</option>';
?></select></label><label>Quantity sold<input type="number" name="sell_qty" value="1" min="1" required></label><button class="button full" name="sell">Complete sale</button></form>
<h3 class="subheading">Recent sales</h3><?php if($recent->num_rows): while($s=$recent->fetch_assoc()): ?><div class="sale-row"><div><b><?= htmlspecialchars($s["medicine_name"]) ?></b><small><?= (int)$s["quantity"] ?> units · <?= date("d M, h:i A",strtotime($s["sold_at"])) ?></small></div><strong>₹<?= number_format($s["total"],2) ?></strong></div><?php endwhile; else: ?><p class="muted">No sales recorded yet.</p><?php endif; ?>
</div></section><footer>MedCare Store Management · Academic project demo</footer></main>
<script src="script.js"></script></body></html>