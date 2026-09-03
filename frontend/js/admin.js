// frontend/js/admin.js

const API_BASE_URL = window.API_BASE_URL || "/api";
let db = { users: [], profil: {}, prestasi: [], jadwal: [], galeri: [], anggota: [], pendaftar: [], pesan: [] };

// --- FUNGSI KOMPRESI GAMBAR ---
function processImage(file, callback) {
    if (!file) { callback(null); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let w = img.width, h = img.height;
            if (w > MAX_WIDTH) { h = Math.round((h * MAX_WIDTH) / w); w = MAX_WIDTH; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- AMBIL SEMUA DATA DARI SERVER ---
async function fetchAdminData() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/all`);
        if (res.ok) {
            db = await res.json();
            renderUI();
        }
    } catch (err) { console.error("Gagal ambil data:", err); }
}

// --- RENDER SELURUH UI DASHBOARD ---
function renderUI() {
    try {
        const sdmEl = document.getElementById('stat-sdm');
        if (sdmEl) sdmEl.innerText = (db.anggota || []).length;
        const oprecEl = document.getElementById('stat-oprec');
        if (oprecEl) oprecEl.innerText = (db.pendaftar || []).length;
        const pesanEl = document.getElementById('stat-pesan');
        if (pesanEl) pesanEl.innerText = (db.pesan || []).length;

        let tiketLunas = 0;
        (db.jadwal || []).forEach(j => { tiketLunas += (j.tiketList || []).filter(t => t.status === 'Lunas').length; });
        const tiketEl = document.getElementById('stat-tiket');
        if (tiketEl) tiketEl.innerText = tiketLunas;

        if (db.profil) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
            setVal('p-nama', db.profil.nama);
            setVal('p-sejarah', db.profil.sejarah);
            setVal('p-email', db.profil.email);
            setVal('p-telepon', db.profil.telepon);
            setVal('p-status-oprec', db.profil.statusOprec || "Buka");
            setVal('p-link', db.profil.linkOprec);
            setVal('p-ig', db.profil.sosmed?.ig);
            setVal('p-tiktok', db.profil.sosmed?.tiktok);

            if (db.profil.logo) {
                const sLogo = document.getElementById('sidebar-logo'); if (sLogo) sLogo.src = db.profil.logo;
                const pLogo = document.getElementById('prev-logo'); if (pLogo) pLogo.src = db.profil.logo;
                const lLogo = document.getElementById('login-logo-preview'); if (lLogo) lLogo.src = db.profil.logo;
            }
            if (db.profil.bgHero) {
                const bg = document.getElementById('prev-bg'); if (bg) bg.style.backgroundImage = `url('${db.profil.bgHero}')`;
            }
            if (db.profil.imgTentang) {
                const imgT = document.getElementById('prev-tentang'); if (imgT) imgT.src = db.profil.imgTentang;
            }
        }

        // Render Jadwal Event
        const jContainer = document.getElementById('jadwal-container');
        if (jContainer) {
            jContainer.innerHTML = (db.jadwal || []).map(j => {
                const trj = (j.tiketList || []).filter(t => t.status !== 'Tersedia').length;
                return `
                <div class="bg-gray-900 border border-gray-800 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-l-red-600 shadow-lg mb-4 gap-4">
                    <div>
                        <h4 class="font-bold text-white text-lg">${j.judul}</h4>
                        <p class="text-xs text-gray-400 mt-2 font-mono"><i class="fa-regular fa-calendar text-red-600"></i> ${j.tanggal} | <i class="fa-solid fa-location-dot text-red-600"></i> ${j.lokasi}</p>
                        <div class="mt-3 flex gap-3">
                            <span class="bg-black text-gray-300 px-3 py-1 text-xs rounded border border-gray-700 font-bold">Harga: Rp ${j.harga}</span>
                            <span class="bg-green-900/30 text-green-500 border border-green-900 px-3 py-1 text-xs rounded font-bold">Terjual / Booking: ${trj}/${j.kuota}</span>
                        </div>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button type="button" onclick="bukaDataPembeli(${j.id}, '${j.judul}')" class="bg-blue-600 text-white px-4 py-2 text-sm font-bold rounded hover:bg-blue-500 shadow flex-1"><i class="fa-solid fa-users mr-2"></i> Data Pembeli</button>
                        <button type="button" onclick="hapusData('jadwal', ${j.id})" class="bg-red-900/50 text-red-500 border border-red-900 px-4 py-2 text-sm rounded hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }

        // Render SDM Anggota
        const tAnggota = document.getElementById('tabel-anggota');
        if (tAnggota) {
            tAnggota.innerHTML = (db.anggota || []).map(a => `
                <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td class="p-4 flex items-center gap-3">
                        <img src="${a.foto || 'https://placehold.co/100'}" class="w-10 h-10 rounded-full object-cover border border-gray-600">
                        <span class="font-bold text-white">${a.nama}</span>
                    </td>
                    <td class="p-4">${a.divisi}</td>
                    <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${a.status==='Aktif'?'bg-green-900/40 text-green-500':(a.status==='Pasif'?'bg-yellow-900/40 text-yellow-500':'bg-gray-800 text-gray-400')}">${a.status}</span></td>
                    <td class="p-4 text-center">
                        <button type="button" onclick="bukaModalAnggota(${a.id})" class="text-blue-400 hover:text-white mr-4 transition"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" onclick="hapusData('anggota', ${a.id})" class="text-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`).join('');
        }

        // Render Pendaftar Oprec
        const tPendaftar = document.getElementById('tabel-pendaftar');
        if (tPendaftar) {
            tPendaftar.innerHTML = (db.pendaftar || []).length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-gray-500">Belum ada data ditarik dari Cloud/Lokal.</td></tr>' : db.pendaftar.map(p => `
                <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td class="p-4 font-mono text-xs">${p.tgl}</td>
                    <td class="p-4"><strong class="text-white text-base">${p.nama}</strong><br><span class="text-xs text-gray-500">${p.nim} - ${p.prodi}</span></td>
                    <td class="p-4 text-xs font-bold text-gray-400">${p.wa}<br><span class="text-red-500">${p.posisi}</span></td>
                    <td class="p-4 text-center" data-exclude="true">
                        <button type="button" onclick="bukaModalOprec(${p.id})" class="text-blue-400 hover:text-white mr-4 transition"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" onclick="hapusData('pendaftar', ${p.id})" class="text-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`).join('');
        }

        // Render Galeri
        const gGrid = document.getElementById('gallery-grid-admin');
        if (gGrid) {
            gGrid.innerHTML = (db.galeri || []).map(g => `
                <div class="bg-black border-2 border-gray-800 h-40 rounded-xl relative group overflow-hidden shadow-lg">
                    <img src="${g.src}" class="w-full h-full object-cover">
                    <div class="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow">${g.kategori}</div>
                    <button type="button" onclick="hapusData('galeri', ${g.id})" class="absolute inset-0 bg-red-900/90 hidden group-hover:flex items-center justify-center transition"><i class="fa-solid fa-trash text-white text-3xl"></i></button>
                </div>`).join('');
        }

        // Render Pesan
        const pContainer = document.getElementById('pesan-container');
        if (pContainer) {
            let msgHtml = '';
            [...(db.pesan || [])].reverse().forEach(psn => {
                msgHtml += `
                <div class="bg-black border-l-4 border-l-blue-500 border-y border-r border-gray-800 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg">
                    <div class="mb-4 md:mb-0">
                        <h4 class="font-bold text-white text-lg">${psn.nama}</h4>
                        <p class="text-xs text-gray-400 mt-2 font-mono"><i class="fa-solid fa-envelope mr-1 text-blue-500"></i> ${psn.kontak} | 📅 ${psn.tgl}</p>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <button type="button" onclick="bacaPesan('${psn.nama}', '${psn.kontak}', '${psn.isi.replace(/'/g, "\\'")}')" class="bg-blue-600 text-white px-4 py-2 text-xs font-bold rounded hover:bg-blue-500 shadow flex-1"><i class="fa-solid fa-envelope-open-text mr-1"></i> Baca Pesan</button>
                        <button type="button" onclick="hapusData('pesan', ${psn.id})" class="bg-gray-800 text-gray-400 border border-gray-700 px-4 py-2 text-xs rounded hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            });
            pContainer.innerHTML = msgHtml || '<p class="text-gray-500 text-center py-10 border border-gray-800 rounded bg-black">Kotak masuk bersih.</p>';
        }

        // Render Prestasi
        const lPrestasi = document.getElementById('list-prestasi');
        if (lPrestasi) {
            lPrestasi.innerHTML = (db.prestasi || []).map(p => `
                <div class="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-lg text-sm mb-3 shadow hover:border-red-600 transition">
                    <div><span class="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mr-3 shadow">${p.tahun}</span> <strong class="text-white">${p.judul}</strong> <span class="text-xs text-gray-400 ml-2 block mt-1">${p.desc}</span></div>
                    <button type="button" onclick="hapusData('prestasi', ${p.id})" class="text-red-500 hover:bg-red-900/30 p-2 rounded transition"><i class="fa-solid fa-trash"></i></button>
                </div>`).join('');
        }
    } catch (err) { console.error(err); }
}

