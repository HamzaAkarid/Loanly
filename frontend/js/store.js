/* Client-side JSON database. There is no server.
   The whole document lives in localStorage under "loanly.db".
   Passwords are plain text because this demo never leaves the browser.
   Bump VERSION when the seed shape changes so old browser data is replaced. */
(function () {
  const KEY = "loanly.db";
  const VERSION = 1;
  const ANNUAL_RATE = 12;
  const DEMO_PASSWORD = "loanly123";

  let db = null;

  function createSeed() {
    return {
      version: VERSION,
      sessionUserId: null,
      nextUser: 1,
      nextLoan: 1,
      nextTx: 1,
      nextApplication: 1043,
      drafts: {},
      portfolio: {
        totalRequests: 128,
        requestsThisMonth: 14,
        approvedVolume: 412500,
        approvedLoans: 86,
        activeBorrowers: 74,
        newBorrowersThisMonth: 12,
      },
      users: [
        user("u-alex", "client", "Alex", "Johnson", "alex.johnson@example.com", "Employed full time", "Northwind Traders", "2025-03-12", "up_to_date", 4800),
        user("u-taylor", "client", "Taylor", "Kim", "taylor.kim@example.com", "Employed full time", "Contoso", "2026-11-24", "up_to_date", 5500),
        user("u-riley", "client", "Riley", "Diaz", "riley.diaz@example.com", "Employed full time", "Fabrikam", "2026-11-22", "up_to_date", 4100),
        user("u-jamie", "client", "Jamie", "Chen", "jamie.chen@example.com", "Employed full time", "Adventure Works", "2025-01-10", "up_to_date", 6800),
        user("u-chris", "client", "Chris", "Patel", "chris.patel@example.com", "Employed full time", "Litware", "2025-06-03", "late", 2900),
        user("u-sam", "client", "Sam", "Rivera", "sam.rivera@example.com", "Self-employed", "", "2024-08-15", "up_to_date", 2100),
        user("u-jordan", "client", "Jordan", "Park", "jordan.park@example.com", "Employed full time", "Wide World Importers", "2024-09-01", "up_to_date", 6200),
        user("u-casey", "client", "Casey", "Brooks", "casey.brooks@example.com", "Employed part time", "Coho Winery", "2025-02-01", "up_to_date", 3000),
        user("u-morgan", "admin", "Morgan", "Lee", "morgan.lee@example.com", "", "", "2024-01-08", "up_to_date", 0),
      ],
      loans: [
        loan("l-nw", "u-alex", "Northwind Bank", 12000, 8.5, 36, 7840, "Active"),
        loan("l-cc", "u-alex", "Contoso Credit Union", 4500, 11, 24, 2310, "Active"),
        loan("l-wg", "u-alex", "Woodgrove Bank", 7500, 9.2, 24, 7500, "Approved"),
        loan("l-fa", "u-alex", "Fabrikam Auto Finance", 9000, 6.9, 48, 0, "Paid off"),
        loan("l-ts", "u-alex", "Tailspin Lending", 3000, 15.5, 12, 0, "Rejected"),
        loan("l-tk", "u-taylor", "LOANLY", 8000, 12, 24, 8000, "Active", "LN-1039"),
        loan("l-rd", "u-riley", "LOANLY", 6000, 12, 24, 6000, "Active", "LN-1037"),
        loan("l-jc1", "u-jamie", "Adventure Works Bank", 8000, 7.4, 36, 8000, "Active"),
        loan("l-jc2", "u-jamie", "Wide World Finance", 6300, 9.1, 24, 6300, "Active"),
        loan("l-cp", "u-chris", "Litware Lending", 3200, 13, 18, 3200, "Active"),
        loan("l-sr1", "u-sam", "City Mutual", 4200, 10.5, 24, 4200, "Active"),
        loan("l-sr2", "u-sam", "Harbor Finance", 2700, 12.4, 18, 2700, "Active"),
        loan("l-sr3", "u-sam", "Pioneer Bank", 2000, 11.2, 12, 2000, "Active"),
        loan("l-jp", "u-jordan", "Alpine Credit", 4300, 9.8, 24, 4300, "Active"),
        loan("l-cb", "u-casey", "Coho Bank", 22000, 14.2, 48, 22000, "Active"),
      ],
      applications: [
        application("LN-1042", "u-alex", 5000, 12, "Debt consolidation", "Employed full time", "Northwind Traders", 4800, 10150, 3170, "Pending", "", "2026-11-26T10:42:00"),
        application("LN-1041", "u-jordan", 15000, 36, "Home improvement", "Employed full time", "Wide World Importers", 6200, 4300, 0, "Pending", "", "2026-11-25T14:10:00"),
        application("LN-1040", "u-sam", 2500, 6, "Car", "Self-employed", "", 2100, 8900, 0, "Pending", "", "2026-11-25T09:05:00"),
        application("LN-1039", "u-taylor", 8000, 24, "Education", "Employed full time", "Contoso", 5500, 1200, 0, "Approved", "Approved. Funds are on the way.", "2026-11-24T16:20:00", "2026-11-24T18:05:00"),
        application("LN-1038", "u-casey", 20000, 48, "Medical", "Employed part time", "Coho Winery", 3000, 22000, 0, "Rejected", "Your current debt is too high compared to your income for this amount.", "2026-11-23T11:00:00", "2026-11-23T15:40:00"),
        application("LN-1037", "u-riley", 6000, 24, "Car", "Employed full time", "Fabrikam", 4100, 2750, 0, "Approved", "Approved. Funds are on the way.", "2026-11-22T15:30:00", "2026-11-22T17:10:00"),
      ],
      transactions: [
        tx("t1", "u-alex", "income", "Salary", "Salary", 4000, "2026-11-25"),
        tx("t2", "u-alex", "income", "Freelance project", "Freelance", 800, "2026-11-22"),
        tx("t3", "u-alex", "expense", "Rent", "Housing", 1200, "2026-11-20"),
        tx("t4", "u-alex", "expense", "Northwind Bank payment", "Loan payments", 380, "2026-11-18"),
        tx("t5", "u-alex", "expense", "Groceries", "Food", 260, "2026-11-15"),
        tx("t6", "u-alex", "expense", "Gas", "Transport", 90, "2026-11-12"),
        tx("t7", "u-alex", "expense", "Contoso Credit Union payment", "Loan payments", 200, "2026-11-10"),
        tx("t8", "u-alex", "expense", "Dining out", "Food", 260, "2026-11-08"),
        tx("t9", "u-alex", "expense", "Transit pass", "Transport", 220, "2026-11-06"),
        tx("t10", "u-alex", "expense", "Utilities", "Other", 560, "2026-11-04"),
      ],
    };
  }

  function user(id, role, firstName, lastName, email, employmentStatus, employer, customerSince, paymentStatus, monthlyIncome) {
    return {
      id, role, firstName, lastName, email,
      password: DEMO_PASSWORD,
      employmentStatus, employer, customerSince, paymentStatus, monthlyIncome,
    };
  }

  function loan(id, userId, lender, amount, rate, termMonths, balance, status, applicationId) {
    return { id, userId, lender, amount, rate, termMonths, balance, status, applicationId: applicationId || null };
  }

  function application(id, userId, amount, termMonths, purpose, employmentStatus, employer, monthlyIncome, existingDebt, monthlyExpenses, status, note, submittedAt, decidedAt) {
    return {
      id, userId, amount, termMonths, purpose, rate: ANNUAL_RATE,
      employmentStatus, employer, monthlyIncome, existingDebt, monthlyExpenses,
      status, note, submittedAt, decidedAt: decidedAt || null,
    };
  }

  function tx(id, userId, type, description, category, amount, date) {
    return { id, userId, type, description, category, amount, date };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION) {
          db = parsed;
          return;
        }
      }
    } catch (err) {
      /* replace a broken document with the seed */
    }
    db = createSeed();
    save();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function findUser(id) {
    return db.users.find((item) => item.id === id) || null;
  }

  function publicUser(person) {
    if (!person) return null;
    const copy = Object.assign({}, person);
    delete copy.password;
    return copy;
  }

  function sum(list, pick) {
    return list.reduce((total, item) => total + pick(item), 0);
  }

  function money(value, digits) {
    const n = Number(value) || 0;
    const whole = Math.abs(n - Math.round(n)) < 0.005;
    const places = digits == null ? (whole ? 0 : 2) : digits;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    }).format(n);
  }

  function quote(amount, months, annualRate) {
    const principal = Number(amount) || 0;
    const term = Number(months) || 0;
    const rate = annualRate == null ? ANNUAL_RATE : Number(annualRate);
    if (principal <= 0 || term <= 0) {
      return { monthly: 0, total: 0, interest: 0, rate };
    }
    const r = rate / 100 / 12;
    const monthly = r === 0 ? principal / term : (principal * r) / (1 - Math.pow(1 + r, -term));
    const total = monthly * term;
    return { monthly, total, interest: Math.max(total - principal, 0), rate };
  }

  function activeLoans(userId) {
    return db.loans.filter((item) => item.userId === userId && item.status === "Active");
  }

  function activeDebt(userId) {
    return sum(activeLoans(userId), (item) => item.balance);
  }

  function inSameMonth(dateString, ref) {
    const date = new Date(dateString + "T00:00:00");
    return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
  }

  function monthTransactions(userId, ref) {
    const when = ref || new Date();
    return db.transactions.filter((item) => item.userId === userId && inSameMonth(item.date, when));
  }

  function totalsFor(userId) {
    const rows = monthTransactions(userId);
    const incomeRows = rows.filter((item) => item.type === "income");
    const person = findUser(userId);
    return {
      income: incomeRows.length ? sum(incomeRows, (item) => item.amount) : (person && person.monthlyIncome) || 0,
      expenses: sum(rows.filter((item) => item.type === "expense"), (item) => item.amount),
    };
  }

  function expensesByCategory(userId) {
    const totals = new Map();
    monthTransactions(userId).forEach((item) => {
      if (item.type !== "expense") return;
      totals.set(item.category, (totals.get(item.category) || 0) + item.amount);
    });
    const order = ["Housing", "Loan payments", "Food", "Transport", "Other"];
    return Array.from(totals.entries()).sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }

  function entriesFor(userId) {
    const loans = db.loans.filter((item) => item.userId === userId).map((item) => ({
      lender: item.lender,
      amount: item.amount,
      rate: item.rate,
      termMonths: item.termMonths,
      balance: item.status === "Rejected" ? null : item.balance,
      status: item.status,
    }));
    const apps = db.applications
      .filter((item) => item.userId === userId && (item.status === "Pending" || item.status === "Rejected"))
      .map((item) => ({
        lender: "LOANLY",
        amount: item.amount,
        rate: item.rate,
        termMonths: item.termMonths,
        balance: null,
        status: item.status,
      }));
    const order = { Active: 0, Approved: 1, "Paid off": 2, Pending: 3, Rejected: 4 };
    return loans.concat(apps).sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }

  function applicationsSorted() {
    return db.applications.slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  function borrowerView(person) {
    const pending = db.applications.some((item) => item.userId === person.id && item.status === "Pending");
    let status = "Up to date";
    if (pending) status = "Pending application";
    else if (person.paymentStatus === "late") status = "Payment late";
    const loans = activeLoans(person.id);
    const latest = applicationsSorted().find((item) => item.userId === person.id);
    return {
      user: publicUser(person),
      loanCount: loans.length,
      debt: sum(loans, (item) => item.balance),
      monthlyIncome: totalsFor(person.id).income,
      status,
      latestApplicationId: latest ? latest.id : null,
    };
  }

  load();

  window.Loanly = {
    DEMO_PASSWORD,
    ANNUAL_RATE,
    money,
    quote,

    currentUser() {
      return publicUser(findUser(db.sessionUserId));
    },

    login(email, password) {
      const key = String(email || "").trim().toLowerCase();
      const person = db.users.find((item) => item.email.toLowerCase() === key && item.password === password);
      if (!person) return null;
      db.sessionUserId = person.id;
      save();
      return publicUser(person);
    },

    logout() {
      db.sessionUserId = null;
      save();
    },

    register(input) {
      const email = String(input.email || "").trim().toLowerCase();
      if (db.users.some((item) => item.email.toLowerCase() === email)) {
        return { error: "An account with that email already exists." };
      }
      const person = {
        id: "u-" + db.nextUser,
        role: "client",
        firstName: String(input.firstName || "").trim(),
        lastName: String(input.lastName || "").trim(),
        email,
        password: input.password,
        employmentStatus: "",
        employer: "",
        customerSince: new Date().toISOString().slice(0, 10),
        paymentStatus: "up_to_date",
        monthlyIncome: 0,
      };
      db.nextUser += 1;
      db.users.push(person);
      db.portfolio.activeBorrowers += 1;
      db.portfolio.newBorrowersThisMonth += 1;
      db.sessionUserId = person.id;
      save();
      return { user: publicUser(person) };
    },

    reset() {
      db = createSeed();
      save();
    },

    activeDebt,
    totals: totalsFor,
    expensesByCategory,

    transactions(userId) {
      return db.transactions
        .filter((item) => item.userId === userId)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1));
    },

    addTransaction(userId, input) {
      const row = {
        id: "t-" + db.nextTx,
        userId,
        type: input.type === "expense" ? "expense" : "income",
        description: String(input.description || "").trim(),
        category: input.category,
        amount: Number(input.amount) || 0,
        date: input.date,
      };
      db.nextTx += 1;
      db.transactions.push(row);
      if (row.type === "income") {
        const person = findUser(userId);
        const incomeRows = monthTransactions(userId).filter((item) => item.type === "income");
        if (person) person.monthlyIncome = sum(incomeRows, (item) => item.amount);
      }
      save();
      return row;
    },

    entries: entriesFor,

    draft(userId) {
      return db.drafts[userId] ? Object.assign({}, db.drafts[userId]) : null;
    },

    saveDraft(userId, draft) {
      db.drafts[userId] = {
        amount: Number(draft.amount) || 0,
        termMonths: Number(draft.termMonths) || 0,
        purpose: draft.purpose,
        employmentStatus: draft.employmentStatus,
        employer: String(draft.employer || "").trim(),
        monthlyIncome: Number(draft.monthlyIncome) || 0,
        existingDebt: Number(draft.existingDebt) || 0,
      };
      save();
      return db.drafts[userId];
    },

    submitApplication(userId) {
      const draft = db.drafts[userId];
      const person = findUser(userId);
      if (!draft || !person) return null;
      const expenses = totalsFor(userId).expenses;
      const app = {
        id: "LN-" + db.nextApplication,
        userId,
        amount: draft.amount,
        termMonths: draft.termMonths,
        purpose: draft.purpose,
        rate: ANNUAL_RATE,
        employmentStatus: draft.employmentStatus,
        employer: draft.employer,
        monthlyIncome: draft.monthlyIncome,
        existingDebt: draft.existingDebt,
        monthlyExpenses: expenses,
        status: "Pending",
        note: "",
        submittedAt: new Date().toISOString(),
        decidedAt: null,
      };
      db.nextApplication += 1;
      db.applications.push(app);
      delete db.drafts[userId];
      person.employmentStatus = draft.employmentStatus;
      person.employer = draft.employer;
      person.monthlyIncome = draft.monthlyIncome;
      db.portfolio.totalRequests += 1;
      db.portfolio.requestsThisMonth += 1;
      save();
      return app;
    },

    application(id) {
      return db.applications.find((item) => item.id === id) || null;
    },

    latestApplication(userId) {
      return applicationsSorted().find((item) => item.userId === userId) || null;
    },

    applications() {
      return applicationsSorted();
    },

    user(id) {
      return publicUser(findUser(id));
    },

    decide(id, status, note) {
      const app = db.applications.find((item) => item.id === id);
      if (!app || app.status !== "Pending") return app || null;
      if (status !== "Approved" && status !== "Rejected") return app;
      app.status = status;
      app.note = String(note || "").trim();
      app.decidedAt = new Date().toISOString();
      if (status === "Approved" && !db.loans.some((item) => item.applicationId === app.id)) {
        db.loans.push({
          id: "l-" + db.nextLoan,
          userId: app.userId,
          lender: "LOANLY",
          amount: app.amount,
          rate: app.rate,
          termMonths: app.termMonths,
          balance: app.amount,
          status: "Approved",
          applicationId: app.id,
        });
        db.nextLoan += 1;
        db.portfolio.approvedVolume += app.amount;
        db.portfolio.approvedLoans += 1;
      }
      save();
      return app;
    },

    portfolio() {
      const pending = db.applications.filter((item) => item.status === "Pending");
      const oldest = pending.map((item) => item.submittedAt).sort()[0];
      let oldestLabel = "None waiting";
      if (oldest) {
        const days = Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000);
        oldestLabel = days <= 0 ? "Oldest: today" : days === 1 ? "Oldest: 1 day" : "Oldest: " + days + " days";
      }
      return {
        totalRequests: db.portfolio.totalRequests,
        requestsThisMonth: db.portfolio.requestsThisMonth,
        pending: pending.length,
        oldestLabel,
        approvedVolume: db.portfolio.approvedVolume,
        approvedLoans: db.portfolio.approvedLoans,
        activeBorrowers: db.portfolio.activeBorrowers,
        newBorrowersThisMonth: db.portfolio.newBorrowersThisMonth,
      };
    },

    borrowers() {
      return db.users.filter((item) => item.role === "client").map(borrowerView);
    },

    activeLoansOf(userId) {
      return activeLoans(userId);
    },
  };
})();
