// frontend/js/admin.js

let db = { users: [], profil: {}, prestasi: [], jadwal: [], galeri: [], anggota: [], pendaftar: [], pesan: [] };
const BACKUP_KEY = 'samantha_persistent_backup';

// --- FITUR AUTO-BACKUP & AUTO-RESTORE (ANTI DATA KERESET) ---
function simpanBackupLokal() {
    try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(db));
        const badge = document.getElementById('badge-auto-backup');
        if (badge) badge.classList.remove('hidden');
    } catch(e) { console.error("LocalStorage penuh", e); }
}

async function cekDanRestoreBackup() {
    // Jika data jadwal di server kosong (misal sehabis redeploy Vercel)
    if (!db.jadwal || db.jadwal.length === 0) {
        const cadangan = localStorage.getItem(BACKUP_KEY);
        if (cadangan) {
            try {
                const parsed = JSON.parse(cadangan);
                if (parsed.jadwal && parsed.jadwal.length > 0) {
                    const res = await fetch(`${API_BASE_URL}/admin/restore-backup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsed)
                    });
                    if (res.ok) {
                        db = parsed;
                        renderUI();
                        console.log("✅ Data berhasil dipulihkan otomatis dari cadangan browser!");
                    }
                }
            } catch(e) { console.error("Gagal restore:", e); }
        }
    }
}

// --- KOMPRESI GAMBAR ---
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
            await cekDanRestoreBackup();
            simpanBackupLokal();
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
        let penontonHadir = 0;
        (db.jadwal || []).forEach(j => {
            (j.tiketList || []).forEach(t => {
                if (t.status === 'Lunas') tiketLunas++;
                if (t.checkIn) penontonHadir++;
            });
        });
        const tiketEl = document.getElementById('stat-tiket');
        if (tiketEl) tiketEl.innerText = tiketLunas;
        const hadirEl = document.getElementById('stat-hadir');
        if (hadirEl) hadirEl.innerText = penontonHadir;

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
        const otsSelect = document.getElementById('ots-jadwal');
        if (otsSelect) otsSelect.innerHTML = (db.jadwal || []).map(j => `<option value="${j.id}">${j.judul} (Rp ${j.harga})</option>`).join('');

        if (jContainer) {
            jContainer.innerHTML = (db.jadwal || []).map(j => {
                const trj = (j.tiketList || []).filter(t => t.status !== 'Tersedia').length;
                const hadirCount = (j.tiketList || []).filter(t => t.checkIn).length;
                return `
                <div class="bg-gray-900 border border-gray-800 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-l-red-600 shadow-lg mb-4 gap-4">
                    <div>
                        <h4 class="font-bold text-white text-lg">${j.judul}</h4>
                        <p class="text-xs text-gray-400 mt-2 font-mono"><i class="fa-regular fa-calendar text-red-600"></i> ${j.tanggal} | <i class="fa-solid fa-location-dot text-red-600"></i> ${j.lokasi}</p>
                        <div class="mt-3 flex gap-2 flex-wrap">
                            <span class="bg-black text-gray-300 px-3 py-1 text-xs rounded border border-gray-700 font-bold">Harga: Rp ${j.harga}</span>
                            <span class="bg-green-900/30 text-green-500 border border-green-900 px-3 py-1 text-xs rounded font-bold">Terjual: ${trj}/${j.kuota}</span>
                            <span class="bg-emerald-950/40 text-emerald-400 border border-emerald-800 px-3 py-1 text-xs rounded font-bold"><i class="fa-solid fa-door-open mr-1"></i> Hadir: ${hadirCount}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
                        <button type="button" onclick="bukaDataPembeli(${j.id}, '${j.judul}')" class="bg-blue-600 text-white px-3 py-2 text-xs font-bold rounded hover:bg-blue-500 shadow"><i class="fa-solid fa-users mr-1"></i> Presensi Penonton</button>
                        <button type="button" onclick="bukaModalEditJadwal(${j.id})" class="bg-yellow-600/30 text-yellow-400 border border-yellow-700 px-3 py-2 text-xs font-bold rounded hover:bg-yellow-600 hover:text-white transition"><i class="fa-solid fa-pen mr-1"></i> Edit Event</button>
                        <button type="button" onclick="hapusData('jadwal', ${j.id})" class="bg-red-900/50 text-red-500 border border-red-900 px-3 py-2 text-xs rounded hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
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

        // Render Pendaftar Oprec (Rapi Kolom per Kolom)
        const tPendaftar = document.getElementById('tabel-pendaftar');
        if (tPendaftar) {
            tPendaftar.innerHTML = (db.pendaftar || []).length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-gray-500">Belum ada data ditarik dari Cloud/Lokal.</td></tr>' : db.pendaftar.map(p => `
                <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td class="p-4 font-mono text-xs">${p.tgl}</td>
                    <td class="p-4">
                        <strong class="text-white text-base block">${p.nama}</strong>
                        <span class="text-xs text-gray-400 font-mono font-bold text-red-400">${p.nim}</span>
                        ${p.prodi && p.prodi !== '-' ? `<span class="text-xs text-gray-500"> | ${p.prodi}</span>` : ''}
                    </td>
                    <td class="p-4 text-xs">
                        <a href="https://wa.me/${p.wa.replace(/[^0-9]/g, '')}" target="_blank" class="text-green-400 hover:underline font-mono font-bold block mb-1">
                            <i class="fa-brands fa-whatsapp mr-1"></i>${p.wa}
                        </a>
                        <span class="px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800 text-[10px] font-bold">${p.posisi}</span>
                    </td>
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

        // Render Akun
        const tUsers = document.getElementById('tabel-users');
        if (tUsers) {
            const roleLabels = { admin: "Super Admin", support: "Support", sekre: "Sekretaris", media: "Media" };
            tUsers.innerHTML = (db.users || []).map(u => `
                <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td class="p-4 font-bold text-white flex items-center gap-2"><i class="fa-solid fa-user-circle text-gray-500"></i> ${u.user}</td>
                    <td class="p-4"><span class="px-2 py-1 text-xs font-bold rounded bg-red-900/30 text-red-400 border border-red-800">${roleLabels[u.role] || u.role}</span></td>
                    <td class="p-4 text-center">
                        ${u.user.toLowerCase() === 'admin' ? '<span class="text-xs text-gray-500 italic">Akun Utama</span>' : `<button type="button" onclick="hapusUser('${u.user}')" class="text-red-500 hover:text-white px-3 py-1 rounded bg-red-900/20 border border-red-900 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>`}
                    </td>
                </tr>`).join('');
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

// --- AUTH & TAB TOGGLE ---
const loginSect = document.getElementById('login-section');
const dashSect = document.getElementById('dashboard-section');

function bukaDashboard() {
    if (loginSect) loginSect.style.display = 'none';
    if (dashSect) {
        dashSect.style.display = 'flex';
        dashSect.classList.remove('hidden');
    }
}

let activeUser = JSON.parse(sessionStorage.getItem('active_user'));
if (activeUser) {
    bukaDashboard();
    applyRoleRestrictions(activeUser.role);
    fetchAdminData();
}

document.getElementById('tab-login')?.addEventListener('click', function(e) {
    e.preventDefault();
    this.className = "w-1/2 pb-2 text-red-600 border-b-2 border-red-600 font-bold text-sm";
    document.getElementById('tab-register').className = "w-1/2 pb-2 text-gray-500 font-bold text-sm hover:text-gray-300";
    document.getElementById('login-form')?.classList.remove('hidden');
    document.getElementById('register-form')?.classList.add('hidden');
});

document.getElementById('tab-register')?.addEventListener('click', function(e) {
    e.preventDefault();
    this.className = "w-1/2 pb-2 text-red-600 border-b-2 border-red-600 font-bold text-sm";
    document.getElementById('tab-login').className = "w-1/2 pb-2 text-gray-500 font-bold text-sm hover:text-gray-300";
    document.getElementById('register-form')?.classList.remove('hidden');
    document.getElementById('login-form')?.classList.add('hidden');
});

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
        const result = await res.json();

        if (res.ok && result.success) {
            sessionStorage.setItem('active_user', JSON.stringify(result.user));
            activeUser = result.user;
            bukaDashboard();
            applyRoleRestrictions(result.user.role);
            fetchAdminData();
        } else {
            alert('❌ ' + (result.error || 'Username atau Password Salah!'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Gagal menghubungi server backend.');
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
    document.getElementById('nav-tiket').classList.remove('hidden');
    document.getElementById('nav-sdm').classList.remove('hidden');
    document.getElementById('nav-pesan').classList.remove('hidden');
    document.getElementById('nav-galeri').classList.remove('hidden');
    document.getElementById('nav-setup').classList.remove('hidden');

    const navUsers = document.getElementById('nav-users');
    if (navUsers) {
        if (role === 'admin') navUsers.classList.remove('hidden');
        else navUsers.classList.add('hidden');
    }

    if (role === 'sekre') {
        document.getElementById('nav-tiket').classList.add('hidden');
        document.getElementById('nav-galeri').classList.add('hidden');
    } else if (role === 'media') {
        document.getElementById('nav-sdm').classList.add('hidden');
        document.getElementById('nav-pesan').classList.add('hidden');
        document.getElementById('nav-setup').classList.add('hidden');
    }
    const roleName = { admin: "Super Admin", support: "Support", sekre: "Sekretaris", media: "Media" };
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
window.closeScannerModal = function() {
    if (overlay) overlay.classList.add('hidden');
    stopScanner();
};
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeScannerModal));

// --- 1. KAMERA SCANNER LANGSUNG (DIRECT CAMERA STREAM) ---
let html5QrCode = null;
window.startScanner = async function() {
    openModal('modal-scanner');
    const readerEl = document.getElementById('reader');
    if (readerEl) readerEl.innerHTML = '<span class="text-xs text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Membuka Kamera Belakang...</span>';

    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e) {}
        html5QrCode = null;
    }

    try {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 250, height: 150 }, aspectRatio: 1.777778 };

        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    document.getElementById('input-kode-tiket').value = decodedText;
                    closeScannerModal();
                    document.getElementById('form-verifikasi')?.dispatchEvent(new Event('submit'));
                },
                () => {}
            );
        } catch (camErr) {
            await html5QrCode.start(
                { facingMode: "user" },
                config,
                (decodedText) => {
                    document.getElementById('input-kode-tiket').value = decodedText;
                    closeScannerModal();
                    document.getElementById('form-verifikasi')?.dispatchEvent(new Event('submit'));
                },
                () => {}
            );
        }
    } catch (err) {
        console.error(err);
        if (readerEl) {
            readerEl.innerHTML = `<div class="p-4 text-xs text-red-400 bg-black/60 rounded">⚠️ Izin kamera belum diberikan atau browser memblokirnya.<br>Silakan izinkan kamera di browser Anda atau ketik kode manual di bawah.</div>`;
        }
    }
};

window.stopScanner = async function() {
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e) {}
        html5QrCode = null;
    }
};

// --- 2. VERIFIKASI BARCODE & CHECK-IN CATATAN PENONTON ---
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
        const isAlreadyCheckedIn = found.checkIn;
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-green-900/20 border-green-500 text-white text-sm shadow-xl flex flex-col items-center w-full';
        box.innerHTML = `
            <i class="fa-solid fa-circle-check text-4xl text-green-400 mb-2"></i>
            <strong class="text-lg text-green-400">TIKET VALID & LUNAS!</strong>
            <span class="text-gray-300 mt-1 block">Pemilik: <b>${found.nama}</b> | Event: ${jJudul}</span>
            <img src="${barcodeUrl}" class="p-2 bg-white rounded my-3 max-w-full">
            
            ${isAlreadyCheckedIn ? `
                <div class="bg-red-900/40 border border-red-500 text-red-300 p-3 rounded mb-2 text-xs w-full text-center">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i> <b>PERINGATAN: TIKET SUDAH DIPAKAI!</b><br>
                    Waktu Masuk: <b>${found.checkInTime || '-'}</b><br>
                    Catatan: <b>${found.catatan || '-'}</b>
                </div>
            ` : `
                <div class="w-full bg-black/60 p-3 border border-gray-800 rounded mb-2">
                    <label class="block text-[11px] font-bold text-gray-400 mb-1 text-left">Catatan Penonton / No. Kursi:</label>
                    <input type="text" id="input-catatan-checkin" placeholder="Contoh: Kursi A-12, VIP Pintu Barat" value="${found.catatan || ''}" class="w-full bg-gray-900 border border-gray-700 p-2 text-xs text-white rounded outline-none focus:border-green-500 mb-3">
                    <button type="button" onclick="prosesCheckIn('${found.kode}')" class="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded font-bold text-xs shadow transition">
                        <i class="fa-solid fa-door-open mr-1"></i> Konfirmasi Masuk (Check-In Sekarang)
                    </button>
                </div>
            `}
        `;
    } else if (found && found.status === 'Pending') {
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-yellow-900/20 border-yellow-500 text-yellow-400 text-sm shadow-xl w-full';
        box.innerHTML = `<i class="fa-solid fa-circle-exclamation text-4xl mb-2"></i><br><strong class="text-lg">TIKET BELUM DILUNASI</strong><br><span class="text-white mt-2 block">Lunasi di Data Pembeli terlebih dahulu.<br>Pemilik: ${found.nama}</span>`;
    } else {
        box.className = 'p-4 rounded-lg border-2 mt-4 bg-red-900/20 border-red-500 text-red-400 text-sm shadow-xl w-full';
        box.innerHTML = `<i class="fa-solid fa-circle-xmark text-4xl mb-2"></i><br><strong class="text-lg">BARCODE SALAH / PALSU</strong>`;
    }
});

// Aksi Check-In Tiket
window.prosesCheckIn = async function(kode) {
    const catatan = document.getElementById('input-catatan-checkin')?.value.trim();
    try {
        const res = await fetch(`${API_BASE_URL}/admin/tiket/checkin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kode, catatan })
        });
        const result = await res.json();
        if (res.ok) {
            alert('✅ Penonton berhasil Check-In masuk pementasan!');
            fetchAdminData();
            document.getElementById('form-verifikasi')?.dispatchEvent(new Event('submit'));
        } else {
            alert('❌ ' + result.error);
        }
    } catch(err) { alert('❌ Gagal check-in: ' + err.message); }
};

// --- 3. FITUR EDIT EVENT JADWAL ---
window.bukaModalEditJadwal = function(id) {
    const j = (db.jadwal || []).find(x => x.id == id);
    if (!j) return alert('Event tidak ditemukan');
    document.getElementById('ej-id').value = j.id;
    document.getElementById('ej-judul').value = j.judul;
    document.getElementById('ej-tanggal').value = j.tanggal;
    document.getElementById('ej-lokasi').value = j.lokasi;
    document.getElementById('ej-harga').value = j.harga;
    document.getElementById('ej-kuota').value = j.kuota;
    openModal('modal-edit-jadwal');
};

document.getElementById('form-edit-jadwal')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('ej-id').value;
    const qrFile = document.getElementById('ej-qr')?.files?.[0];

    const updateEvent = async (qrBase64) => {
        const payload = {
            judul: document.getElementById('ej-judul').value.trim(),
            tanggal: document.getElementById('ej-tanggal').value,
            lokasi: document.getElementById('ej-lokasi').value.trim(),
            harga: parseInt(document.getElementById('ej-harga').value),
            kuota: parseInt(document.getElementById('ej-kuota').value)
        };
        if (qrBase64) payload.qrImage = qrBase64;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/jadwal/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok) {
                alert('✅ Event berhasil diperbarui!');
                if (overlay) overlay.classList.add('hidden');
                fetchAdminData();
            } else {
                alert('❌ ' + result.error);
            }
        } catch(err) { alert('❌ Gagal update event: ' + err.message); }
    };

    if (qrFile) {
        processImage(qrFile, updateEvent);
    } else {
        updateEvent(null);
    }
});

