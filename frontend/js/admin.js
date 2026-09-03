// frontend/js/admin.js

// Memastikan API selalu memanggil /api
const API_BASE_URL = window.API_BASE_URL || "/api";

let db = {
    users: [],
    profil: {},
    prestasi: [],
    jadwal: [],
    galeri: [],
    anggota: [],
    pendaftar: [],
    pesan: []
};

// --- FUNGSI KOMPRESI GAMBAR CLIENT-SIDE ---
function processImage(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let w = img.width, h = img.height;
            if (w > MAX_WIDTH) {
                h = Math.round((h * MAX_WIDTH) / w);
                w = MAX_WIDTH;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- AMBIL SEMUA DATA DARI BACKEND ---
async function fetchAdminData() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/all`);
        if (!res.ok) throw new Error("Gagal mengambil data dari server.");
        db = await res.json();
        renderUI();
    } catch (err) {
        console.error(err);
        alert('❌ Koneksi backend gagal. Pastikan server backend sudah running.');
    }
}

// --- ROLE BASED ACCESS CONTROL ---
function applyRoleRestrictions(role) {
    document.getElementById('nav-tiket').classList.remove('hidden');
    document.getElementById('nav-sdm').classList.remove('hidden');
    document.getElementById('nav-pesan').classList.remove('hidden');
    document.getElementById('nav-galeri').classList.remove('hidden');
    document.getElementById('nav-setup').classList.remove('hidden');

    if (role === 'sekre') {
        document.getElementById('nav-tiket').classList.add('hidden');
        document.getElementById('nav-galeri').classList.add('hidden');
    } else if (role === 'pdd') {
        document.getElementById('nav-sdm').classList.add('hidden');
        document.getElementById('nav-pesan').classList.add('hidden');
        document.getElementById('nav-setup').classList.add('hidden');
    }
    const roleName = { admin: "Super Admin", ketum: "Ketua Umum", sekre: "Sekretaris", kodok: " PDD" };
    document.getElementById('sidebar-role-display').innerText = roleName[role] || role;
}

// --- RENDER SELURUH UI DASHBOARD ---
function renderUI() {
    try {
        // 1. Statistik
        document.getElementById('stat-sdm').innerText = db.anggota.length;
        document.getElementById('stat-oprec').innerText = db.pendaftar.length;
        document.getElementById('stat-pesan').innerText = db.pesan.length;

        let tiketLunas = 0;
        db.jadwal.forEach(j => {
            tiketLunas += (j.tiketList || []).filter(t => t.status === 'Lunas').length;
        });
        document.getElementById('stat-tiket').innerText = tiketLunas;

        // 2. Form Pengaturan Profil
        document.getElementById('p-nama').value = db.profil.nama || "";
        document.getElementById('p-sejarah').value = db.profil.sejarah || "";
        document.getElementById('p-email').value = db.profil.email || "";
        document.getElementById('p-telepon').value = db.profil.telepon || "";
        document.getElementById('p-status-oprec').value = db.profil.statusOprec || "Buka";
        document.getElementById('p-link').value = db.profil.linkOprec || "";
        document.getElementById('p-ig').value = db.profil.sosmed?.ig || "";
        document.getElementById('p-tiktok').value = db.profil.sosmed?.tiktok || "";

        if (db.profil.logo) {
            document.getElementById('sidebar-logo').src = db.profil.logo;
            document.getElementById('prev-logo').src = db.profil.logo;
        }
        if (db.profil.bgHero) document.getElementById('prev-bg').style.backgroundImage = `url('${db.profil.bgHero}')`;
        if (db.profil.imgTentang) document.getElementById('prev-tentang').src = db.profil.imgTentang;

        // 3. Jadwal & Tiket
        document.getElementById('jadwal-container').innerHTML = db.jadwal.map(j => {
            const trj = (j.tiketList || []).filter(t => t.status !== 'Tersedia').length;
            return `
            <div class="bg-gray-900 border border-gray-800 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-l-brand-red shadow-lg mb-4 gap-4">
                <div>
                    <h4 class="font-bold text-white text-lg">${j.judul}</h4>
                    <p class="text-xs text-gray-400 mt-2 font-mono"><i class="fa-regular fa-calendar text-brand-red"></i> ${j.tanggal} | <i class="fa-solid fa-location-dot text-brand-red"></i> ${j.lokasi}</p>
                    <div class="mt-3 flex gap-3">
                        <span class="bg-black text-gray-300 px-3 py-1 text-xs rounded border border-gray-700 font-bold">Harga: Rp ${j.harga}</span>
                        <span class="bg-green-900/30 text-green-500 border border-green-900 px-3 py-1 text-xs rounded font-bold">Terjual / Booking: ${trj}/${j.kuota}</span>
                    </div>
                </div>
                <div class="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button onclick="bukaDataPembeli(${j.id}, '${j.judul}')" class="bg-blue-600 text-white px-4 py-2 text-sm font-bold rounded hover:bg-blue-500 shadow flex-1"><i class="fa-solid fa-users mr-2"></i> Data Pembeli</button>
                    <button onclick="hapusData('jadwal', ${j.id})" class="bg-red-900/50 text-red-500 border border-red-900 px-4 py-2 text-sm rounded hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');

        // 4. SDM Anggota
        document.getElementById('tabel-anggota').innerHTML = db.anggota.map(a => `
            <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                <td class="p-4 flex items-center gap-3">
                    <img src="${a.foto || 'https://placehold.co/100'}" class="w-10 h-10 rounded-full object-cover border border-gray-600">
                    <span class="font-bold text-white">${a.nama}</span>
                </td>
                <td class="p-4">${a.divisi}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${a.status === 'Aktif' ? 'bg-green-900/40 text-green-500' : (a.status === 'Pasif' ? 'bg-yellow-900/40 text-yellow-500' : 'bg-gray-800 text-gray-400')}">${a.status}</span></td>
                <td class="p-4 text-center">
                    <button onclick="bukaModalAnggota(${a.id})" class="text-blue-400 hover:text-white mr-4 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="hapusData('anggota', ${a.id})" class="text-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');

        // 5. Pendaftar Oprec
        document.getElementById('tabel-pendaftar').innerHTML = db.pendaftar.length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-gray-500">Belum ada data ditarik dari Cloud/Lokal.</td></tr>' : db.pendaftar.map(p => `
            <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                <td class="p-4 font-mono text-xs">${p.tgl}</td>
                <td class="p-4"><strong class="text-white text-base">${p.nama}</strong><br><span class="text-xs text-gray-500">${p.nim} - ${p.prodi}</span></td>
                <td class="p-4 text-xs font-bold text-gray-400">${p.wa}<br><span class="text-brand-red">${p.posisi}</span></td>
                <td class="p-4 text-center" data-exclude="true">
                    <button onclick="bukaModalOprec(${p.id})" class="text-blue-400 hover:text-white mr-4 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="hapusData('pendaftar', ${p.id})" class="text-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');

        // 6. Galeri
        document.getElementById('gallery-grid-admin').innerHTML = db.galeri.map(g => `
            <div class="bg-black border-2 border-gray-800 h-40 rounded-xl relative group overflow-hidden shadow-lg">
                <img src="${g.src}" class="w-full h-full object-cover">
                <div class="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow">${g.kategori}</div>
                <button onclick="hapusData('galeri', ${g.id})" class="absolute inset-0 bg-red-900/90 hidden group-hover:flex items-center justify-center transition"><i class="fa-solid fa-trash text-white text-3xl"></i></button>
            </div>`).join('');

        // 7. Pesan Kotak Masuk
        let msgHtml = '';
        [...db.pesan].reverse().forEach(psn => {
            msgHtml += `
            <div class="bg-black border-l-4 border-l-blue-500 border-y border-r border-gray-800 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg">
                <div class="mb-4 md:mb-0">
                    <h4 class="font-bold text-white text-lg">${psn.nama}</h4>
                    <p class="text-xs text-gray-400 mt-2 font-mono"><i class="fa-solid fa-envelope mr-1 text-blue-500"></i> ${psn.kontak} | 📅 ${psn.tgl}</p>
                </div>
                <div class="flex gap-3 w-full md:w-auto">
                    <button onclick="bacaPesan('${psn.nama}', '${psn.kontak}', '${psn.isi.replace(/'/g, "\\'")}')" class="bg-blue-600 text-white px-4 py-2 text-xs font-bold rounded hover:bg-blue-500 shadow flex-1"><i class="fa-solid fa-envelope-open-text mr-1"></i> Baca Pesan</button>
                    <button onclick="hapusData('pesan', ${psn.id})" class="bg-gray-800 text-gray-400 border border-gray-700 px-4 py-2 text-xs rounded hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        });
        document.getElementById('pesan-container').innerHTML = msgHtml || '<p class="text-gray-500 text-center py-10 border border-gray-800 rounded bg-black">Kotak masuk bersih.</p>';

        // 8. Prestasi
        document.getElementById('list-prestasi').innerHTML = db.prestasi.map(p => `
            <div class="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-lg text-sm mb-3 shadow hover:border-brand-red transition">
                <div>
                    <span class="bg-brand-red text-white px-2 py-1 rounded text-xs font-bold mr-3 shadow">${p.tahun}</span>
                    <strong class="text-white">${p.judul}</strong>
                    <span class="text-xs text-gray-400 ml-2 block mt-1">${p.desc}</span>
                </div>
                <button onclick="hapusData('prestasi', ${p.id})" class="text-red-500 hover:bg-red-900/30 p-2 rounded transition"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('');
    } catch (e) {
        console.error("Render Error:", e);
    }
}

// --- FUNGSI HAPUS DATA KE BACKEND ---
window.hapusData = async function (tipe, id) {
    if (confirm('Yakin ingin hapus permanen?')) {
        const res = await fetch(`${API_BASE_URL}/admin/${tipe}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('✅ Data Berhasil Dihapus.');
            fetchAdminData();
        }
    }
};

// --- AUTH (LOGIN, REGISTER, LOGOUT) ---
const loginSect = document.getElementById('login-section');
const dashSect = document.getElementById('dashboard-section');

document.getElementById('tab-login').addEventListener('click', function () {
    this.classList.replace('text-gray-500', 'text-brand-red');
    this.classList.add('border-b-2', 'border-brand-red');
    document.getElementById('tab-register').classList.replace('text-brand-red', 'text-gray-500');
    document.getElementById('tab-register').classList.remove('border-b-2', 'border-brand-red');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
});

document.getElementById('tab-register').addEventListener('click', function () {
    this.classList.replace('text-gray-500', 'text-brand-red');
    this.classList.add('border-b-2', 'border-brand-red');
    document.getElementById('tab-login').classList.replace('text-brand-red', 'text-gray-500');
    document.getElementById('tab-login').classList.remove('border-b-2', 'border-brand-red');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
});

let activeUser = JSON.parse(sessionStorage.getItem('active_user'));
if (activeUser) {
    loginSect.classList.add('hidden');
    dashSect.classList.remove('hidden');
    applyRoleRestrictions(activeUser.role);
    fetchAdminData();
}

// SUBMIT LOGIN KE BACKEND
        document.getElementById('login-form').addEventListener('submit', async function(e) {
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
                } catch (parseErr) {
                    alert(`❌ Server Respon (Status ${res.status}):\n${text.substring(0, 200)}`);
                    return;
                }

                if (res.ok && result.success) {
                    sessionStorage.setItem('active_user', JSON.stringify(result.user));
                    activeUser = result.user;
                    loginSect.classList.add('hidden');
                    dashSect.classList.remove('hidden');
                    applyRoleRestrictions(result.user.role);
                    fetchAdminData();
                } else {
                    alert('❌ ' + (result.error || 'Username atau Password Salah!'));
                }
            } catch (err) {
                console.error(err);
                alert('❌ Gagal koneksi (Network Error): ' + err.message);
            }
        });

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('r-user').value;
    const p = document.getElementById('r-pass').value;
    const r = document.getElementById('r-role').value;

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: u, pass: p, role: r })
    });
    const result = await res.json();

    if (res.ok) {
        alert('Akun berhasil dibuat! Silakan Login.');
        document.getElementById('tab-login').click();
        e.target.reset();
    } else {
        alert(result.error || 'Gagal mendaftar!');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('active_user');
    location.reload();
});

// --- NAVIGATION TABS ---
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-link').forEach(b => {
            b.classList.remove('bg-red-600', 'text-white', 'active-link');
            b.classList.add('text-gray-400');
        });
        link.classList.remove('text-gray-400');
        link.classList.add('bg-red-600', 'text-white', 'active-link');
        document.getElementById('header-title').innerText = link.innerText;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById('content-' + link.getAttribute('data-target')).classList.remove('hidden');
    });
});

// --- MODAL UTILS ---
const overlay = document.getElementById('overlay-modal');
function openModal(id) {
    document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    overlay.classList.remove('hidden');
}
window.openModal = openModal;

window.closeScannerModal = function () {
    overlay.classList.add('hidden');
    stopScanner();
};
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeScannerModal));

// --- GENERATE EVENT & TIKET ---
document.getElementById('form-jadwal').addEventListener('submit', (e) => {
    e.preventDefault();
    const kuota = parseInt(document.getElementById('j-kuota').value);
    const eventId = Date.now();
    let tiketList = [];

    for (let i = 1; i <= kuota; i++) {
        let num = i.toString().padStart(3, '0');
        tiketList.push({
            kode: `STU-${eventId.toString().slice(-4)}-${num}`,
            status: 'Tersedia',
            nama: '',
            email: '',
            wa: ''
        });
    }

    processImage(document.getElementById('j-qr').files[0], async function (base64) {
        const payload = {
            id: eventId,
            judul: document.getElementById('j-judul').value,
            tanggal: document.getElementById('j-tanggal').value,
            lokasi: document.getElementById('j-lokasi').value,
            harga: document.getElementById('j-harga').value,
            kuota: kuota,
            qrImage: base64,
            tiketList: tiketList
        };

        const res = await fetch(`${API_BASE_URL}/admin/jadwal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(`✅ Event & ${kuota} Barcode Tiket berhasil dibuat!`);
            overlay.classList.add('hidden');
            e.target.reset();
            fetchAdminData();
        }
    });
});

// --- SCANNER TIKET & VERIFIKASI ---
let html5QrcodeScanner = null;
window.startScanner = function () {
    openModal('modal-scanner');
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 150 } }, false);
        html5QrcodeScanner.render(
            (decodedText) => {
                document.getElementById('input-kode-tiket').value = decodedText;
                closeScannerModal();
                document.getElementById('form-verifikasi').dispatchEvent(new Event('submit'));
            },
            () => {}
        );
    }
};

