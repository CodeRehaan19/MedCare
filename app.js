const $ = s => document.querySelector(s);

let medicines = [];
let cart = [];

async function api(url, opts = {}) {
    const r = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opts
    });

    const d = await r.json();

    if (!r.ok) {
        throw Error(d.error || "Request failed");
    }

    return d;
}

function money(n) {
    return "₹" + Number(n).toFixed(2);
}

function showApp(on) {
    $("#login").classList.toggle("hidden", on);
    $("#app").classList.toggle("hidden", !on);
}

async function boot() {
    const me = await api("/api/me");

    showApp(me.loggedIn);

    if (me.loggedIn) {
        await refresh();
    }
}

// LOGIN

$("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.target));

    try {
        await api("/api/login", {
            method: "POST",
            body: JSON.stringify(data)
        });

        $("#loginError").textContent = "";

        showApp(true);

        await refresh();

    } catch (err) {
        $("#loginError").textContent = err.message;
    }
});

// LOGOUT

$("#logout").onclick = async () => {
    await api("/api/logout", {
        method: "POST"
    });

    showApp(false);
};

// NAVIGATION

document.querySelectorAll(".nav button").forEach(b => {

    b.onclick = () => {

        document.querySelectorAll(".nav button")
            .forEach(x => x.classList.remove("active"));

        b.classList.add("active");

        document.querySelectorAll(".page")
            .forEach(x => x.classList.add("hidden"));

        $("#" + b.dataset.page).classList.remove("hidden");

        $("#pageTitle").textContent = b.textContent.trim();

        if (b.dataset.page === "sales") {
            loadSales();
        }
    };

});

// REFRESH DASHBOARD

async function refresh() {

    const d = await api("/api/dashboard");

    $("#statM").textContent = d.medicines;
    $("#statL").textContent = d.low;
    $("#statE").textContent = d.expired;
    $("#statS").textContent = money(d.sales);

    medicines = await api("/api/medicines");

    renderMedicines();
    renderBillOptions();

    $("#dashList").innerHTML = medicines.slice(0, 6).map(m => `
        <div class="cart-line">
            <span>
                ${esc(m.name)}
                <small>(${esc(m.category)})</small>
            </span>
            <b>${m.quantity} in stock</b>
        </div>
    `).join("");
}

// ESCAPE HTML

function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

// MEDICINE TABLE

function renderMedicines() {

    const q = $("#search").value.toLowerCase();

    $("#medicineRows").innerHTML = medicines
        .filter(m =>
            [m.name, m.category, m.batch_no]
                .join(" ")
                .toLowerCase()
                .includes(q)
        )
        .map(m => `
            <tr>
                <td><b>${esc(m.name)}</b></td>
                <td>${esc(m.category)}</td>
                <td>${esc(m.batch_no)}</td>
                <td>${money(m.price)}</td>
                <td>
                    <span class="badge ${m.quantity <= 20 ? "low" : ""}">
                        ${m.quantity}
                    </span>
                </td>
                <td>${esc(m.expiry_date)}</td>
                <td>${esc(m.supplier)}</td>
                <td>
                    <button onclick="editMedicine(${m.id})">Edit</button>
                    <button onclick="deleteMedicine(${m.id})">Delete</button>
                </td>
            </tr>
        `)
        .join("") || '<tr><td colspan="8">No medicines found.</td></tr>';
}

$("#search").oninput = renderMedicines;

// ADD MEDICINE

$("#addBtn").onclick = () => openMedicine();

function openMedicine(m) {

    const f = $("#medicineForm");

    f.reset();

    f.elements.id.value = m?.id || "";

    $("#dialogTitle").textContent =
        m ? "Edit medicine" : "Add medicine";

    if (m) {
        Object.keys(m).forEach(k => {
            if (f.elements[k]) {
                f.elements[k].value = m[k] ?? "";
            }
        });
    }

    $("#medicineDialog").showModal();
}

window.editMedicine = id => {
    openMedicine(medicines.find(m => String(m.id) === String(id)));
};

// DELETE MEDICINE

window.deleteMedicine = async id => {

    if (confirm("Delete this medicine?")) {

        try {
            await api("/api/medicines/" + id, {
                method: "DELETE"
            });

            await refresh();

        } catch (err) {
            alert(err.message);
        }
    }
};

$("#cancelDialog").onclick = () => {
    $("#medicineDialog").close();
};

// SAVE MEDICINE