// --- 4. TIKETING MANUAL (OTS / ON THE SPOT) ---
window.bukaModalOTS = function() {
    if ((db.jadwal || []).length === 0) return alert('Silakan buat event pementasan terlebih dahulu!');
    openModal('modal-ots');
};

document.getElementById('form-ots')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        jadwalId: document.getElementById('ots-jadwal').value,
        nama: document.getElementById('ots-nama').value.trim(),
        wa: document.getElementById('ots-wa').value.trim(),
        catatan: document.getElementById('ots-catatan').value.trim(),
        autoCheckIn: document.getElementById('ots-autocheckin').checked
    };
    try {
        const res = await fetch(`${API_BASE_URL}/admin/tiket/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            alert(`✅ Tiket OTS Berhasil Diterbitkan!\n\nKode Tiket: ${result.kode}\nStatus: LUNAS & ${payload.autoCheckIn ? 'SUDAH CHECK-IN' : 'BELUM MASUK'}`);
            if (overlay) overlay.classList.add('hidden');
            this.reset();
            fetchAdminData();
        } else {
            alert('❌ ' + result.error);
        }
    } catch(err) { alert('❌ Gagal: ' + err.message); }
});

// --- 5. DATA PEMBELI & PRESENSI PENONTON LENGKAP ---
let currentEventPresensiId = null;
let currentFilterPresensi = 'semua';

window.bukaDataPembeli = function(idJadwal, judul) {
    currentEventPresensiId = idJadwal;
    const tTitle = document.getElementById('title-pembeli');
    if (tTitle) tTitle.innerText = "Event: " + judul;
    filterPresensi('semua');
    openModal('modal-pembeli');
};

window.filterPresensi = function(tipe) {
    currentFilterPresensi = tipe;
    document.querySelectorAll('.btn-filter-presensi').forEach(b => {
        b.className = "btn-filter-presensi px-3 py-1 text-xs font-bold rounded bg-gray-800 text-gray-300 hover:text-white";
    });
    const activeBtn = event?.target;
    if (activeBtn) activeBtn.className = "btn-filter-presensi active px-3 py-1 text-xs font-bold rounded bg-red-600 text-white";

    const j = (db.jadwal || []).find(x => x.id == currentEventPresensiId);
    if (!j) return;

    const allSold = (j.tiketList || []).filter(t => t.status !== 'Tersedia');
    const totalLunas = allSold.filter(t => t.status === 'Lunas').length;
    const totalHadir = allSold.filter(t => t.checkIn).length;
    const totalBelum = totalLunas - totalHadir;

    document.getElementById('rekap-total').innerText = allSold.length;
    document.getElementById('rekap-lunas').innerText = totalLunas;
    document.getElementById('rekap-hadir').innerText = totalHadir;
    document.getElementById('rekap-belum').innerText = totalBelum > 0 ? totalBelum : 0;

    let filtered = allSold;
    if (tipe === 'hadir') filtered = allSold.filter(t => t.checkIn);
    else if (tipe === 'belum') filtered = allSold.filter(t => !t.checkIn);

    const tBody = document.getElementById('list-pembeli');
    if (!tBody) return;
    tBody.innerHTML = '';

    if (filtered.length === 0) {
        tBody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500">Tidak ada data untuk filter ini.</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const isL = p.status === 'Lunas';
        tBody.innerHTML += `
        <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
            <td class="p-4 font-mono font-bold text-red-500">${p.kode}</td>
            <td class="p-4 font-bold text-white">${p.nama}<br><span class="text-xs text-gray-400">${p.email} / ${p.wa}</span></td>
            <td class="p-4 font-bold ${isL?'text-green-500':'text-yellow-500'}">${p.status}</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs rounded font-bold ${p.checkIn?'bg-green-900/40 text-green-400 border border-green-800':'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}">
                    ${p.checkIn ? `<i class="fa-solid fa-circle-check mr-1"></i> Masuk (${p.checkInTime})` : '<i class="fa-regular fa-clock mr-1"></i> Belum Datang'}
                </span>
            </td>
            <td class="p-4 text-xs text-gray-400 font-mono">${p.catatan || '-'}</td>
            <td class="p-4 text-center">
                ${!isL ? `<button type="button" onclick="konfirmasiLunas(${j.id}, '${p.kode}')" class="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow hover:bg-green-500"><i class="fa-solid fa-paper-plane mr-1"></i> Lunas</button>` : `<button type="button" onclick="batalLunas(${j.id}, '${p.kode}')" class="bg-gray-800 text-gray-400 px-3 py-1.5 rounded text-xs hover:text-white hover:bg-red-600">Batal Lunas</button>`}
            </td>
        </tr>`;
    });
};

// Download CSV Rekap Presensi
document.getElementById('btn-export-presensi')?.addEventListener('click', function() {
    const j = (db.jadwal || []).find(x => x.id == currentEventPresensiId);
    if (!j) return alert('Event tidak dipilih');
    const allSold = (j.tiketList || []).filter(t => t.status !== 'Tersedia');

    let csv = "Kode Tiket,Nama Pembeli,Email,WhatsApp,Status Pembayaran,Status Kehadiran,Jam Masuk,Catatan Kursi\n";
    allSold.forEach(p => {
        csv += `"${p.kode}","${p.nama}","${p.email}","${p.wa}","${p.status}","${p.checkIn ? 'Hadir' : 'Belum Hadir'}","${p.checkInTime || '-'}","${p.catatan || '-'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Presensi_${j.judul.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
});

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
        bukaDataPembeli(idJadwal, j.judul);
        fetchAdminData();
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
        bukaDataPembeli(idJadwal, j.judul);
        fetchAdminData();
    }
};

