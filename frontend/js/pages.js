/* Reads and writes the client-side JSON store for each page. */
(function () {
  const L = window.Loanly;
  const page = document.body.dataset.page;
  if (!L || !page) return;

  const STATUS_CLASS = {
    Active: "text-bg-primary",
    Approved: "text-bg-success",
    Pending: "text-bg-warning",
    Rejected: "text-bg-danger",
    "Paid off": "text-bg-secondary",
    "Up to date": "text-bg-success",
    "Payment late": "text-bg-danger",
    "Pending application": "text-bg-warning",
  };
  const SPEND_COLOR = {
    Housing: "bg-primary",
    "Loan payments": "bg-danger",
    Food: "bg-success",
    Transport: "bg-warning",
    Other: "bg-secondary",
  };

  const $ = (id) => document.getElementById(id);
  const fullName = (user) => (user ? user.firstName + " " + user.lastName : "Unknown");
  const cents = (value) => L.money(value, 2);
  const rate = (value) => Number(value).toFixed(1) + "%";

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  function texts(map) {
    Object.keys(map).forEach((id) => setText(id, map[id]));
  }

  function show(id, on) {
    const node = $(id);
    if (node) node.classList.toggle("d-none", !on);
  }

  function clear(node) {
    node.replaceChildren();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function badge(text, wide) {
    return el("span", "badge" + (wide ? " status-badge" : "") + " " + (STATUS_CLASS[text] || "text-bg-secondary"), text);
  }

  function paintBadge(id, text) {
    const node = $(id);
    if (!node) return;
    node.className = "badge status-badge " + (STATUS_CLASS[text] || "text-bg-secondary");
    node.textContent = text;
  }

  function emptyRow(cols, text) {
    const cell = el("td", "text-secondary py-4", text);
    cell.colSpan = cols;
    const tr = document.createElement("tr");
    tr.append(cell);
    return tr;
  }

  function row(cells) {
    const tr = document.createElement("tr");
    tr.append(...cells);
    return tr;
  }

  function statusCell(text, wide) {
    const cell = document.createElement("td");
    cell.append(badge(text, wide));
    return cell;
  }

  function categoryCell(item) {
    const cell = document.createElement("td");
    cell.append(el("span", "badge text-bg-light border", item.type === "income" ? "Income" : item.category));
    return cell;
  }

  function at(value) {
    return value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
  }

  function formatDate(value, options) {
    return at(value).toLocaleDateString("en-US", options);
  }

  function formatWhen(value) {
    const date = at(value);
    const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return day + " at " + time;
  }

  function thisMonth(value) {
    const date = at(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function homeFor(user) {
    return user.role === "admin" ? "admin.html" : "dashboard.html";
  }

  function bindChrome(user) {
    setText("nav-user-name", fullName(user));
    document.querySelectorAll(".js-logout").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        L.logout();
        location.href = "login.html";
      });
    });
  }

  function requireUser() {
    const user = L.currentUser();
    const adminPage = page.startsWith("admin");
    if (!user) return go("login.html");
    if (adminPage && user.role !== "admin") return go("dashboard.html");
    if (!adminPage && user.role === "admin") return go("admin.html");
    bindChrome(user);
    return user;
  }

  function go(url) {
    location.replace(url);
    return null;
  }

  function onValid(form, handler) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      handler();
    });
  }

  function loanRow(item, withTerm) {
    const cells = [
      el("td", "fw-semibold", item.lender),
      el("td", null, L.money(item.amount)),
      el("td", null, rate(item.rate)),
    ];
    if (withTerm) cells.push(el("td", null, item.termMonths + " months"));
    cells.push(el("td", null, item.balance == null ? "—" : L.money(item.balance)), statusCell(item.status, true));
    return row(cells);
  }

  function fillRows(node, items, empty, make) {
    clear(node);
    if (!items.length) node.append(empty);
    else items.forEach((item) => node.append(make(item)));
  }

  function watchList(formId, draw) {
    const form = $(formId);
    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
  }

  const pages = {
    login: renderLogin,
    register: renderRegister,
    dashboard: renderDashboard,
    loans: renderLoans,
    finances: renderFinances,
    apply: renderApply,
    "apply-review": renderReview,
    application: renderApplication,
    admin: renderAdmin,
    "admin-application": renderAdminApplication,
    "admin-borrowers": renderBorrowers,
  };
  if (pages[page]) pages[page]();

  function renderLogin() {
    const user = L.currentUser();
    if (user) return go(homeFor(user));
    const form = $("login-form");
    const error = $("login-error");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      error.classList.add("d-none");
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      const signedIn = L.login(form.email.value, form.password.value);
      if (!signedIn) {
        error.classList.remove("d-none");
        return;
      }
      location.href = homeFor(signedIn);
    });
    $("reset-demo").addEventListener("click", () => {
      L.reset();
      location.reload();
    });
  }

  function renderRegister() {
    const user = L.currentUser();
    if (user) return go(homeFor(user));
    const form = $("register-form");
    const confirm = $("confirm-password");
    const error = $("register-error");
    function match() {
      confirm.setCustomValidity(confirm.value && form.password.value !== confirm.value ? "Passwords don't match." : "");
    }
    form.password.addEventListener("input", match);
    confirm.addEventListener("input", match);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      error.classList.add("d-none");
      match();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      const result = L.register({
        firstName: form.first_name.value,
        lastName: form.last_name.value,
        email: form.email.value,
        password: form.password.value,
      });
      if (result.error) {
        error.textContent = result.error;
        error.classList.remove("d-none");
        return;
      }
      location.href = "dashboard.html";
    });
  }

  function renderDashboard() {
    const user = requireUser();
    if (!user) return;
    const totals = L.totals(user.id);
    const active = L.activeLoansOf(user.id);
    const categories = [];
    L.transactions(user.id).forEach((item) => {
      if (item.type === "income" && thisMonth(item.date) && !categories.includes(item.category)) categories.push(item.category);
    });
    const groups = L.expensesByCategory(user.id);
    texts({
      "page-greeting": "Hi, " + user.firstName,
      "stat-debt": L.money(L.activeDebt(user.id)),
      "stat-debt-note": active.length + " active loan" + (active.length === 1 ? "" : "s"),
      "stat-income": L.money(totals.income),
      "stat-income-note": categories.length
        ? categories.map((name, index) => (index ? name.toLowerCase() : name)).join(" + ")
        : "No income logged this month",
      "stat-expenses": L.money(totals.expenses),
      "stat-expenses-note": groups.some((item) => item[0] === "Loan payments") ? "Including loan payments" : "This month",
      "stat-balance": L.money(totals.income - totals.expenses),
      "stat-balance-note": "Left after expenses",
    });

    const visible = L.entries(user.id).filter((item) => item.status === "Active" || item.status === "Approved" || item.status === "Pending");
    fillRows($("loan-rows"), visible, emptyRow(5, "No loans yet. Apply when you're ready."), (item) => loanRow(item, false));

    const list = $("spending-list");
    const spent = groups.reduce((total, item) => total + item[1], 0);
    fillRows(list, groups, el("li", "text-secondary", "No expenses this month."), (item) => {
      const name = item[0];
      const pct = spent ? Math.round((item[1] / spent) * 100) : 0;
      const line = el("div", "d-flex justify-content-between small mb-1");
      line.append(el("span", null, name), el("span", "fw-semibold", L.money(item[1])));
      const bar = el("div", "progress");
      bar.style.height = "8px";
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-label", name);
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      const fill = el("div", "progress-bar " + (SPEND_COLOR[name] || "bg-secondary"));
      fill.style.width = pct + "%";
      bar.append(fill);
      const li = el("li", "mb-3");
      li.append(line, bar);
      return li;
    });
  }

  function renderLoans() {
    const user = requireUser();
    if (!user) return;
    let filter = "All";
    function draw() {
      const rows = L.entries(user.id).filter((item) => filter === "All" || item.status === filter);
      const empty = filter === "All" ? "No loans yet." : "No " + filter.toLowerCase() + " loans.";
      fillRows($("loan-rows"), rows, emptyRow(6, empty), (item) => loanRow(item, true));
    }
    $("loan-filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-status]");
      if (!button) return;
      filter = button.dataset.status;
      $("loan-filters").querySelectorAll("[data-status]").forEach((item) => {
        item.classList.toggle("active", item === button);
        if (item === button) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      draw();
    });
    draw();
  }

  function renderFinances() {
    const user = requireUser();
    if (!user) return;
    const form = $("record-form");
    const date = $("date");
    if (date && !date.value) date.value = new Date().toLocaleDateString("en-CA");

    function draw() {
      const totals = L.totals(user.id);
      const top = L.expensesByCategory(user.id)[0];
      const flow = totals.income - totals.expenses;
      texts({
        "stat-income": L.money(totals.income),
        "stat-expenses": L.money(totals.expenses),
        "stat-cash": (flow > 0 ? "+" : "") + L.money(flow),
        "stat-top": top ? top[0] : "—",
        "stat-top-note": top ? L.money(top[1]) + " this month" : "No expenses yet",
      });
      fillRows($("record-rows"), L.transactions(user.id), emptyRow(4, "No records yet. Add income or an expense."), (item) => {
        const amount = el("td", "text-end fw-semibold" + (item.type === "income" ? " text-success" : ""));
        amount.textContent = (item.type === "income" ? "" : "-") + L.money(item.amount);
        return row([
          el("td", "text-secondary", formatDate(item.date, { month: "short", day: "numeric" })),
          el("td", "fw-semibold", item.description),
          categoryCell(item),
          amount,
        ]);
      });
    }

    onValid(form, () => {
      const data = new FormData(form);
      L.addTransaction(user.id, {
        type: data.get("type"),
        description: data.get("description"),
        category: data.get("category"),
        amount: data.get("amount"),
        date: data.get("date"),
      });
      form.description.value = "";
      form.amount.value = "";
      form.category.selectedIndex = 0;
      form.classList.remove("was-validated");
      draw();
    });
    draw();
  }

  function renderApply() {
    const user = requireUser();
    if (!user) return;
    const form = $("apply-form");
    const draft = L.draft(user.id);
    if (draft) {
      form.amount.value = draft.amount;
      form.term_months.value = String(draft.termMonths);
      form.purpose.value = draft.purpose;
      form.employment_status.value = draft.employmentStatus;
      form.employer.value = draft.employer;
      form.monthly_income.value = draft.monthlyIncome;
      form.existing_debt.value = draft.existingDebt;
    } else {
      if (user.employmentStatus) form.employment_status.value = user.employmentStatus;
      form.employer.value = user.employer || "";
      form.monthly_income.value = L.totals(user.id).income;
      form.existing_debt.value = L.activeDebt(user.id);
    }

    function paintQuote() {
      const estimate = L.quote(form.amount.value, form.term_months.value, L.ANNUAL_RATE);
      texts({
        "estimate-monthly": cents(estimate.monthly),
        "estimate-amount": cents(Number(form.amount.value) || 0),
        "estimate-interest": cents(estimate.interest),
        "estimate-total": cents(estimate.total),
      });
    }
    form.addEventListener("input", paintQuote);
    paintQuote();
    onValid(form, () => {
      L.saveDraft(user.id, {
        amount: form.amount.value,
        termMonths: form.term_months.value,
        purpose: form.purpose.value,
        employmentStatus: form.employment_status.value,
        employer: form.employer.value,
        monthlyIncome: form.monthly_income.value,
        existingDebt: form.existing_debt.value,
      });
      location.href = "apply-review.html";
    });
  }

  function renderReview() {
    const user = requireUser();
    if (!user) return;
    const draft = L.draft(user.id);
    if (!draft) return go("apply.html");
    const estimate = L.quote(draft.amount, draft.termMonths, L.ANNUAL_RATE);
    texts({
      "rev-amount": cents(draft.amount),
      "rev-term": draft.termMonths + " months",
      "rev-purpose": draft.purpose,
      "rev-employment": draft.employmentStatus,
      "rev-employer": draft.employer || "—",
      "rev-income": L.money(draft.monthlyIncome),
      "rev-debt": L.money(draft.existingDebt),
      "rev-monthly": cents(estimate.monthly),
      "rev-interest": cents(estimate.interest),
      "rev-total": cents(estimate.total),
    });
    $("review-form").addEventListener("submit", (event) => {
      event.preventDefault();
      location.href = "application.html?id=" + L.submitApplication(user.id).id;
    });
  }

  function renderApplication() {
    const user = requireUser();
    if (!user) return;
    const requested = new URLSearchParams(location.search).get("id");
    let app = requested ? L.application(requested) : L.latestApplication(user.id);
    if (app && app.userId !== user.id) app = null;
    show("application-empty", !app);
    show("application-has", !!app);
    if (!app) return;

    const estimate = L.quote(app.amount, app.termMonths, app.rate);
    const pending = app.status === "Pending";
    texts({
      "app-title": "Application #" + app.id,
      "app-subtitle": "Submitted on " + formatDate(app.submittedAt, { month: "short", day: "numeric", year: "numeric" }),
      "sum-amount": cents(app.amount),
      "sum-term": app.termMonths + " months",
      "sum-purpose": app.purpose,
      "sum-payment": cents(estimate.monthly),
      "outcome-heading": pending ? "Possible decisions" : "Decision",
      "outcome-approved-lead": "Congratulations! Your loan of " + cents(app.amount) + " was approved.",
      "outcome-rejected-lead": app.status === "Rejected" && app.note ? app.note : "Your current debt is too high compared to your income for this amount.",
      "outcome-rejected-next": "Next step: try a smaller amount or a longer term, or apply again in 30 days.",
    });
    paintBadge("app-status", app.status);
    paintBadge("sum-status", app.status);
    show("submitted-alert", pending);
    show("outcome-intro", pending);
    show("outcome-approved", pending || app.status === "Approved");
    show("outcome-rejected", pending || app.status === "Rejected");
    fillApprovedNext(estimate.monthly);

    const timeline = $("timeline");
    clear(timeline);
    timeline.append(step(true, false, "bi-check-lg", "Application submitted", formatWhen(app.submittedAt)));
    if (pending) {
      timeline.append(
        step(false, true, "bi-hourglass-split", "Admin review", "An administrator is checking your details. You don't need to do anything right now. We'll show the decision here as soon as it's made."),
        step(false, false, "bi-flag", "Decision", "You'll see here if your loan was approved or rejected, with the next steps.")
      );
    } else {
      const approved = app.status === "Approved";
      timeline.append(
        step(true, false, "bi-check-lg", "Admin review", "Reviewed on " + formatWhen(app.decidedAt)),
        step(true, false, approved ? "bi-check-lg" : "bi-x-lg", approved ? "Approved" : "Not approved", app.note || (approved ? "Your loan was approved." : "Your loan was not approved."))
      );
    }
  }

  function step(done, current, icon, title, detail) {
    const item = el("li", done ? "done" : current ? "current" : "");
    const dot = el("span", "dot");
    dot.append(el("i", "bi " + icon));
    item.append(dot, el("p", "fw-semibold mb-0", title), el("p", "small text-secondary mb-0", detail));
    return item;
  }

  function fillApprovedNext(payment) {
    const node = $("outcome-approved-next");
    if (!node) return;
    clear(node);
    const link = el("a", "alert-link", "My loans");
    link.href = "loans.html";
    node.append(
      el("strong", null, "Next step: "),
      document.createTextNode("you'll receive the funds and see the loan in "),
      link,
      document.createTextNode(". Your first payment of " + cents(payment) + " is due 30 days later.")
    );
  }

  function renderAdmin() {
    const user = requireUser();
    if (!user) return;

    function draw() {
      const stats = L.portfolio();
      const needle = $("queue-search").value.trim().toLowerCase();
      const status = $("queue-status").value;
      texts({
        "page-greeting": "Welcome back, " + user.firstName + ". Monitor lending activity and review new requests.",
        "stat-requests": String(stats.totalRequests),
        "stat-requests-note": "+" + stats.requestsThisMonth + " this month",
        "stat-pending": String(stats.pending),
        "stat-pending-note": stats.oldestLabel,
        "stat-volume": L.money(stats.approvedVolume),
        "stat-volume-note": stats.approvedLoans + " approved loans",
        "stat-borrowers": String(stats.activeBorrowers),
        "stat-borrowers-note": stats.newBorrowersThisMonth + " new this month",
      });
      const rows = L.applications().filter((app) => {
        const person = L.user(app.userId);
        const name = fullName(person).toLowerCase();
        const matches = !needle || name.includes(needle) || app.id.toLowerCase().includes(needle);
        return (status === "All" || app.status === status) && matches;
      });
      fillRows($("queue-rows"), rows, emptyRow(8, "No applications match."), (app) => {
        const person = L.user(app.userId);
        const request = el("td");
        request.append(document.createTextNode(L.money(app.amount) + " "), el("span", "text-secondary small", "/ " + app.termMonths + " mo"));
        const actions = el("div", "d-flex gap-1 justify-content-end");
        const view = el("a", "btn btn-sm btn-outline-secondary", "View");
        view.href = "admin-application.html?id=" + app.id;
        actions.append(view);
        if (app.status === "Pending") {
          actions.append(
            iconButton("btn-success", "bi-check-lg", "Approve " + app.id, () => { L.decide(app.id, "Approved", ""); draw(); }),
            iconButton("btn-danger", "bi-x-lg", "Reject " + app.id, () => { L.decide(app.id, "Rejected", ""); draw(); })
          );
        }
        return row([
          el("td", "text-secondary", "#" + app.id),
          el("td", "fw-semibold", fullName(person)),
          request,
          el("td", null, L.money(app.monthlyIncome)),
          el("td", null, L.money(app.existingDebt)),
          el("td", "text-secondary", formatDate(app.submittedAt, { month: "short", day: "numeric" })),
          statusCell(app.status, true),
          el("td").appendChild(actions).parentNode,
        ]);
      });
    }

    watchList("queue-form", draw);
    draw();
  }

  function iconButton(style, icon, label, onClick) {
    const button = el("button", "btn btn-sm " + style);
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.append(el("i", "bi " + icon));
    button.addEventListener("click", onClick);
    return button;
  }

  function renderAdminApplication() {
    const user = requireUser();
    if (!user) return;
    const app = L.application(new URLSearchParams(location.search).get("id"));
    if (!app) return go("admin.html");
    const person = L.user(app.userId);
    const estimate = L.quote(app.amount, app.termMonths, app.rate);
    const name = fullName(person);
    texts({
      "crumb-current": "#" + app.id,
      "app-title": "Application #" + app.id,
      "app-subtitle": "Submitted by " + name + " on " + formatDate(app.submittedAt, { month: "short", day: "numeric", year: "numeric" }),
      "req-amount": cents(app.amount),
      "req-term": app.termMonths + " months",
      "req-payment": cents(estimate.monthly),
      "req-purpose": app.purpose,
      "person-name": name,
      "person-email": person ? person.email : "—",
      "person-employment": app.employmentStatus || "—",
      "person-since": person ? formatDate(person.customerSince, { month: "long", year: "numeric" }) : "—",
      "fin-income": L.money(app.monthlyIncome),
      "fin-expenses": L.money(app.monthlyExpenses),
      "fin-debt": L.money(app.existingDebt),
      dti: app.monthlyIncome ? (app.existingDebt / app.monthlyIncome).toFixed(1) + "x monthly income" : "n/a",
    });
    paintBadge("app-status", app.status);
    show("decision-alert", app.status !== "Pending");
    fillRows($("lender-rows"), L.activeLoansOf(app.userId), emptyRow(4, "No active loans."), (item) => row([
      el("td", "fw-semibold", item.lender),
      el("td", null, L.money(item.balance)),
      el("td", null, rate(item.rate)),
      statusCell(item.status, true),
    ]));

    const form = $("decision-form");
    const note = $("note");
    const locked = app.status !== "Pending";
    note.value = app.note || "";
    note.disabled = locked;
    form.querySelectorAll("button").forEach((button) => { button.disabled = locked; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (locked || !event.submitter) return;
      L.decide(app.id, event.submitter.value === "approved" ? "Approved" : "Rejected", note.value);
      location.href = "admin-application.html?id=" + app.id;
    });
  }

  function renderBorrowers() {
    const user = requireUser();
    if (!user) return;
    const all = L.borrowers();
    setText("borrower-count", L.portfolio().activeBorrowers + " active borrowers");

    function draw() {
      const needle = $("borrower-search").value.trim().toLowerCase();
      const status = $("borrower-status").value;
      const rows = all.filter((item) => {
        const name = (fullName(item.user) + " " + item.user.email).toLowerCase();
        return (status === "All" || item.status === status) && (!needle || name.includes(needle));
      });
      setText("borrower-shown", "Showing " + rows.length + " of " + all.length);
      fillRows($("borrower-rows"), rows, emptyRow(7, "No borrowers match."), (item) => {
        const who = el("td");
        who.append(el("span", "fw-semibold d-block", fullName(item.user)), el("span", "small text-secondary", item.user.email));
        const profile = el("td", "text-end");
        if (item.latestApplicationId) {
          const link = el("a", "btn btn-sm btn-outline-secondary", "View profile");
          link.href = "admin-application.html?id=" + item.latestApplicationId;
          profile.append(link);
        } else {
          profile.append(el("span", "small text-secondary", "No application"));
        }
        return row([
          who,
          el("td", null, String(item.loanCount)),
          el("td", null, L.money(item.debt)),
          el("td", null, L.money(item.monthlyIncome)),
          el("td", "text-secondary", formatDate(item.user.customerSince, { month: "short", year: "numeric" })),
          statusCell(item.status, false),
          profile,
        ]);
      });
    }

    watchList("borrower-form", draw);
    draw();
  }
})();