// --- HAPUS DATA KE SERVER ---
window.hapusData = async function(tipe, id) {
    if (confirm('Yakin ingin hapus permanen?')) {
        const res = await fetch(`${API_BASE_URL}/admin/${tipe}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('✅ Data Berhasil Dihapus.');
            fetchAdminData();
        }
    }
};

// --- LOGIKA AUTH & LOGIN ---
const loginSect = document.getElementById('login-section');
const dashSect = document.getElementById('dashboard-section');

function bukaDashboard() {
    if (loginSect) {
        loginSect.style.display = 'none';
        loginSect.classList.remove('flex');
        loginSect.classList.add('hidden');
    }
    if (dashSect) {
        dashSect.style.display = 'flex';
        dashSect.classList.remove('hidden');
        dashSect.classList.add('flex');
    }
}

// Cek apakah sudah login sebelumnya
let activeUser = JSON.parse(sessionStorage.getItem('active_user'));
if (activeUser) {
    bukaDashboard();
    applyRoleRestrictions(activeUser.role);
    fetchAdminData();
}

// SUBMIT FORM LOGIN
document.getElementById('login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('l-user').value.trim();
    const p = document.getElementById('l-pass').value.trim();

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: u, pass: p })
        });
        
        const text = await res.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (jsonErr) {
            alert(`⚠️ Respons Server (Status ${res.status}):\n${text.substring(0, 250)}`);
            return;
        }

        if (res.ok && result.success) {
            sessionStorage.setItem('active_user', JSON.stringify(result.user));
            activeUser = result.user;
            
            // Sembunyikan panel login & tampilkan dashboard
            bukaDashboard();
            applyRoleRestrictions(result.user.role);
            fetchAdminData();
            
            alert('✅ Berhasil masuk! Selamat datang, ' + result.user.user);
        } else {
            alert('❌ ' + (result.error || 'Username atau Password Salah!'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Gagal menghubungi server: ' + err.message);
    }
});

document.getElementById('register-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('r-user').value.trim();
    const p = document.getElementById('r-pass').value.trim();
    const r = document.getElementById('r-role').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: u, pass: p, role: r })
        });
        const result = await res.json();
        if (res.ok) {
            alert('✅ Akun berhasil dibuat! Silakan Login.');
            document.getElementById('tab-login')?.click();
            this.reset();
        } else {
            alert('❌ ' + (result.error || 'Gagal mendaftar!'));
        }
    } catch (err) { alert('❌ ' + err.message); }
});

document.getElementById('logout-btn')?.addEventListener('click', function() {
    sessionStorage.removeItem('active_user');
    location.reload();
});

function applyRoleRestrictions(role) {
    const roleName = { admin: "Super Admin", ketum: "Ketua Umum", sekre: "Sekretaris", pdd: "Divisi PDD" };
    const rDisplay = document.getElementById('sidebar-role-display');
    if (rDisplay) rDisplay.innerText = roleName[role] || role;
}

// SIDEBAR NAVIGATION
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function() {
        document.querySelectorAll('.sidebar-link').forEach(b => {
            b.classList.remove('bg-red-600', 'text-white', 'active-link');
            b.classList.add('text-gray-400');
        });
        this.classList.remove('text-gray-400');
        this.classList.add('bg-red-600', 'text-white', 'active-link');
        const hTitle = document.getElementById('header-title');
        if (hTitle) hTitle.innerText = this.innerText;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        const target = document.getElementById('content-' + this.getAttribute('data-target'));
        if (target) target.classList.remove('hidden');
    });
});

// MODAL UTILS
const overlay = document.getElementById('overlay-modal');
function openModal(id) {
    document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
}
window.openModal = openModal;
window.closeScannerModal = function() { if (overlay) overlay.classList.add('hidden'); stopScanner(); };
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeScannerModal));

// --- 1. BUAT EVENT & GENERATE BARCODE ---
document.getElementById('form-jadwal')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const kuota = parseInt(document.getElementById('j-kuota').value);
    const eventId = Date.now();
    let tiketList = [];
    for (let i = 1; i <= kuota; i++) {
        let num = i.toString().padStart(3, '0');
        tiketList.push({ kode: `STU-${eventId.toString().slice(-4)}-${num}`, status: 'Tersedia', nama: '', email: '', wa: '' });
    }
    const qrInput = document.getElementById('j-qr');
    processImage(qrInput?.files?.[0], async function(base64) {
        const payload = {
            id: eventId,
            judul: document.getElementById('j-judul').value,
            tanggal: document.getElementById('j-tanggal').value,
            lokasi: document.getElementById('j-lokasi').value,
            harga: document.getElementById('j-harga').value,
            kuota: kuota,
            qrImage: base64 || "",
            tiketList: tiketList
        };
        const res = await fetch(`${API_BASE_URL}/admin/jadwal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert(`✅ Event & ${kuota} Barcode Tiket berhasil dibuat!`);
            if (overlay) overlay.classList.add('hidden');
            document.getElementById('form-jadwal')?.reset();
            fetchAdminData();
        } else {
            alert('❌ Gagal menyimpan event');
        }
    });
});

