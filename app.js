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

$("#logout").onclick = async () => {
    await api("/api/logout", {
        method: "POST"
    });

    showApp(false);
};

document.querySelectorAll(".nav button").forEach(b => {
    b.onclick = () => {

        document.querySelectorAll(".nav button").forEach(x => {
            x.classList.remove("active");
        });

        b.classList.add("active");

        document.querySelectorAll(".page").forEach(x => {
            x.classList.add("hidden");
        });

        $("#" + b.dataset.page).classList.remove("hidden");

        $("#pageTitle").textContent = b.textContent.trim();

        if (b.dataset.page === "sales") {
            loadSales();
        }
    };
});

async function refresh() {

    const d = await api("/api/dashboard");

    $("#statM").textContent = d.medicines;
    $("#statL").textContent = d.low;
    $("#statE").textContent = d.expired;
    $("#statS").textContent = money(d.sales);

    medicines = await api("/api/medicines");

    renderMedicines();
    renderBillOptions();

    $("#dashList").innerHTML
