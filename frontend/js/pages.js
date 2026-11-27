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

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  function show(id, on) {
    const node = $(id);
    if (!node) return;
    /* d-flex is defined after d-none in Bootstrap, and both use !important,
       so a hidden flex row has to drop d-flex or it stays on screen. */
    if (node.classList.contains("d-flex") || node.dataset.display === "flex") {
      node.dataset.display = "flex";
      node.classList.toggle("d-flex", on);
    }
    node.classList.toggle("d-none", !on);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
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
    const row = document.createElement("tr");
    const cell = el("td", "text-secondary py-4", text);
    cell.colSpan = cols;
    row.appendChild(cell);
    return row;
  }

  function rate(value) {
    return Number(value).toFixed(1) + "%";
  }

  function parseDate(value) {
    return value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
  }

  function formatDate(value, options) {
    return parseDate(value).toLocaleDateString("en-US", options);
  }

  function formatWhen(value) {
    const date = parseDate(value);
    const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return day + " at " + time;
  }

  function thisMonth(value) {
    const date = parseDate(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function homeFor(user) {
    return user.role === "admin" ? "admin.html" : "dashboard.html";
  }

  function bindChrome(user) {
    setText("nav-user-name", user.firstName + " " + user.lastName);
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
    if (!user) {
      location.replace("login.html");
      return null;
    }
    if (adminPage && user.role !== "admin") {
      location.replace("dashboard.html");
      return null;
    }
    if (!adminPage && user.role === "admin") {
      location.replace("admin.html");
      return null;
    }
    bindChrome(user);
    return user;
  }

  function balanceText(entry) {
    return entry.balance == null ? "—" : L.money(entry.balance);
  }

  function quoteFor(amount, months, rate) {
    return L.quote(amount, months, rate);
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
    if (user) {
      location.replace(homeFor(user));
      return;
    }
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
    if (user) {
      location.replace(homeFor(user));
      return;
    }
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
    const incomeRows = L.transactions(user.id).filter((item) => item.type === "income" && thisMonth(item.date));
    const categories = [];
    incomeRows.forEach((item) => {
      if (!categories.includes(item.category)) categories.push(item.category);
    });
    const incomeNote = categories.length
      ? categories.map((name, index) => (index === 0 ? name : name.toLowerCase())).join(" + ")
      : "No income logged this month";
    const expenseNote = L.expensesByCategory(user.id).some((item) => item[0] === "Loan payments")
      ? "Including loan payments"
      : "This month";

    setText("page-greeting", "Hi, " + user.firstName);
    setText("stat-debt", L.money(L.activeDebt(user.id)));
    setText("stat-debt-note", active.length + " active loan" + (active.length === 1 ? "" : "s"));
    setText("stat-income", L.money(totals.income));
    setText("stat-income-note", incomeNote);
    setText("stat-expenses", L.money(totals.expenses));
    setText("stat-expenses-note", expenseNote);
    setText("stat-balance", L.money(totals.income - totals.expenses));
    setText("stat-balance-note", "Left after expenses");

    const loans = $("loan-rows");
    clear(loans);
    const rows = L.entries(user.id).filter((item) => item.status === "Active" || item.status === "Approved" || item.status === "Pending");
    if (!rows.length) {
      loans.appendChild(emptyRow(5, "No loans yet. Apply when you're ready."));
    } else {
      rows.forEach((item) => {
        const row = document.createElement("tr");
        row.append(
          el("td", "fw-semibold", item.lender),
          el("td", null, L.money(item.amount)),
          el("td", null, rate(item.rate)),
          el("td", null, balanceText(item)),
          el("td")
        );
        row.lastChild.appendChild(badge(item.status, true));
        loans.appendChild(row);
      });
    }

    const list = $("spending-list");
    clear(list);
    const groups = L.expensesByCategory(user.id);
    const spent = groups.reduce((sum, item) => sum + item[1], 0);
    if (!groups.length) {
      list.appendChild(el("li", "text-secondary", "No expenses this month."));
      return;
    }
    groups.forEach((item) => {
      const name = item[0];
      const amount = item[1];
      const pct = spent ? Math.round((amount / spent) * 100) : 0;
      const li = el("li", "mb-3");
      const line = el("div", "d-flex justify-content-between small mb-1");
      line.append(el("span", null, name), el("span", "fw-semibold", L.money(amount)));
      const bar = el("div", "progress");
      bar.style.height = "8px";
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-label", name);
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      const fill = el("div", "progress-bar " + (SPEND_COLOR[name] || "bg-secondary"));
      fill.style.width = pct + "%";
      bar.appendChild(fill);
      li.append(line, bar);
      list.appendChild(li);
    });
  }

  function renderLoans() {
    const user = requireUser();
    if (!user) return;
    let filter = "All";
    const body = $("loan-rows");

    function draw() {
      clear(body);
      const rows = L.entries(user.id).filter((item) => filter === "All" || item.status === filter);
      if (!rows.length) {
        body.appendChild(emptyRow(6, filter === "All" ? "No loans yet." : "No " + filter.toLowerCase() + " loans."));
        return;
      }
      rows.forEach((item) => {
        const row = document.createElement("tr");
        row.append(
          el("td", "fw-semibold", item.lender),
          el("td", null, L.money(item.amount)),
          el("td", null, rate(item.rate)),
          el("td", null, item.termMonths + " months"),
          el("td", null, balanceText(item)),
          el("td")
        );
        row.lastChild.appendChild(badge(item.status, true));
        body.appendChild(row);
      });
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
    if (date && !date.value) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      date.value = now.getFullYear() + "-" + month + "-" + day;
    }

    function draw() {
      const totals = L.totals(user.id);
      const groups = L.expensesByCategory(user.id);
      const top = groups[0];
      const flow = totals.income - totals.expenses;
      setText("stat-income", L.money(totals.income));
      setText("stat-expenses", L.money(totals.expenses));
      setText("stat-cash", (flow > 0 ? "+" : "") + L.money(flow));
      setText("stat-top", top ? top[0] : "—");
      setText("stat-top-note", top ? L.money(top[1]) + " this month" : "No expenses yet");

      const body = $("record-rows");
      clear(body);
      const rows = L.transactions(user.id);
      if (!rows.length) {
        body.appendChild(emptyRow(4, "No records yet. Add income or an expense."));
        return;
      }
      rows.forEach((item) => {
        const row = document.createElement("tr");
        const amount = el("td", "text-end fw-semibold" + (item.type === "income" ? " text-success" : ""));
        amount.textContent = item.type === "income" ? L.money(item.amount) : "-" + L.money(item.amount);
        row.append(
          el("td", "text-secondary", formatDate(item.date, { month: "short", day: "numeric" })),
          el("td", "fw-semibold", item.description),
          el("td"),
          amount
        );
        row.children[2].appendChild(el("span", "badge text-bg-light border", item.type === "income" ? "Income" : item.category));
        body.appendChild(row);
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
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
    const totals = L.totals(user.id);
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
      form.monthly_income.value = totals.income;
      form.existing_debt.value = L.activeDebt(user.id);
    }

    function paintQuote() {
      const estimate = quoteFor(form.amount.value, form.term_months.value, L.ANNUAL_RATE);
      setText("estimate-monthly", L.money(estimate.monthly, 2));
      setText("estimate-amount", L.money(Number(form.amount.value) || 0, 2));
      setText("estimate-interest", L.money(estimate.interest, 2));
      setText("estimate-total", L.money(estimate.total, 2));
    }

    form.addEventListener("input", paintQuote);
    paintQuote();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
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
    if (!draft) {
      location.replace("apply.html");
      return;
    }
    const estimate = quoteFor(draft.amount, draft.termMonths, L.ANNUAL_RATE);
    setText("rev-amount", L.money(draft.amount, 2));
    setText("rev-term", draft.termMonths + " months");
    setText("rev-purpose", draft.purpose);
    setText("rev-employment", draft.employmentStatus);
    setText("rev-employer", draft.employer || "—");
    setText("rev-income", L.money(draft.monthlyIncome));
    setText("rev-debt", L.money(draft.existingDebt));
    setText("rev-monthly", L.money(estimate.monthly, 2));
    setText("rev-interest", L.money(estimate.interest, 2));
    setText("rev-total", L.money(estimate.total, 2));
    $("review-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const app = L.submitApplication(user.id);
      location.href = "application.html?id=" + encodeURIComponent(app.id);
    });
  }

  function renderApplication() {
    const user = requireUser();
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const requested = params.get("id");
    let app = requested ? L.application(requested) : L.latestApplication(user.id);
    if (app && app.userId !== user.id) app = null;
    show("application-empty", !app);
    show("application-has", !!app);
    if (!app) return;

    const estimate = quoteFor(app.amount, app.termMonths, app.rate);
    setText("app-title", "Application #" + app.id);
    setText("app-subtitle", "Submitted on " + formatDate(app.submittedAt, { month: "short", day: "numeric", year: "numeric" }));
    paintBadge("app-status", app.status);
    setText("sum-amount", L.money(app.amount, 2));
    setText("sum-term", app.termMonths + " months");
    setText("sum-purpose", app.purpose);
    setText("sum-payment", L.money(estimate.monthly, 2));
    paintBadge("sum-status", app.status);
    show("submitted-alert", app.status === "Pending");

    const timeline = $("timeline");
    clear(timeline);
    timeline.appendChild(step(true, false, "bi-check-lg", "Application submitted", formatWhen(app.submittedAt)));
    if (app.status === "Pending") {
      timeline.appendChild(step(false, true, "bi-hourglass-split", "Admin review", "An administrator is checking your details. You don't need to do anything right now. We'll show the decision here as soon as it's made."));
      timeline.appendChild(step(false, false, "bi-flag", "Decision", "You'll see here if your loan was approved or rejected, with the next steps."));
    } else {
      timeline.appendChild(step(true, false, "bi-check-lg", "Admin review", "Reviewed on " + formatWhen(app.decidedAt)));
      const approved = app.status === "Approved";
      timeline.appendChild(step(true, false, approved ? "bi-check-lg" : "bi-x-lg", approved ? "Approved" : "Not approved", app.note || (approved ? "Your loan was approved." : "Your loan was not approved.")));
    }

    const pending = app.status === "Pending";
    setText("outcome-heading", pending ? "Possible decisions" : "Decision");
    show("outcome-intro", pending);
    show("outcome-approved", pending || app.status === "Approved");
    show("outcome-rejected", pending || app.status === "Rejected");
    setText("outcome-approved-lead", "Congratulations! Your loan of " + L.money(app.amount, 2) + " was approved.");
    fillApprovedNext(estimate.monthly);
    setText("outcome-rejected-lead", app.status === "Rejected" && app.note ? app.note : "Your current debt is too high compared to your income for this amount.");
    setText("outcome-rejected-next", "Next step: try a smaller amount or a longer term, or apply again in 30 days.");
  }

  function step(done, current, icon, title, detail) {
    const item = el("li", done ? "done" : current ? "current" : "");
    const dot = el("span", "dot");
    dot.appendChild(el("i", "bi " + icon));
    item.append(dot, el("p", "fw-semibold mb-0", title), el("p", "small text-secondary mb-0", detail));
    return item;
  }

  function fillApprovedNext(payment) {
    const node = $("outcome-approved-next");
    if (!node) return;
    clear(node);
    node.appendChild(el("strong", null, "Next step: "));
    node.appendChild(document.createTextNode("you'll receive the funds and see the loan in "));
    const link = el("a", "alert-link", "My loans");
    link.href = "loans.html";
    node.appendChild(link);
    node.appendChild(document.createTextNode(". Your first payment of " + L.money(payment, 2) + " is due 30 days later."));
  }

  function renderAdmin() {
    const user = requireUser();
    if (!user) return;
    let query = "";
    let status = "All";

    function draw() {
      const stats = L.portfolio();
      setText("page-greeting", "Welcome back, " + user.firstName + ". Monitor lending activity and review new requests.");
      setText("stat-requests", String(stats.totalRequests));
      setText("stat-requests-note", "+" + stats.requestsThisMonth + " this month");
      setText("stat-pending", String(stats.pending));
      setText("stat-pending-note", stats.oldestLabel);
      setText("stat-volume", L.money(stats.approvedVolume));
      setText("stat-volume-note", stats.approvedLoans + " approved loans");
      setText("stat-borrowers", String(stats.activeBorrowers));
      setText("stat-borrowers-note", stats.newBorrowersThisMonth + " new this month");

      const body = $("queue-rows");
      clear(body);
      const needle = query.trim().toLowerCase();
      const rows = L.applications().filter((app) => {
        if (status !== "All" && app.status !== status) return false;
        if (!needle) return true;
        const person = L.user(app.userId);
        const name = person ? (person.firstName + " " + person.lastName).toLowerCase() : "";
        return name.includes(needle) || app.id.toLowerCase().includes(needle);
      });
      if (!rows.length) {
        body.appendChild(emptyRow(8, "No applications match."));
        return;
      }
      rows.forEach((app) => {
        const person = L.user(app.userId);
        const row = document.createElement("tr");
        const request = el("td");
        request.append(document.createTextNode(L.money(app.amount) + " "), el("span", "text-secondary small", "/ " + app.termMonths + " mo"));
        const actions = el("td");
        const wrap = el("div", "d-flex gap-1 justify-content-end");
        const view = el("a", "btn btn-sm btn-outline-secondary", "View");
        view.href = "admin-application.html?id=" + encodeURIComponent(app.id);
        wrap.appendChild(view);
        if (app.status === "Pending") {
          wrap.appendChild(iconButton("btn-success", "bi-check-lg", "Approve " + app.id, () => {
            L.decide(app.id, "Approved", "");
            draw();
          }));
          wrap.appendChild(iconButton("btn-danger", "bi-x-lg", "Reject " + app.id, () => {
            L.decide(app.id, "Rejected", "");
            draw();
          }));
        }
        actions.appendChild(wrap);
        row.append(
          el("td", "text-secondary", "#" + app.id),
          el("td", "fw-semibold", person ? person.firstName + " " + person.lastName : "Unknown"),
          request,
          el("td", null, L.money(app.monthlyIncome)),
          el("td", null, L.money(app.existingDebt)),
          el("td", "text-secondary", formatDate(app.submittedAt, { month: "short", day: "numeric" })),
          el("td"),
          actions
        );
        row.children[6].appendChild(badge(app.status, true));
        body.appendChild(row);
      });
    }

    const form = $("queue-form");
    form.addEventListener("submit", (event) => event.preventDefault());
    $("queue-search").addEventListener("input", (event) => {
      query = event.target.value;
      draw();
    });
    $("queue-status").addEventListener("change", (event) => {
      status = event.target.value;
      draw();
    });
    draw();
  }

  function iconButton(style, icon, label, onClick) {
    const button = el("button", "btn btn-sm " + style);
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.appendChild(el("i", "bi " + icon));
    button.addEventListener("click", onClick);
    return button;
  }

  function renderAdminApplication() {
    const user = requireUser();
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const app = L.application(params.get("id"));
    if (!app) {
      location.replace("admin.html");
      return;
    }
    const person = L.user(app.userId);
    const estimate = quoteFor(app.amount, app.termMonths, app.rate);
    const name = person ? person.firstName + " " + person.lastName : "Unknown";
    setText("crumb-current", "#" + app.id);
    setText("app-title", "Application #" + app.id);
    setText("app-subtitle", "Submitted by " + name + " on " + formatDate(app.submittedAt, { month: "short", day: "numeric", year: "numeric" }));
    paintBadge("app-status", app.status);
    show("decision-alert", app.status !== "Pending");
    setText("req-amount", L.money(app.amount, 2));
    setText("req-term", app.termMonths + " months");
    setText("req-payment", L.money(estimate.monthly, 2));
    setText("req-purpose", app.purpose);
    setText("person-name", name);
    setText("person-email", person ? person.email : "—");
    setText("person-employment", app.employmentStatus || "—");
    setText("person-since", person ? formatDate(person.customerSince, { month: "long", year: "numeric" }) : "—");
    setText("fin-income", L.money(app.monthlyIncome));
    setText("fin-expenses", L.money(app.monthlyExpenses));
    setText("fin-debt", L.money(app.existingDebt));

    const lenders = $("lender-rows");
    clear(lenders);
    const loans = L.activeLoansOf(app.userId);
    if (!loans.length) {
      lenders.appendChild(emptyRow(4, "No active loans."));
    } else {
      loans.forEach((item) => {
        const row = document.createElement("tr");
        row.append(el("td", "fw-semibold", item.lender), el("td", null, L.money(item.balance)), el("td", null, rate(item.rate)), el("td"));
        row.lastChild.appendChild(badge(item.status, true));
        lenders.appendChild(row);
      });
    }

    const ratio = app.monthlyIncome ? app.existingDebt / app.monthlyIncome : 0;
    setText("dti", app.monthlyIncome ? ratio.toFixed(1) + "x monthly income" : "n/a");

    const form = $("decision-form");
    const note = $("note");
    note.value = app.note || "";
    const locked = app.status !== "Pending";
    note.disabled = locked;
    form.querySelectorAll("button").forEach((button) => {
      button.disabled = locked;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (locked || !event.submitter) return;
      L.decide(app.id, event.submitter.value === "approved" ? "Approved" : "Rejected", note.value);
      location.href = "admin-application.html?id=" + encodeURIComponent(app.id);
    });
  }

  function renderBorrowers() {
    const user = requireUser();
    if (!user) return;
    let query = "";
    let status = "All";
    const all = L.borrowers();
    setText("borrower-count", L.portfolio().activeBorrowers + " active borrowers");

    function draw() {
      const needle = query.trim().toLowerCase();
      const rows = all.filter((item) => {
        if (status !== "All" && item.status !== status) return false;
        if (!needle) return true;
        const name = (item.user.firstName + " " + item.user.lastName + " " + item.user.email).toLowerCase();
        return name.includes(needle);
      });
      setText("borrower-shown", "Showing " + rows.length + " of " + all.length);
      const body = $("borrower-rows");
      clear(body);
      if (!rows.length) {
        body.appendChild(emptyRow(7, "No borrowers match."));
        return;
      }
      rows.forEach((item) => {
        const row = document.createElement("tr");
        const who = el("td");
        who.append(el("span", "fw-semibold d-block", item.user.firstName + " " + item.user.lastName), el("span", "small text-secondary", item.user.email));
        const profile = el("td", "text-end");
        if (item.latestApplicationId) {
          const link = el("a", "btn btn-sm btn-outline-secondary", "View profile");
          link.href = "admin-application.html?id=" + encodeURIComponent(item.latestApplicationId);
          profile.appendChild(link);
        } else {
          profile.appendChild(el("span", "small text-secondary", "No application"));
        }
        row.append(
          who,
          el("td", null, String(item.loanCount)),
          el("td", null, L.money(item.debt)),
          el("td", null, L.money(item.monthlyIncome)),
          el("td", "text-secondary", formatDate(item.user.customerSince, { month: "short", year: "numeric" })),
          el("td"),
          profile
        );
        row.children[5].appendChild(badge(item.status, false));
        body.appendChild(row);
      });
    }

    const form = $("borrower-form");
    form.addEventListener("submit", (event) => event.preventDefault());
    $("borrower-search").addEventListener("input", (event) => {
      query = event.target.value;
      draw();
    });
    $("borrower-status").addEventListener("change", (event) => {
      status = event.target.value;
      draw();
    });
    draw();
  }
})();