// --- 2. SCANNER BARCODE & VERIFIKASI ---
let html5QrcodeScanner = null;
window.startScanner = function() {
    openModal('modal-scanner');
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 150} }, false);
        html5QrcodeScanner.render(
            (decodedText) => {
                const inp = document.getElementById('input-kode-tiket');
                if (inp) inp.value = decodedText;
                closeScannerModal();
                document.getElementById('form-verifikasi')?.dispatchEvent(new Event('submit'));
            },
            () => {}
        );
    }
};
window.stopScanner = function() {
    if (html5QrcodeScanner) { html5QrcodeScanner.clear().catch(e=>console.error(e)); html5QrcodeScanner = null; }
};

document.getElementById('form-verifikasi')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const val = document.getElementById('input-kode-tiket').value.trim().toUpperCase();
    const box = document.getElementById('hasil-verifikasi');
    if (!box) return;
    box.classList.remove('hidden');
    let found = null; let jJudul = "";
    for (let j of db.jadwal) {
        const t = (j.tiketList || []).find(x => x.kode === val);
        if (t) { found = t; jJudul = j.judul; break; }
    }
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${val}&scale=2&includetext`;

    if (found && found.status === 'Lunas') {
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-green-900/20 border-green-500 text-green-400 text-sm shadow-xl flex flex-col items-center w-full';
        box.innerHTML = `<i class="fa-solid fa-circle-check text-4xl mb-2"></i><br><strong class="text-lg">TIKET VALID & SAH!</strong><br><span class="text-white mt-2 block mb-4">Pemilik: ${found.nama} | Event: ${jJudul}</span><img src="${barcodeUrl}" class="p-2 bg-white rounded max-w-full">`;
    } else if (found && found.status === 'Pending') {
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-yellow-900/20 border-yellow-500 text-yellow-400 text-sm shadow-xl w-full';
        box.innerHTML = `<i class="fa-solid fa-circle-exclamation text-4xl mb-2"></i><br><strong class="text-lg">TIKET BELUM DILUNASI</strong><br><span class="text-white mt-2 block">Silakan lunasi di bagian Admin Tiket.<br>Pemilik: ${found.nama}</span>`;
    } else {
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-red-900/20 border-red-500 text-red-400 text-sm shadow-xl w-full';
        box.innerHTML = `<i class="fa-solid fa-circle-xmark text-4xl mb-2"></i><br><strong class="text-lg">BARCODE SALAH / PALSU</strong>`;
    }
});

// --- 3. DATA PEMBELI & LUNAS EMAIL ---
window.bukaDataPembeli = function(idJadwal, judul) {
    const tTitle = document.getElementById('title-pembeli');
    if (tTitle) tTitle.innerText = "Event: " + judul;
    const tBody = document.getElementById('list-pembeli');
    if (!tBody) return;
    tBody.innerHTML = '';
    const j = (db.jadwal || []).find(x => x.id == idJadwal);
    const terjualList = (j?.tiketList || []).filter(t => t.status !== 'Tersedia');
    if (terjualList.length === 0) {
        tBody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Belum ada tiket yang dipesan.</td></tr>';
    }
    terjualList.forEach(p => {
        const isL = p.status === 'Lunas';
        tBody.innerHTML += `
        <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
            <td class="p-4 font-mono font-bold text-red-500">${p.kode}</td>
            <td class="p-4 font-bold text-white">${p.nama}</td>
            <td class="p-4 text-xs text-gray-400">${p.email}<br>${p.wa}</td>
            <td class="p-4 font-bold ${isL?'text-green-500':'text-yellow-500'}">${p.status}</td>
            <td class="p-4 text-center">
                ${!isL ? `<button type="button" onclick="konfirmasiLunas(${j.id}, '${p.kode}')" class="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold shadow hover:bg-green-500"><i class="fa-solid fa-paper-plane mr-1"></i> Lunas & Email Barcode</button>` : `<button type="button" onclick="batalLunas(${j.id}, '${p.kode}')" class="bg-gray-800 text-gray-400 px-4 py-2 rounded text-xs hover:text-white hover:bg-red-600">Batal Lunas</button>`}
            </td>
        </tr>`;
    });
    openModal('modal-pembeli');
};

window.konfirmasiLunas = async function(idJadwal, kode) {
    const res = await fetch(`${API_BASE_URL}/admin/tiket/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwalId: idJadwal, kode, status: 'Lunas' })
    });
    if (res.ok) {
        const j = db.jadwal.find(x => x.id == idJadwal);
        const t = j.tiketList.find(x => x.kode === kode);
        t.status = 'Lunas';
        const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${t.kode}&scale=3&includetext`;
        const subject = encodeURIComponent(`E-Ticket Pementasan: ${j.judul}`);
        const body = encodeURIComponent(`Halo ${t.nama},\n\nPembayaran tiket Anda telah dikonfirmasi!\n\nLakon: ${j.judul}\nKode Tiket: ${t.kode}\n\nSilakan tunjukkan link Barcode berikut saat check-in:\n${barcodeUrl}\n\nTerima kasih,\nTeater SAMANTHA`);
        window.location.href = `mailto:${t.email}?subject=${subject}&body=${body}`;
        alert('✅ Tiket dilunaskan! Jendela pengiriman email barcode akan terbuka.');
        bukaDataPembeli(idJadwal, j.judul);
        renderUI();
    }
};

window.batalLunas = async function(idJadwal, kode) {
    const res = await fetch(`${API_BASE_URL}/admin/tiket/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwalId: idJadwal, kode, status: 'Pending' })
    });
    if (res.ok) {
        const j = db.jadwal.find(x => x.id == idJadwal);
        const t = j.tiketList.find(x => x.kode === kode);
        t.status = 'Pending';
        alert('Status tiket dibatalkan menjadi Pending.');
        bukaDataPembeli(idJadwal, j.judul);
        renderUI();
    }
};

