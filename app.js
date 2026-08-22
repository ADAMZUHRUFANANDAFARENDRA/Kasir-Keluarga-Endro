// ================= REGISTRASI SERVICE WORKER =================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker aktif'))
      .catch(err => console.error('Gagal SW:', err));
  });
}

// ================= DATA AWAL & FOTO DEFAULT =================
const DEFAULT_PRODUCTS = [
  { 
    id: '1', 
    name: 'Dimsum ori 3pcs', 
    category: 'Makanan', 
    price: 10000, 
    hpp: 6000,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '2', 
    name: 'Dimsum mentai 3pcs', 
    category: 'Makanan', 
    price: 14000, 
    hpp: 8500,
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '3', 
    name: 'Milo lava ukuran sedang', 
    category: 'Minuman', 
    price: 10000, 
    hpp: 6000,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '4', 
    name: 'Milo lava ukuran jumbo', 
    category: 'Minuman', 
    price: 15000, 
    hpp: 9000,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '5', 
    name: 'Good day lava ukuran sedang', 
    category: 'Minuman', 
    price: 10000, 
    hpp: 6000,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '6', 
    name: 'Good day lava cappucino', 
    category: 'Minuman', 
    price: 15000, 
    hpp: 9000,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '7', 
    name: 'Es teh dengan ukuran kecil', 
    category: 'Minuman', 
    price: 3000, 
    hpp: 1500,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: '8', 
    name: 'Es teh dengan ukuran jumbo', 
    category: 'Minuman', 
    price: 5000, 
    hpp: 2500,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80'
  }
];

// State Aplikasi
let products = JSON.parse(localStorage.getItem('kasir_products')) || DEFAULT_PRODUCTS;
let cart = [];
let transactions = JSON.parse(localStorage.getItem('kasir_transactions')) || [];
let notifications = JSON.parse(localStorage.getItem('kasir_notifications')) || [];
let currentCategoryFilter = 'all';
let currentCashier = localStorage.getItem('kasir_active_user') || 'Adam Zuhruf';
let currentUploadedImageBase64 = '';

// Helper Format
const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');
const getFormattedDateTime = () => {
  const d = new Date();
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const getFallbackImage = (category) => {
  return category === 'Makanan'
    ? 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80'
    : 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80';
};

function saveState() {
  localStorage.setItem('kasir_products', JSON.stringify(products));
  localStorage.setItem('kasir_transactions', JSON.stringify(transactions));
  localStorage.setItem('kasir_notifications', JSON.stringify(notifications));
  localStorage.setItem('kasir_active_user', currentCashier);
}

// ================= NOTIFIKASI =================
function addNotification(message) {
  const notif = { id: Date.now(), message, time: getFormattedDateTime() };
  notifications.unshift(notif);
  if (notifications.length > 50) notifications.pop();
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

// ================= KASIR (POS) DENGAN GAMBAR =================
function renderProducts() {
  const grid = document.getElementById('productGrid');
  const filtered = currentCategoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === currentCategoryFilter);

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="text-muted">Tidak ada produk dalam kategori ini.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const imgSrc = p.image || getFallbackImage(p.category);
    return `
      <div class="product-card" onclick="addToCart('${p.id}')">
        <div class="product-img-box">
          <img src="${imgSrc}" alt="${p.name}" class="product-img" onerror="this.src='${getFallbackImage(p.category)}'">
          <span class="product-tag-overlay">${p.category}</span>
        </div>
        <div class="product-card-body">
          <div class="product-name">${p.name}</div>
          <div class="product-price">${formatRupiah(p.price)}</div>
        </div>
      </div>
    `;
  }).join('');
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

