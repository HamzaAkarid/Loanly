document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("cta").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("journey").scrollIntoView({ behavior: "smooth" });
});

// Loan calculator (fixed monthly payment, amortized)
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function calculateLoan() {
  const amount = parseFloat(document.getElementById("amount").value) || 0;
  const annualRate = parseFloat(document.getElementById("rate").value) || 0;
  const months = parseInt(document.getElementById("months").value, 10) || 0;

  let monthly = 0;
  if (amount > 0 && months > 0) {
    const r = annualRate / 100 / 12;
    monthly = r === 0 ? amount / months : (amount * r) / (1 - Math.pow(1 + r, -months));
  }
  const total = monthly * months;

  document.getElementById("monthly").textContent = money.format(monthly);
  document.getElementById("total").textContent = money.format(total);
  document.getElementById("interest").textContent = money.format(Math.max(total - amount, 0));
}

document.getElementById("calc-form").addEventListener("input", calculateLoan);
calculateLoan();

// Close the mobile menu after picking a section
document.querySelectorAll("#main-nav .nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const menu = bootstrap.Collapse.getInstance(document.getElementById("main-nav"));
    if (menu) menu.hide();
  });
});
