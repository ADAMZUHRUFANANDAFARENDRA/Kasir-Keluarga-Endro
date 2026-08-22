// 1. Data Produk Lengkap dengan Modal/HPP dan Komponen
const products = [
    { 
        id: 1, 
        name: "Dimsum Mentai / Ori", 
        modal: 9800, // Estimasi Modal per porsi
        price: 15000,
        isBundle: false 
    },
    { 
        id: 2, 
        name: "Es Mojito", 
        modal: 5000, // Estimasi Modal per cup
        price: 10000,
        isBundle: false 
    },
    { 
        id: 3, 
        name: "Tahu Bakso (1 pcs)", 
        modal: 1800, 
        price: 3000,
        isBundle: false 
    },
    { 
        id: 4, 
        name: "Es Teh", 
        modal: 1200, 
        price: 3000,
        isBundle: false 
    },
    { 
        id: 5, 
        name: "Pocari Sweat", 
        modal: 4500, 
        price: 6000,
        isBundle: false 
    },
    { 
        id: 6, 
        name: "Air Cleo", 
        modal: 2200, 
        price: 4000,
        isBundle: false 
    },
    
    // 2. BUNDLING PROMO (Paket Hemat)
    { 
        id: 101, 
        name: "🔥 Paket Hemat (Dimsum + Mojito)", 
        modal: 14800, // Modal Gabungan (9.800 + 5.000)
        price: 22000, // Harga Promo 
        isBundle: true 
    },
    { 
        id: 102, 
        name: "🔥 Paket Kenyang (Dimsum+Teh+Tahu)", 
        modal: 12800, // Modal Gabungan (9.800 + 1.200 + 1.800)
        price: 19000, // Harga Promo
        isBundle: true 
    }
];

// Mengambil data penjualan dari memory HP jika ada
let salesData = JSON.parse(localStorage.getItem('salesData')) || {};

// Fungsi Render Produk ke UI
function renderProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    products.forEach(product => {
        let currentQty = salesData[product.id] || 0;
        
        // Menghitung rekomendasi harga ideal berdasarkan HPP/Modal
        const recPrice20 = Math.ceil((product.modal / 0.8) / 500) * 500; // Margin 20%
        const recPrice30 = Math.ceil((product.modal / 0.7) / 500) * 500; // Margin 30%

        const card = document.createElement('div');
        card.className = `product-card ${product.isBundle ? 'bundle-card' : ''}`;
        card.innerHTML = `
            <h3>${product.name}</h3>
            <span class="hpp-info">HPP (Modal): Rp ${product.modal.toLocaleString('id-ID')}</span>
            <span class="price">Harga Jual: Rp ${product.price.toLocaleString('id-ID')}</span>
            
            <!-- Rekomendasi Harga Jual -->
            <div class="recommendation-box">
                <small>💡 Rekomendasi Harga:</small><br>
                <small>• Margin 20%: <b>Rp ${recPrice20.toLocaleString('id-ID')}</b></small><br>
                <small>• Margin 30%: <b>Rp ${recPrice30.toLocaleString('id-ID')}</b></small>
            </div>

            <div class="counter">
                <button class="btn-qty" onclick="updateQty(${product.id}, -1)">-</button>
                <span class="qty">${currentQty}</span>
                <button class="btn-qty" onclick="updateQty(${product.id}, 1)">+</button>
            </div>
        `;
        productList.appendChild(card);
    });
    calculateTotal();
}

// Fungsi menambah/mengurangi jumlah terjual
function updateQty(id, change) {
    if (!salesData[id]) salesData[id] = 0;
    salesData[id] += change;
    
    if (salesData[id] < 0) salesData[id] = 0; // Tidak boleh minus
    
    localStorage.setItem('salesData', JSON.stringify(salesData));
    renderProducts();
}

// Perhitungan Total Omset, Total Modal Terpakai, dan Keuntungan Bersih
function calculateTotal() {
    let totalSales = 0;
    let totalHPP = 0;

    products.forEach(product => {
        let qty = salesData[product.id] || 0;
        totalSales += (qty * product.price);
        totalHPP += (qty * product.modal);
    });

    let netProfit = totalSales - totalHPP;

    // Tampilkan di UI
    document.getElementById('total-sales').innerText = `Rp ${totalSales.toLocaleString('id-ID')}`;
    document.getElementById('total-hpp').innerText = `Rp ${totalHPP.toLocaleString('id-ID')}`;
    document.getElementById('net-profit').innerText = `Rp ${netProfit.toLocaleString('id-ID')}`;
}

// Tombol Reset untuk keesokan harinya
document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Yakin ingin menghapus semua data penjualan hari ini?")) {
        salesData = {};
        localStorage.removeItem('salesData');
        renderProducts();
    }
});

// Register Service Worker untuk mode Offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker aktif. Aplikasi bisa offline."));
}

// Render pertama kali saat aplikasi dibuka
renderProducts();