// --- 4. KELOLA SDM ANGGOTA ---
window.bukaModalAnggota = function(id = null) {
    document.getElementById('form-anggota')?.reset();
    const aId = document.getElementById('a-id'); if (aId) aId.value = '';
    if (id) {
        const a = (db.anggota || []).find(x => x.id === id);
        if (a) {
            if (aId) aId.value = a.id;
            const aNama = document.getElementById('a-nama'); if (aNama) aNama.value = a.nama;
            const aDiv = document.getElementById('a-divisi'); if (aDiv) aDiv.value = a.divisi;
            const aStat = document.getElementById('a-status'); if (aStat) aStat.value = a.status;
            const tAngg = document.getElementById('title-anggota'); if (tAngg) tAngg.innerText = "Edit Anggota";
        }
    } else {
        const tAngg = document.getElementById('title-anggota'); if (tAngg) tAngg.innerText = "Tambah Anggota Baru";
    }
    openModal('modal-anggota');
};

document.getElementById('form-anggota')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('a-id').value;
    const fotoFile = document.getElementById('a-foto')?.files?.[0];
    let data = {
        id: id || null,
        nama: document.getElementById('a-nama').value,
        divisi: document.getElementById('a-divisi').value,
        status: document.getElementById('a-status').value
    };
    if (fotoFile) {
        processImage(fotoFile, function(base64) {
            data.foto = base64;
            simpanDataAnggotaBackend(data);
        });
    } else {
        if (id) {
            const existA = (db.anggota || []).find(x => x.id == id);
            if (existA && existA.foto) data.foto = existA.foto;
        }
        simpanDataAnggotaBackend(data);
    }
});