// ================= KELOLA MENU & GAMBAR =================
function renderMenuTable() {
  const tbody = document.getElementById('menuTableBody');
  tbody.innerHTML = products.map(p => {
    const imgSrc = p.image || getFallbackImage(p.category);
    return `
      <tr>
        <td>
          <img src="${imgSrc}" alt="${p.name}" class="table-thumb" onerror="this.src='${getFallbackImage(p.category)}'">
        </td>
        <td><b>${p.name}</b></td>
        <td><span class="product-tag">${p.category}</span></td>
        <td>${formatRupiah(p.price)}</td>
        <td>${formatRupiah(p.hpp)}</td>
        <td>
          <button class="btn-chip" onclick="editMenu('${p.id}')">✏️ Edit</button>
          <button class="btn-chip" style="color:var(--danger);" onclick="deleteMenu('${p.id}')">🗑️ Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Upload & Preview Foto Produk
document.getElementById('menuImageFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentUploadedImageBase64 = evt.target.result;
      showImagePreview(currentUploadedImageBase64);
      document.getElementById('menuImageUrl').value = '';
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('menuImageUrl').addEventListener('input', function(e) {
  const url = e.target.value.trim();
  if (url) {
    currentUploadedImageBase64 = '';
    showImagePreview(url);
  } else {
    resetImagePreview();
  }
});

function showImagePreview(src) {
  const img = document.getElementById('menuImagePreview');
  const placeholder = document.getElementById('menuImagePlaceholder');
  img.src = src;
  img.style.display = 'block';
  placeholder.style.display = 'none';
}

function resetImagePreview() {
  const img = document.getElementById('menuImagePreview');
  const placeholder = document.getElementById('menuImagePlaceholder');
  img.src = '';
  img.style.display = 'none';
  placeholder.style.display = 'block';
  currentUploadedImageBase64 = '';
}

function handleSaveMenu(e) {
  e.preventDefault();
  const id = document.getElementById('menuId').value;
  const name = document.getElementById('menuName').value.trim();
  const category = document.getElementById('menuCategory').value;
  const price = parseInt(document.getElementById('menuPrice').value) || 0;
  const hpp = parseInt(document.getElementById('menuHpp').value) || 0;
  
  const urlInput = document.getElementById('menuImageUrl').value.trim();
  const finalImage = currentUploadedImageBase64 || urlInput || getFallbackImage(category);

  if (id) {
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { id, name, category, price, hpp, image: finalImage || products[idx].image };
      addNotification(`[${currentCashier}] memperbarui menu: ${name}`);
    }
  } else {
    products.push({ id: Date.now().toString(), name, category, price, hpp, image: finalImage });
    addNotification(`[${currentCashier}] menambah menu baru: ${name}`);
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

  if (p.image) {
    showImagePreview(p.image);
    if (p.image.startsWith('http')) {
      document.getElementById('menuImageUrl').value = p.image;
    }
  } else {
    resetImagePreview();
  }

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
    addNotification(`[${currentCashier}] menghapus menu: ${p.name}`);
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
  resetImagePreview();
}

// ================= HITUNG HPP & EDIT PENYESUAIAN =================
function renderHppAnalysis() {
  const tbody = document.getElementById('hppTableBody');
  tbody.innerHTML = products.map(p => {
    const profit = p.price - p.hpp;
    const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : 0;
    const isProfit = profit >= 0;
    const imgSrc = p.image || getFallbackImage(p.category);

    return `
      <tr>
        <td>
          <img src="${imgSrc}" alt="${p.name}" class="table-thumb" onerror="this.src='${getFallbackImage(p.category)}'">
        </td>
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
        <td>
          <button class="btn-edit-quick" onclick="openQuickHppModal('${p.id}')">✏️ Sesuaikan</button>
        </td>
      </tr>
    `;
  }).join('');

  let totalRevenue = 0;
  let totalHpp = 0;
  transactions.forEach(t => {
    totalRevenue += t.total;
    totalHpp += (t.totalHpp || 0);
  });

  const totalProfit = totalRevenue - totalHpp;
  document.getElementById('statTotalRevenue').innerText = formatRupiah(totalRevenue);
  document.getElementById('statTotalHpp').innerText = formatRupiah(totalHpp);
  document.getElementById('statTotalProfit').innerText = formatRupiah(totalProfit);
}

// Quick Edit HPP & Harga
function openQuickHppModal(productId) {
  const p = products.find(item => item.id === productId);
  if (!p) return;

  document.getElementById('quickHppId').value = p.id;
  document.getElementById('quickHppProductName').innerText = p.name;
  document.getElementById('quickPrice').value = p.price;
  document.getElementById('quickHpp').value = p.hpp;

  calcQuickProfit();
  document.getElementById('quickHppModal').classList.add('show');
}

function calcQuickProfit() {
  const price = parseInt(document.getElementById('quickPrice').value) || 0;
  const hpp = parseInt(document.getElementById('quickHpp').value) || 0;
  const profit = price - hpp;
  const el = document.getElementById('quickProfitCalc');
  el.innerText = formatRupiah(profit);
  el.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
}

document.getElementById('quickPrice').addEventListener('input', calcQuickProfit);
document.getElementById('quickHpp').addEventListener('input', calcQuickProfit);

document.getElementById('btnCloseQuickHpp').addEventListener('click', () => {
  document.getElementById('quickHppModal').classList.remove('show');
});

document.getElementById('btnSaveQuickHpp').addEventListener('click', () => {
  const id = document.getElementById('quickHppId').value;
  const newPrice = parseInt(document.getElementById('quickPrice').value) || 0;
  const newHpp = parseInt(document.getElementById('quickHpp').value) || 0;

  const product = products.find(p => p.id === id);
  if (product) {
    product.price = newPrice;
    product.hpp = newHpp;
    saveState();

    addNotification(`[${currentCashier}] menyesuaikan HPP ${product.name}: Modal ${formatRupiah(newHpp)}, Jual ${formatRupiah(newPrice)}`);
    
    document.getElementById('quickHppModal').classList.remove('show');
    renderProducts();
    renderMenuTable();
    renderHppAnalysis();
  }
});

// ================= PEMBAYARAN & STRUK =================
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
  document.getElementById('modalCashierActive').innerText = `Petugas: ${currentCashier}`;
  document.getElementById('cashReceived').value = '';
  document.getElementById('cashChange').innerText = formatRupiah(0);

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

  const transaction = {
    invoiceNo: 'INV-' + Date.now().toString().slice(-6),
    dateTime: getFormattedDateTime(),
    cashier: currentCashier,
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

  addNotification(`Transaksi ${transaction.invoiceNo} (${formatRupiah(total)}) oleh ${currentCashier}`);

  document.getElementById('paymentModal').classList.remove('show');
  showReceipt(trx = transaction);

  cart = [];
  renderCart();
  renderHppAnalysis();
  renderHistoryTable();
}

function showReceipt(trx) {
  document.getElementById('receiptInfo').innerHTML = `
    <div class="receipt-row"><span>No. Transaksi</span><span>${trx.invoiceNo}</span></div>
    <div class="receipt-row"><span>Waktu</span><span>${trx.dateTime}</span></div>
    <div class="receipt-row"><span>Kasir</span><span><b>${trx.cashier}</b></span></div>
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

// ================= RIWAYAT TRANSAKSI =================
function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Belum ada riwayat transaksi.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const itemSummary = t.items.map(i => `${i.name} (${i.qty})`).join(', ');
    return `
      <tr>
        <td><b>${t.invoiceNo}</b></td>
        <td>${t.dateTime}</td>
        <td><b>${t.cashier || '-'}</b></td>
        <td>${itemSummary}</td>
        <td><span class="product-tag">${t.method}</span></td>
        <td><b>${formatRupiah(t.total)}</b></td>
        <td style="color:var(--success); font-weight:bold;">${formatRupiah(t.profit)}</td>
      </tr>
    `;
  }).join('');
}

// ================= EVENT LISTENERS =================
document.addEventListener('DOMContentLoaded', () => {
  const cashierDropdown = document.getElementById('selectCashier');
  cashierDropdown.value = currentCashier;
  cashierDropdown.addEventListener('change', (e) => {
    currentCashier = e.target.value;
    saveState();
    addNotification(`Petugas kasir diubah menjadi: ${currentCashier}`);
  });

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

  // Filter Kategori
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