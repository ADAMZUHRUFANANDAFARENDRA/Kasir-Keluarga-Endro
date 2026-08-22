// ================= 1. DATA AWAL (DEFAULT PRODUK) =================
const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Dimsum ori 3pcs', category: 'Makanan', price: 10000, hpp: 6000 },
  { id: '2', name: 'Dimsum mentai 3pcs', category: 'Makanan', price: 14000, hpp: 8500 },
  { id: '3', name: 'Milo lava ukuran sedang', category: 'Minuman', price: 10000, hpp: 6000 },
  { id: '4', name: 'Milo lava ukuran jumbo', category: 'Minuman', price: 15000, hpp: 9000 },
  { id: '5', name: 'Good day lava ukuran sedang', category: 'Minuman', price: 10000, hpp: 6000 },
  { id: '6', name: 'Good day lava cappucino', category: 'Minuman', price: 15000, hpp: 9000 },
  { id: '7', name: 'Es teh dengan ukuran kecil', category: 'Minuman', price: 3000, hpp: 1500 },
  { id: '8', name: 'Es teh dengan ukuran jumbo', category: 'Minuman', price: 5000, hpp: 2500 }
];

// Inisialisasi State dari LocalStorage
let products = JSON.parse(localStorage.getItem('kasir_products')) || DEFAULT_PRODUCTS;
let cart = [];
let transactions = JSON.parse(localStorage.getItem('kasir_transactions')) || [];
let notifications = JSON.parse(localStorage.getItem('kasir_notifications')) || [];
let currentCategoryFilter = 'all';

// Helper format Rupiah
const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