$("#medicineForm").onsubmit = async e => {

    e.preventDefault();

    const f = e.target;

    const d = Object.fromEntries(new FormData(f));

    const id = d.id;

    delete d.id;

    try {

        await api("/api/medicines" + (id ? "/" + id : ""), {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(d)
        });

        $("#medicineDialog").close();

        await refresh();

    } catch (err) {
        alert(err.message);
    }
};

// BILLING MEDICINE OPTIONS

function renderBillOptions() {

    const sel = $("#billMedicine");

    const previous = sel.value;

    sel.innerHTML = medicines
        .filter(m => Number(m.quantity) > 0)
        .map(m => `
            <option value="${m.id}">
                ${esc(m.name)} — ${money(m.price)}
                (${m.quantity} available)
            </option>
        `)
        .join("");

    if ([...sel.options].some(o => o.value === previous)) {
        sel.value = previous;
    }
}

// ADD TO CART

$("#addCart").onclick = () => {

    const selectedId = $("#billMedicine").value;

    const m = medicines.find(
        x => String(x.id) === String(selectedId)
    );

    const qty = Number($("#billQty").value);

    if (
        !m ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > Number(m.quantity)
    ) {
        alert("Select a medicine and enter a valid quantity.");
        return;
    }

    const old = cart.find(
        x => String(x.id) === String(m.id)
    );

    if (old) {

        if (old.quantity + qty > Number(m.quantity)) {
            alert("Not enough stock.");
            return;
        }

        old.quantity += qty;

    } else {

        cart.push({
            id: m.id,
            name: m.name,
            price: Number(m.price),
            quantity: qty
        });
    }

    renderCart();
};

// DISPLAY CART

function renderCart() {

    $("#cartRows").innerHTML = cart.map((x, i) => `
        <div class="cart-line">
            <span>${esc(x.name)} × ${x.quantity}</span>

            <span>
                ${money(x.price * x.quantity)}
                <button onclick="removeCart(${i})">Remove</button>
            </span>
        </div>
    `).join("") || "<p>No items added yet.</p>";

    $("#billTotal").textContent =
        "Total: " +
        money(cart.reduce(
            (a, x) => a + x.price * x.quantity,
            0
        ));
}

// REMOVE CART ITEM

window.removeCart = i => {

    cart.splice(i, 1);

    renderCart();
};

// COMPLETE SALE

$("#completeSale").onclick = async () => {

    if (!cart.length) {
        alert("Add items first.");
        return;
    }

    try {

        const sale = await api("/api/sales", {
            method: "POST",
            body: JSON.stringify({
                customer: $("#customer").value,
                items: cart
            })
        });

        const detail = await api("/api/sales/" + sale.id);

        cart = [];

        renderCart();

        await refresh();

        printInvoice(detail);

    } catch (e) {
        alert(e.message);
    }
};

// PRINT INVOICE

function printInvoice(d) {

    const w = window.open("", "_blank");

    if (!w) {
        alert("Allow pop-ups to print the receipt.");
        return;
    }

    w.document.write(`
        <h2>MedCare Pharmacy</h2>

        <p>
            Invoice #${d.sale.id}<br>
            ${new Date(d.sale.created_at).toLocaleString()}<br>
            Customer: ${esc(d.sale.customer)}
        </p>

        <hr>

        ${d.items.map(x => `
            <p>
                ${esc(x.medicine_name)} × ${x.quantity}
                — ${money(x.price * x.quantity)}
            </p>
        `).join("")}

        <hr>

        <h3>Total: ${money(d.sale.total)}</h3>

        <p>Thank you!</p>
    `);

    w.document.close();

    w.print();
}

// SALES HISTORY

async function loadSales() {

    const rows = await api("/api/sales");

    $("#salesRows").innerHTML = rows.map(s => `
        <tr>
            <td>#${s.id}</td>
            <td>${esc(s.customer)}</td>
            <td>${new Date(s.created_at + "Z").toLocaleString()}</td>
            <td>${money(s.total)}</td>
            <td>
                <button onclick="viewInvoice(${s.id})">
                    View / Print
                </button>
            </td>
        </tr>
    `).join("") || '<tr><td colspan="5">No sales recorded.</td></tr>';
}

// VIEW INVOICE

window.viewInvoice = async id => {

    try {
        const detail = await api("/api/sales/" + id);
        printInvoice(detail);
    } catch (err) {
        alert(err.message);
    }
};

// START APPLICATION

boot().catch(e => {
    console.error("MedCare startup error:", e);
});
