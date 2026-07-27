const STORAGE_KEY = 'financeiro-pwa.transactions.v1';

const form = document.getElementById('transactionForm');
const transactionsEl = document.getElementById('transactions');
const emptyStateEl = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const saldoEl = document.getElementById('saldo');
const receitasEl = document.getElementById('receitas');
const despesasEl = document.getElementById('despesas');
const installBtn = document.getElementById('installBtn');

const amountInput = document.getElementById('amount');
const descriptionInput = document.getElementById('description');
const typeInput = document.getElementById('type');
const dateInput = document.getElementById('date');

let deferredPrompt = null;

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getTotals(transactions) {
  return transactions.reduce((acc, tx) => {
    const value = Number(tx.amount) || 0;
    if (tx.type === 'income') acc.income += value;
    if (tx.type === 'expense') acc.expense += value;
    return acc;
  }, { income: 0, expense: 0 });
}

function render() {
  const transactions = loadTransactions().sort((a, b) => new Date(b.date) - new Date(a.date));
  const totals = getTotals(transactions);
  const balance = totals.income - totals.expense;

  saldoEl.textContent = formatCurrency(balance);
  receitasEl.textContent = formatCurrency(totals.income);
  despesasEl.textContent = formatCurrency(totals.expense);

  transactionsEl.innerHTML = '';

  emptyStateEl.classList.toggle('hidden', transactions.length !== 0);

  for (const tx of transactions) {
    const li = document.createElement('li');
    li.className = 'transaction';

    const icon = tx.type === 'income' ? '+' : '−';
    const amountClass = tx.type === 'income' ? 'income' : 'expense';
    const signedAmount = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);

    li.innerHTML = `
      <div class="row">
        <div class="icon">${icon}</div>
        <div class="meta">
          <span class="title">${escapeHtml(tx.description)}</span>
          <span class="date">${formatDate(tx.date)}</span>
        </div>
      </div>
      <div class="amount ${amountClass}">${formatCurrency(signedAmount)}</div>
    `;

    transactionsEl.appendChild(li);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function addTransaction({ type, description, amount, date }) {
  const transactions = loadTransactions();
  transactions.push({
    id: crypto.randomUUID(),
    type,
    description: description.trim(),
    amount: Number(amount),
    date
  });
  saveTransactions(transactions);
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const type = typeInput.value;
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!description || !amount || !date) return;

  addTransaction({ type, description, amount, date });
  form.reset();
  typeInput.value = 'income';
  dateInput.valueAsDate = new Date();
  descriptionInput.focus();
});

clearBtn.addEventListener('click', () => {
  if (confirm('Deseja apagar todos os lançamentos?')) {
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

dateInput.valueAsDate = new Date();
render();