// Helper Waktu Lokal
const getFormattedDateTime = () => {
  const d = new Date();
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// Simpan data ke LocalStorage
function saveState() {
  localStorage.setItem('kasir_products', JSON.stringify(products));
  localStorage.setItem('kasir_transactions', JSON.stringify(transactions));
  localStorage.setItem('kasir_notifications', JSON.stringify(notifications));
}

// ================= 2. SISTEM NOTIFIKASI & LOG =================
function addNotification(message) {
  const notif = {
    id: Date.now(),
    message: message,
    time: getFormattedDateTime()
  };
  notifications.unshift(notif);
  if (notifications.length > 50) notifications.pop(); // Batasi 50 notif terbaru
  saveState();
  renderNotifications();
  showToast(message);
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  badge.innerText = notifications.length;

  if (notifications.length === 0) {
    list.innerHTML = '<p class="text-muted" style="text-align:center; padding:2rem 0;">Belum ada notifikasi aktivitas.</p>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notif-item">
      <div>${n.message}</div>
      <span class="time">🕒 ${n.time}</span>
    </div>
  `).join('');
}

// ================= 3. RENDER PRODUK & KASIR (POS) =================
function renderProducts() {
  const grid = document.getElementById('productGrid');
  const filtered = currentCategoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === currentCategoryFilter);

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="text-muted">Tidak ada produk dalam kategori ini.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="addToCart('${p.id}')">
      <span class="product-tag">${p.category}</span>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${formatRupiah(p.price)}</div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
}

function updateCartQty(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += change;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }

  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const btnCheckout = document.getElementById('btnOpenPayment');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-cart-msg">Keranjang masih kosong</p>';
    subtotalEl.innerText = formatRupiah(0);
    totalEl.innerText = formatRupiah(0);
    btnCheckout.disabled = true;
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatRupiah(item.price)} × ${item.qty}</div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="updateCartQty('${item.id}', -1)">-</button>
          <span><b>${item.qty}</b></span>
          <button class="btn-qty" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  subtotalEl.innerText = formatRupiah(total);
  totalEl.innerText = formatRupiah(total);
  btnCheckout.disabled = false;
}

// ================= 4. MANAJEMEN MENU & HPP =================
function renderMenuTable() {
  const tbody = document.getElementById('menuTableBody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><b>${p.name}</b></td>
      <td>${p.category}</td>
      <td>${formatRupiah(p.price)}</td>
      <td>${formatRupiah(p.hpp)}</td>
      <td>
        <button class="btn-chip" onclick="editMenu('${p.id}')">✏️ Edit</button>
        <button class="btn-chip" style="color:var(--danger);" onclick="deleteMenu('${p.id}')">🗑️ Hapus</button>
      </td>
    </tr>
  `).join('');
}

function renderHppAnalysis() {
  const tbody = document.getElementById('hppTableBody');
  
  // Hitung Laba/Rugi Analisis per Produk
  tbody.innerHTML = products.map(p => {
    const profit = p.price - p.hpp;
    const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : 0;
    const isProfit = profit >= 0;

    return `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${formatRupiah(p.price)}</td>
        <td>${formatRupiah(p.hpp)}</td>
        <td style="color:${isProfit ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">
          ${formatRupiah(profit)}
        </td>
        <td><b>${margin}%</b></td>
        <td>
          <span style="padding:3px 8px; border-radius:4px; font-size:0.75rem; background:${isProfit ? '#dcfce7' : '#fee2e2'}; color:${isProfit ? '#166534' : '#991b1b'};">
            ${isProfit ? 'Untung' : 'Rugi'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  // Hitung Ringkasan Dashboard dari Riwayat Transaksi
  let totalRevenue = 0;
  let totalHpp = 0;

  transactions.forEach(t => {
    totalRevenue += t.total;
    totalHpp += t.totalHpp;
  });

  const totalProfit = totalRevenue - totalHpp;

  document.getElementById('statTotalRevenue').innerText = formatRupiah(totalRevenue);
  document.getElementById('statTotalHpp').innerText = formatRupiah(totalHpp);
  document.getElementById('statTotalProfit').innerText = formatRupiah(totalProfit);
}

function handleSaveMenu(e) {
  e.preventDefault();
  const id = document.getElementById('menuId').value;
  const name = document.getElementById('menuName').value.trim();
  const category = document.getElementById('menuCategory').value;
  const price = parseInt(document.getElementById('menuPrice').value) || 0;
  const hpp = parseInt(document.getElementById('menuHpp').value) || 0;

  if (id) {
    // Mode Update
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { id, name, category, price, hpp };
      addNotification(`Menu "${name}" berhasil diperbarui.`);
    }
  } else {
    // Mode Tambah Baru
    const newProduct = {
      id: Date.now().toString(),
      name,
      category,
      price,
      hpp
    };
    products.push(newProduct);
    addNotification(`Menu baru "${name}" berhasil ditambahkan.`);
  }

  saveState();
  resetMenuForm();
  renderProducts();
  renderMenuTable();
  renderHppAnalysis();
}

function editMenu(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('menuId').value = p.id;
  document.getElementById('menuName').value = p.name;
  document.getElementById('menuCategory').value = p.category;
  document.getElementById('menuPrice').value = p.price;
  document.getElementById('menuHpp').value = p.hpp;

  document.getElementById('menuFormTitle').innerText = '✏️ Edit Menu';
  document.getElementById('btnCancelEdit').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteMenu(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  if (confirm(`Yakin ingin menghapus menu "${p.name}"?`)) {
    products = products.filter(prod => prod.id !== id);
    saveState();
    addNotification(`Menu "${p.name}" telah dihapus.`);
    renderProducts();
    renderMenuTable();
    renderHppAnalysis();
  }
}

function resetMenuForm() {
  document.getElementById('menuForm').reset();
  document.getElementById('menuId').value = '';
  document.getElementById('menuFormTitle').innerText = '➕ Tambah Menu Baru';
  document.getElementById('btnCancelEdit').style.display = 'none';
}

// ================= 5. SISTEM PEMBAYARAN & STRUK =================
function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function getCartTotalHpp() {
  return cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);
}

function openPaymentModal() {
  if (cart.length === 0) return;
  const total = getCartTotal();
  
  document.getElementById('modalTotalPay').innerText = formatRupiah(total);
  document.getElementById('qrisNominal').innerText = formatRupiah(total);
  document.getElementById('cashReceived').value = '';
  document.getElementById('cashChange').innerText = formatRupiah(0);

  // Buat tombol pecahan uang cepat
  const quickBox = document.getElementById('quickCashContainer');
  const suggestions = [total, 10000, 20000, 50000, 100000].filter(v => v >= total);
  const uniqueSuggestions = [...new Set(suggestions)].sort((a, b) => a - b);

  quickBox.innerHTML = uniqueSuggestions.map(val => `
    <button type="button" class="btn-chip" onclick="setCashReceived(${val})">${formatRupiah(val)}</button>
  `).join('');

  document.getElementById('paymentModal').classList.add('show');
}

function setCashReceived(val) {
  document.getElementById('cashReceived').value = val;
  calculateChange();
}

function calculateChange() {
  const total = getCartTotal();
  const received = parseInt(document.getElementById('cashReceived').value) || 0;
  const change = received - total;

  const changeEl = document.getElementById('cashChange');
  if (change >= 0) {
    changeEl.innerText = formatRupiah(change);
    changeEl.style.color = '#166534';
  } else {
    changeEl.innerText = `Kurang ${formatRupiah(Math.abs(change))}`;
    changeEl.style.color = '#dc2626';
  }
}

function processPayment() {
  const total = getCartTotal();
  const totalHpp = getCartTotalHpp();
  const method = document.querySelector('input[name="payMethod"]:checked').value;
  let received = total;
  let change = 0;

  if (method === 'CASH') {
    received = parseInt(document.getElementById('cashReceived').value) || 0;
    if (received < total) {
      alert('Nominal uang yang diterima kurang dari total belanja!');
      return;
    }
    change = received - total;
  }

  // Buat Rekaman Transaksi
  const transaction = {
    invoiceNo: 'INV-' + Date.now().toString().slice(-6),
    dateTime: getFormattedDateTime(),
    items: [...cart],
    total: total,
    totalHpp: totalHpp,
    profit: total - totalHpp,
    method: method,
    received: received,
    change: change
  };

  transactions.unshift(transaction);
  saveState();

  addNotification(`Transaksi berhasil (${transaction.invoiceNo}) - Total: ${formatRupiah(total)} [${method}]`);

  // Tutup Modal Bayar & Buka Struk
  document.getElementById('paymentModal').classList.remove('show');
  showReceipt(transaction);

  // Bersihkan Keranjang
  cart = [];
  renderCart();
  renderHppAnalysis();
  renderHistoryTable();
}

function showReceipt(trx) {
  document.getElementById('receiptInfo').innerHTML = `
    <div class="receipt-row"><span>No. Transaksi</span><span>${trx.invoiceNo}</span></div>
    <div class="receipt-row"><span>Waktu</span><span>${trx.dateTime}</span></div>
    <div class="receipt-row"><span>Metode</span><span>${trx.method}</span></div>
  `;

  document.getElementById('receiptItems').innerHTML = trx.items.map(i => `
    <div class="receipt-row">
      <span>${i.name} x${i.qty}</span>
      <span>${formatRupiah(i.price * i.qty)}</span>
    </div>
  `).join('');

  document.getElementById('receiptCalc').innerHTML = `
    <div class="receipt-row"><b>TOTAL</b><b>${formatRupiah(trx.total)}</b></div>
    <div class="receipt-row"><span>Bayar (${trx.method})</span><span>${formatRupiah(trx.received)}</span></div>
    <div class="receipt-row"><span>Kembalian</span><span>${formatRupiah(trx.change)}</span></div>
  `;

  document.getElementById('receiptModal').classList.add('show');
}

// ================= 6. RIWAYAT TRANSAKSI =================
function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada riwayat transaksi.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const itemSummary = t.items.map(i => `${i.name} (${i.qty})`).join(', ');
    return `
      <tr>
        <td><b>${t.invoiceNo}</b></td>
        <td>${t.dateTime}</td>
        <td>${itemSummary}</td>
        <td><span class="product-tag">${t.method}</span></td>
        <td><b>${formatRupiah(t.total)}</b></td>
        <td style="color:var(--success); font-weight:bold;">${formatRupiah(t.profit)}</td>
      </tr>
    `;
  }).join('');
}

// ================= 7. EVENT LISTENERS =================
document.addEventListener('DOMContentLoaded', () => {
  // Render Data Awal
  renderProducts();
  renderCart();
  renderMenuTable();
  renderHppAnalysis();
  renderNotifications();
  renderHistoryTable();

  // Tab Navigasi
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');

      if (tab.dataset.target === 'tabHpp') renderHppAnalysis();
      if (tab.dataset.target === 'tabLaporan') renderHistoryTable();
    });
  });

  // Filter Kategori Kasir
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.dataset.cat;
      renderProducts();
    });
  });

  // Form Menu
  document.getElementById('menuForm').addEventListener('submit', handleSaveMenu);
  document.getElementById('btnCancelEdit').addEventListener('click', resetMenuForm);

  // Cart & Pembayaran
  document.getElementById('btnClearCart').addEventListener('click', () => {
    if (cart.length > 0 && confirm('Kosongkan keranjang?')) {
      cart = [];
      renderCart();
    }
  });

  document.getElementById('btnOpenPayment').addEventListener('click', openPaymentModal);
  document.getElementById('btnClosePaymentModal').addEventListener('click', () => {
    document.getElementById('paymentModal').classList.remove('show');
  });

  // Switch Metode Pembayaran
  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'CASH') {
        document.getElementById('cashPaymentSection').style.display = 'block';
        document.getElementById('qrisPaymentSection').style.display = 'none';
      } else {
        document.getElementById('cashPaymentSection').style.display = 'none';
        document.getElementById('qrisPaymentSection').style.display = 'block';
      }
    });
  });

  document.getElementById('cashReceived').addEventListener('input', calculateChange);
  document.getElementById('btnProcessPayment').addEventListener('click', processPayment);
  document.getElementById('btnCloseReceipt').addEventListener('click', () => {
    document.getElementById('receiptModal').classList.remove('show');
  });

  // Notifikasi Drawer
  const notifPanel = document.getElementById('notifPanel');
  document.getElementById('btnToggleNotif').addEventListener('click', () => notifPanel.classList.add('open'));
  document.getElementById('btnCloseNotif').addEventListener('click', () => notifPanel.classList.remove('open'));
  document.getElementById('btnClearNotif').addEventListener('click', () => {
    notifications = [];
    saveState();
    renderNotifications();
  });

  // Hapus Riwayat Transaksi
  document.getElementById('btnClearHistory').addEventListener('click', () => {
    if (confirm('Hapus seluruh riwayat transaksi?')) {
      transactions = [];
      saveState();
      renderHistoryTable();
      renderHppAnalysis();
      addNotification('Semua riwayat transaksi telah dibersihkan.');
    }
  });
});