// --- 6. TARIK DATA G-FORM / GOOGLE SHEETS (SMART HEADER DETECTOR) ---
function parseSmartCSV(text) {
    if (!text) return [];
    text = text.replace(/^\uFEFF/, '').trim();
    
    // Auto-detect pemisah koma (,) atau titik-koma (;)
    const firstLine = text.split('\n')[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const sep = semiCount > commaCount ? ';' : ',';

    let result = [], row = [], inQuotes = false, val = '';
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') { val += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === sep && !inQuotes) {
            row.push(val.trim()); val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(val.trim());
            if (row.some(c => c.length > 0)) result.push(row);
            row = []; val = '';
        } else { val += char; }
    }
    if (val || row.length > 0) {
        row.push(val.trim());
        if (row.some(c => c.length > 0)) result.push(row);
    }
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
                throw new Error("Link salah! Pastikan memilih opsi 'CSV (Nilai yang dipisahkan koma)' saat Publikasikan ke Web.");
            }
            const lines = parseSmartCSV(csvText);
            if (lines.length <= 1) throw new Error("File CSV kosong atau tidak ada data pendaftar.");

            // Deteksi Header Baris Pertama
            const headers = lines[0].map(h => h.toLowerCase().trim());
            const idxNama = headers.findIndex(h => h.includes('nama'));
            const idxNim = headers.findIndex(h => h.includes('nim') || h.includes('npm') || h.includes('induk'));
            const idxProdi = headers.findIndex(h => h.includes('prodi') || h.includes('jurusan') || h.includes('program studi'));
            const idxWa = headers.findIndex(h => h.includes('wa') || h.includes('whatsapp') || h.includes('telepon') || h.includes('hp') || h.includes('kontak') || h.includes('nomor'));
            const idxPosisi = headers.findIndex(h => h.includes('posisi') || h.includes('divisi') || h.includes('minat') || h.includes('bidang') || h.includes('alasan'));

            let imported = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i];
                if (row.length < 2) continue;

                // Ambil nilai kolom berdasarkan header atau fallback urutan
                const tgl = row[0] ? row[0].split(' ')[0] : '-';
                const nama = (idxNama !== -1 ? row[idxNama] : row) || '-';
                const nim = (idxNim !== -1 ? row[idxNim] : (row || '-'));
                const prodi = (idxProdi !== -1 ? row[idxProdi] : (row || '-'));
                const wa = (idxWa !== -1 ? row[idxWa] : (row[row.length - 1] || '-'));
                const posisi = (idxPosisi !== -1 ? row[idxPosisi] : 'Calon Anggota');

                imported.push({
                    id: Date.now() + i,
                    tgl: tgl,
                    nama: nama,
                    nim: nim,
                    prodi: prodi,
                    wa: wa,
                    posisi: posisi
                });
            }

            const res = await fetch(`${API_BASE_URL}/admin/pendaftar-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: imported })
            });
            if (res.ok) {
                alert(`✅ Sinkronisasi Berhasil! ${imported.length} pendaftar ditarik dengan rapi.`);
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
        const oProdi = document.getElementById('o-prodi'); if (oProdi) oProdi.value = p.prodi || '';
        const oWa = document.getElementById('o-wa'); if (oWa) oWa.value = p.wa;
        const oPos = document.getElementById('o-posisi'); if (oPos) oPos.value = p.posisi || '';
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
        db.pendaftar[idx].prodi = document.getElementById('o-prodi').value;
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
    let csv = "Tanggal,Nama Lengkap,NIM,Program Studi,WhatsApp,Posisi\n";
    (db.pendaftar || []).forEach(p => {
        csv += `"${p.tgl}","${p.nama}","${p.nim}","${p.prodi}","${p.wa}","${p.posisi}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Data_Oprec_Samantha.csv';
    link.click();
};