async function simpanDataAnggotaBackend(data) {
    const res = await fetch(`${API_BASE_URL}/admin/anggota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert('✅ Data SDM Berhasil Disimpan.');
        if (overlay) overlay.classList.add('hidden');
        fetchAdminData();
    }
}

// --- 5. OPREC GOOGLE SHEETS SYNC (CSV) ---
function parseCSV(text) {
    let result = [], row = [], inQuotes = false, val = '';
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { row.push(val.trim()); val = ''; }
        else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i+1] === '\n') i++;
            row.push(val.trim()); result.push(row); row = []; val = '';
        } else { val += char; }
    }
    if (val || row.length > 0) { row.push(val.trim()); result.push(row); }
    return result;
}

document.getElementById('form-import-oprec')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const url = document.getElementById('import-url').value;
    const mImport = document.getElementById('modal-import-oprec');
    if (mImport) mImport.classList.add('hidden');

    fetch(url)
        .then(response => response.text())
        .then(async csvText => {
            if (csvText.toLowerCase().includes('<!doctype') || csvText.toLowerCase().includes('<html')) {
                throw new Error("Pastikan memilih format CSV saat Publish Google Sheets.");
            }
            const lines = parseCSV(csvText);
            let imported = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i];
                if (row.length < 5) continue;
                imported.push({
                    id: Date.now() + i,
                    tgl: row[0] ? row[0].split(' ')[0] : '-',
                    nama: row || '-',
                    nim: row || '-',
                    prodi: row || '-',
                    wa: row || '-',
                    posisi: 'Calon Anggota'
                });
            }
            const res = await fetch(`${API_BASE_URL}/admin/pendaftar-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: imported })
            });
            if (res.ok) {
                alert(`✅ Sinkronisasi Berhasil! ${imported.length} pendaftar ditarik dari Cloud.`);
                document.getElementById('form-import-oprec')?.reset();
                fetchAdminData();
            }
        })
        .catch(err => alert('❌ ' + err.message));
});