window.stopScanner = function () {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error(e));
        html5QrcodeScanner = null;
    }
};

document.getElementById('form-verifikasi').addEventListener('submit', function (e) {
    e.preventDefault();
    const val = document.getElementById('input-kode-tiket').value.trim().toUpperCase();
    const box = document.getElementById('hasil-verifikasi');
    box.classList.remove('hidden');

    let found = null;
    let jJudul = "";
    for (let j of db.jadwal) {
        const t = (j.tiketList || []).find(x => x.kode === val);
        if (t) {
            found = t;
            jJudul = j.judul;
            break;
        }
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

// --- DATA PEMBELI & LUNAS EMAIL ---
window.bukaDataPembeli = function (idJadwal, judul) {
    document.getElementById('title-pembeli').innerText = "Event: " + judul;
    const tBody = document.getElementById('list-pembeli');
    tBody.innerHTML = '';
    const j = db.jadwal.find(x => x.id == idJadwal);
    const terjualList = (j.tiketList || []).filter(t => t.status !== 'Tersedia');

    if (terjualList.length === 0) {
        tBody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Belum ada tiket yang dipesan.</td></tr>';
    }

    terjualList.forEach(p => {
        const isL = p.status === 'Lunas';
        tBody.innerHTML += `
        <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
            <td class="p-4 font-mono font-bold text-brand-red">${p.kode}</td>
            <td class="p-4 font-bold text-white">${p.nama}</td>
            <td class="p-4 text-xs text-gray-400">${p.email}<br>${p.wa}</td>
            <td class="p-4 font-bold ${isL ? 'text-green-500' : 'text-yellow-500'}">${p.status}</td>
            <td class="p-4 text-center">
                ${!isL ? `<button onclick="konfirmasiLunas(${j.id}, '${p.kode}')" class="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold shadow hover:bg-green-500"><i class="fa-solid fa-paper-plane mr-1"></i> Lunas & Email Barcode</button>` : `<button onclick="batalLunas(${j.id}, '${p.kode}')" class="bg-gray-800 text-gray-400 px-4 py-2 rounded text-xs hover:text-white hover:bg-red-600">Batal Lunas</button>`}
            </td>
        </tr>`;
    });
    openModal('modal-pembeli');
};

window.konfirmasiLunas = async function (idJadwal, kode) {
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
        const body = encodeURIComponent(`Halo ${t.nama},\n\nPembayaran tiket Anda telah dikonfirmasi!\n\nLakon: ${j.judul}\nKode Tiket: ${t.kode}\n\nSilakan tunjukkan Kode ini atau buka link Barcode berikut pada saat check-in:\n${barcodeUrl}\n\nTerima kasih,\nTeater SAMANTHA`);
        window.location.href = `mailto:${t.email}?subject=${subject}&body=${body}`;

        alert('✅ Tiket dilunaskan! Jendela email barcode akan terbuka.');
        bukaDataPembeli(idJadwal, j.judul);
        renderUI();
    }
};

window.batalLunas = async function (idJadwal, kode) {
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

// --- MANAJEMEN SDM (ANGGOTA) ---
window.bukaModalAnggota = function (id = null) {
    document.getElementById('form-anggota').reset();
    document.getElementById('a-id').value = '';
    if (id) {
        const a = db.anggota.find(x => x.id === id);
        if (a) {
            document.getElementById('a-id').value = a.id;
            document.getElementById('a-nama').value = a.nama;
            document.getElementById('a-divisi').value = a.divisi;
            document.getElementById('a-status').value = a.status;
            document.getElementById('title-anggota').innerText = "Edit Anggota";
        }
    } else {
        document.getElementById('title-anggota').innerText = "Tambah Anggota Baru";
    }
    openModal('modal-anggota');
};

document.getElementById('form-anggota').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('a-id').value;
    const fotoFile = document.getElementById('a-foto').files[0];
    let data = {
        id: id || null,
        nama: document.getElementById('a-nama').value,
        divisi: document.getElementById('a-divisi').value,
        status: document.getElementById('a-status').value
    };

    if (fotoFile) {
        processImage(fotoFile, function (base64) {
            data.foto = base64;
            simpanDataAnggotaBackend(data);
        });
    } else {
        if (id) {
            const existA = db.anggota.find(x => x.id == id);
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
        overlay.classList.add('hidden');
        fetchAdminData();
    }
}

// --- GOOGLE SHEETS / CSV OPREC PARSER ---
function parseCSV(text) {
    let result = [];
    let row = [];
    let inQuotes = false;
    let val = '';
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            row.push(val.trim());
            val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(val.trim());
            result.push(row);
            row = [];
            val = '';
        } else {
            val += char;
        }
    }
    if (val || row.length > 0) {
        row.push(val.trim());
        result.push(row);
    }
    return result;
}

document.getElementById('form-import-oprec').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('import-url').value;
    document.getElementById('modal-import-oprec').classList.add('hidden');

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
                    prodi: row[3] || '-',
                    wa: row[4] || '-',
                    posisi: 'Calon Anggota'
                });
            }

            const res = await fetch(`${API_BASE_URL}/admin/pendaftar-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: imported })
            });

            if (res.ok) {
                alert(`✅ Sinkronisasi Berhasil! ${imported.length} pendaftar ditarik.`);
                e.target.reset();
                fetchAdminData();
            }
        })
        .catch(err => alert('❌ ' + err.message));
});

// --- EDIT OPREC LOKAL ---
window.bukaModalOprec = function (id) {
    const p = db.pendaftar.find(x => x.id === id);
    if (p) {
        document.getElementById('o-id').value = p.id;
        document.getElementById('o-nama').value = p.nama;
        document.getElementById('o-nim').value = p.nim;
        document.getElementById('o-wa').value = p.wa;
        document.getElementById('o-posisi').value = p.posisi;
        openModal('modal-oprec');
    }
};

document.getElementById('form-oprec').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('o-id').value;
    const idx = db.pendaftar.findIndex(x => x.id == id);
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
        overlay.classList.add('hidden');
        renderUI();
    }
});

// Export CSV
window.exportCSVOprec = function () {
    let csv = [];
    let rows = document.getElementById('table-export-oprec').querySelectorAll('tr');
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

// --- PESAN, GALERI, PROFIL, PRESTASI ---
window.bacaPesan = function (nama, kontak, isi) {
    document.getElementById('msg-nama').innerText = nama;
    document.getElementById('msg-kontak').innerText = kontak;
    document.getElementById('msg-isi').innerText = isi;
    document.getElementById('btn-balas-email').href = `mailto:${kontak}?subject=Balasan dari Teater Samantha`;
    openModal('modal-pesan');
};

document.getElementById('form-galeri').addEventListener('submit', (e) => {
    e.preventDefault();
    processImage(document.getElementById('g-file').files[0], async function (b64) {
        const payload = {
            src: b64,
            kategori: document.getElementById('g-kategori').value
        };
        const res = await fetch(`${API_BASE_URL}/admin/galeri`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Foto Galeri Berhasil Ditambahkan.");
            overlay.classList.add('hidden');
            e.target.reset();
            fetchAdminData();
        }
    });
});

document.getElementById('form-profil').addEventListener('submit', async (e) => {
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
    if (res.ok) alert("Pengaturan Web Diperbarui");
});

['f-logo', 'f-bg', 'f-tentang'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
        if (e.target.files[0]) {
            processImage(e.target.files[0], async function (b64) {
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
                    alert("Gambar Berhasil Diperbarui!");
                    fetchAdminData();
                }
            });
        }
    });
});

document.getElementById('form-prestasi').addEventListener('submit', async (e) => {
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
        alert("Prestasi Ditambahkan.");
        e.target.reset();
        fetchAdminData();
    }
});