// --- 7. MANAJEMEN AKUN (SUPER ADMIN) ---
document.getElementById('form-tambah-user')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        user: document.getElementById('u-user').value.trim(),
        pass: document.getElementById('u-pass').value.trim(),
        role: document.getElementById('u-role').value
    };
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            alert('✅ ' + result.message);
            this.reset();
            fetchAdminData();
        } else {
            alert('❌ ' + result.error);
        }
    } catch(err) { alert('❌ Gagal: ' + err.message); }
});

window.hapusUser = async function(username) {
    if (confirm(`Yakin ingin menghapus akun"${username}"?`)) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${username}`, { method: 'DELETE' });
            const result = await res.json();
            if (res.ok) {
                alert('✅ ' + result.message);
                fetchAdminData();
            } else {
                alert('❌ ' + result.error);
            }
        } catch(err) { alert('❌ Gagal: ' + err.message); }
    }
};

// --- 8. BUAT EVENT JADWAL BARU ---
document.getElementById('form-jadwal')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const kuota = parseInt(document.getElementById('j-kuota').value);
    const eventId = Date.now();
    let tiketList = [];
    for (let i = 1; i <= kuota; i++) {
        let num = i.toString().padStart(3, '0');
        tiketList.push({ kode: `STU-${eventId.toString().slice(-4)}-${num}`, status: 'Tersedia', nama: '', email: '', wa: '', checkIn: false, catatan: '' });
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

// --- 9. KELOLA SDM ANGGOTA ---
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

// --- 10. UPLOAD GALERI ---
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

// --- 11. PESAN INBOX ---
window.bacaPesan = function(nama, kontak, isi) {
    const mNama = document.getElementById('msg-nama'); if (mNama) mNama.innerText = nama;
    const mKontak = document.getElementById('msg-kontak'); if (mKontak) mKontak.innerText = kontak;
    const mIsi = document.getElementById('msg-isi'); if (mIsi) mIsi.innerText = isi;
    const bBalas = document.getElementById('btn-balas-email');
    if (bBalas) bBalas.href = `mailto:${kontak}?subject=Balasan dari Teater Samantha`;
    openModal('modal-pesan');
};

// --- 12. PENGATURAN PROFIL & PRESTASI ---
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