window.bukaModalOprec = function(id) {
    const p = (db.pendaftar || []).find(x => x.id === id);
    if (p) {
        const oId = document.getElementById('o-id'); if (oId) oId.value = p.id;
        const oNama = document.getElementById('o-nama'); if (oNama) oNama.value = p.nama;
        const oNim = document.getElementById('o-nim'); if (oNim) oNim.value = p.nim;
        const oWa = document.getElementById('o-wa'); if (oWa) oWa.value = p.wa;
        const oPos = document.getElementById('o-posisi'); if (oPos) oPos.value = p.posisi;
        openModal('modal-oprec');
    }
};

document.getElementById('form-oprec')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('o-id').value;
    const idx = (db.pendaftar || []).findIndex(x => x.id == id);
    if (idx !== -1) {
        db.pendaftar[idx].nama = document.getElementById('o-nama').value;
        db.pendaftar[idx].nim = document.getElementById('o-nim').value;
        db.pendaftar[idx].wa = document.getElementById('o-wa').value;
        db.pendaftar[idx].posisi = document.getElementById('o-posisi').value;

        await fetch(`${API_BASE_URL}/admin/pendaftar-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: db.pendaftar })
        });
        alert("Data Pendaftar Diupdate.");
        if (overlay) overlay.classList.add('hidden');
        renderUI();
    }
});

window.exportCSVOprec = function() {
    let csv = [];
    let rows = document.getElementById('table-export-oprec')?.querySelectorAll('tr') || [];
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
            if (cols[j].getAttribute('data-exclude') !== 'true') {
                let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, " ").replace(/,/g, ";");
                row.push('"' + data + '"');
            }
        }
        csv.push(row.join(','));
    }
    let blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Data_Oprec_Samantha.csv';
    link.click();
};

// --- 6. UPLOAD GALERI ---
document.getElementById('form-galeri')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const gFileInput = document.getElementById('g-file');
    processImage(gFileInput?.files?.[0], async function(b64) {
        if (!b64) return alert('Silakan pilih foto terlebih dahulu.');
        const payload = { src: b64, kategori: document.getElementById('g-kategori').value };
        const res = await fetch(`${API_BASE_URL}/admin/galeri`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("✅ Foto Galeri Berhasil Diupload.");
            if (overlay) overlay.classList.add('hidden');
            document.getElementById('form-galeri')?.reset();
            fetchAdminData();
        } else {
            alert("❌ Gagal upload foto galeri");
        }
    });
});

// --- 7. PESAN INBOX ---
window.bacaPesan = function(nama, kontak, isi) {
    const mNama = document.getElementById('msg-nama'); if (mNama) mNama.innerText = nama;
    const mKontak = document.getElementById('msg-kontak'); if (mKontak) mKontak.innerText = kontak;
    const mIsi = document.getElementById('msg-isi'); if (mIsi) mIsi.innerText = isi;
    const bBalas = document.getElementById('btn-balas-email');
    if (bBalas) bBalas.href = `mailto:${kontak}?subject=Balasan dari Teater Samantha`;
    openModal('modal-pesan');
};

// --- 8. PENGATURAN PROFIL & GAMBAR LENGKAP ---
document.getElementById('form-profil')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        nama: document.getElementById('p-nama').value,
        statusOprec: document.getElementById('p-status-oprec').value,
        linkOprec: document.getElementById('p-link').value,
        sejarah: document.getElementById('p-sejarah').value,
        email: document.getElementById('p-email').value,
        telepon: document.getElementById('p-telepon').value,
        sosmed: {
            ig: document.getElementById('p-ig').value,
            tiktok: document.getElementById('p-tiktok').value
        }
    };
    const res = await fetch(`${API_BASE_URL}/admin/profil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) alert("✅ Pengaturan Web Diperbarui!");
});

['f-logo', 'f-bg', 'f-tentang'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', function(e) {
        if (e.target.files?.[0]) {
            processImage(e.target.files[0], async function(b64) {
                let updateField = {};
                if (id === 'f-logo') updateField.logo = b64;
                else if (id === 'f-bg') updateField.bgHero = b64;
                else if (id === 'f-tentang') updateField.imgTentang = b64;

                const res = await fetch(`${API_BASE_URL}/admin/profil`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateField)
                });
                if (res.ok) {
                    alert("✅ Gambar Berhasil Diperbarui!");
                    fetchAdminData();
                }
            });
        }
    });
});

// --- 9. DATABASE PRESTASI ---
document.getElementById('form-prestasi')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        tahun: document.getElementById('pr-tahun').value,
        judul: document.getElementById('pr-judul').value,
        desc: document.getElementById('pr-desc').value
    };
    const res = await fetch(`${API_BASE_URL}/admin/prestasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        alert("✅ Prestasi Berhasil Ditambahkan.");
        document.getElementById('form-prestasi')?.reset();
        fetchAdminData();
    }
});