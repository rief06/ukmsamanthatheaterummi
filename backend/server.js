// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// Baca file .env jika ada (aman dari crash)
try { require('dotenv').config(); } catch(e) {}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Melayani file statis frontend saat lokal
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Ambil akun admin utama dari file .env
const defaultAdminUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
const defaultAdminPass = (process.env.ADMIN_PASS || "samanthanewgeneration").trim();

// --- DATABASE MEMORY (DENGAN BACKUP RESTORE AUTO-SYNC) ---
let db = {
    users: [
        { user: defaultAdminUser, pass: defaultAdminPass, role: "admin" }
    ],
    profil: {
        nama: "SAMANTHA Theater",
        sejarah: "Wadah berekspresi seni teater.",
        email: "st@example.com",
        telepon: "08",
        sosmed: { ig: "#", tiktok: "#" },
        statusOprec: "Buka",
        linkOprec: "#",
        logo: "https://placehold.co/100",
        bgHero: "https://picsum.photos/id/171/1920/1080",
        imgTentang: "https://picsum.photos/id/452/800/1000"
    },
    prestasi: [],
    jadwal: [],
    galeri: [],
    anggota: [],
    pendaftar: [],
    pesan: []
};

// ================= 1. AUTO-RESTORE BACKUP API =================
app.post(['/api/admin/restore-backup', '/admin/restore-backup'], (req, res) => {
    const backup = req.body;
    if (backup && typeof backup === 'object') {
        if (backup.jadwal && backup.jadwal.length > 0) db.jadwal = backup.jadwal;
        if (backup.anggota && backup.anggota.length > 0) db.anggota = backup.anggota;
        if (backup.pendaftar && backup.pendaftar.length > 0) db.pendaftar = backup.pendaftar;
        if (backup.prestasi && backup.prestasi.length > 0) db.prestasi = backup.prestasi;
        if (backup.galeri && backup.galeri.length > 0) db.galeri = backup.galeri;
        if (backup.profil && backup.profil.nama) db.profil = backup.profil;
        if (backup.users && backup.users.length > 0) db.users = backup.users;
        return res.json({ success: true, message: "Database berhasil dipulihkan dari cadangan!" });
    }
    res.status(400).json({ error: "Cadangan data tidak valid" });
});

// ================= 2. AUTH HANDLERS =================
const handleLogin = (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};
    const user = (body.user || body.username || '').trim().toLowerCase();
    const pass = (body.pass || body.password || '').trim();

    const users = db.users || [{ user: "admin", pass: "admin123", role: "admin" }];
    const u = users.find(x => x.user.toLowerCase() === user && x.pass === pass);
    if (!u) return res.status(401).json({ error: "Username atau Password salah" });
    return res.json({ success: true, user: { user: u.user, role: u.role } });
};

const handleRegister = (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};
    const user = (body.user || '').trim().toLowerCase();
    const pass = (body.pass || '').trim();
    const role = body.role || 'admin';

    if ((db.users || []).find(x => x.user.toLowerCase() === user)) {
        return res.status(400).json({ error: "Username sudah terdaftar" });
    }
    db.users.push({ user, pass, role });
    res.status(201).json({ success: true, message: "Akun berhasil dibuat" });
};

// ================= 3. PUBLIC HANDLERS =================
const handlePesan = (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};
    const { nama, kontak, isi } = body;
    const baru = { id: Date.now(), nama: nama || "Pengunjung", kontak: kontak || "-", isi: isi || "-", tgl: new Date().toLocaleDateString('id-ID') };
    db.pesan.push(baru);
    res.status(201).json({ message: "Pesan terkirim", data: baru });
};

const handleCheckout = (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};
    const { jadwalId, nama, email, wa } = body;
    const j = (db.jadwal || []).find(x => x.id == jadwalId) || (db.jadwal || [])[0];
    if (!j) return res.status(404).json({ error: "Jadwal belum dibuat" });

    const tiketTersedia = (j.tiketList || []).find(t => t.status === 'Tersedia');
    if (!tiketTersedia) return res.status(400).json({ error: "Tiket habis" });

    tiketTersedia.nama = nama;
    tiketTersedia.email = email;
    tiketTersedia.wa = wa;
    tiketTersedia.status = 'Pending';

    res.json({ message: "Tiket berhasil dibooking", kode: tiketTersedia.kode });
};

// ================= 4. CRUD JADWAL & EDIT EVENT =================
app.post(['/api/admin/jadwal', '/admin/jadwal'], (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    db.jadwal.push(body);
    res.status(201).json({ success: true, message: "Event berhasil dibuat" });
});

// Update / Edit Event Pementasan
app.put(['/api/admin/jadwal/:id', '/admin/jadwal/:id'], (req, res) => {
    const id = req.params.id;
    const { judul, tanggal, lokasi, harga, kuota, qrImage } = req.body;
    const idx = (db.jadwal || []).findIndex(x => x.id == id);
    if (idx === -1) return res.status(404).json({ error: "Event tidak ditemukan" });

    const j = db.jadwal[idx];
    j.judul = judul || j.judul;
    j.tanggal = tanggal || j.tanggal;
    j.lokasi = lokasi || j.lokasi;
    j.harga = harga || j.harga;
    if (qrImage) j.qrImage = qrImage;

    // Jika kuota tiket dinaikkan, tambahkan tiket barcode baru otomatis
    const kuotaBaru = parseInt(kuota);
    if (kuotaBaru > j.kuota) {
        const selisih = kuotaBaru - j.kuota;
        const currentCount = j.tiketList.length;
        for (let i = 1; i <= selisih; i++) {
            let num = (currentCount + i).toString().padStart(3, '0');
            j.tiketList.push({
                kode: `STU-${j.id.toString().slice(-4)}-${num}`,
                status: 'Tersedia',
                nama: '',
                email: '',
                wa: '',
                checkIn: false,
                catatan: ''
            });
        }
        j.kuota = kuotaBaru;
    }

    res.json({ success: true, message: "Event berhasil diperbarui!", event: j });
});

// Check-In Tiket & Catatan Penonton
app.put(['/api/admin/tiket/checkin', '/admin/tiket/checkin'], (req, res) => {
    const { kode, catatan } = req.body;
    for (let j of db.jadwal) {
        const t = (j.tiketList || []).find(x => x.kode === kode);
        if (t) {
            t.checkIn = true;
            t.checkInTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (catatan !== undefined) t.catatan = catatan;
            return res.json({ success: true, message: "Check-in penonton berhasil!", tiket: t });
        }
    }
    res.status(404).json({ error: "Tiket tidak ditemukan" });
});

// Tiketing Manual (OTS)
app.post(['/api/admin/tiket/manual', '/admin/tiket/manual'], (req, res) => {
    const { jadwalId, nama, email, wa, catatan, autoCheckIn } = req.body;
    const j = (db.jadwal || []).find(x => x.id == jadwalId) || db.jadwal[0];
    if (!j) return res.status(404).json({ error: "Pilih event pementasan terlebih dahulu" });

    const tiketTersedia = (j.tiketList || []).find(t => t.status === 'Tersedia');
    if (!tiketTersedia) return res.status(400).json({ error: "Kuota tiket event ini sudah habis!" });

    tiketTersedia.nama = nama || "Penonton OTS";
    tiketTersedia.email = email || "-";
    tiketTersedia.wa = wa || "-";
    tiketTersedia.status = "Lunas";
    tiketTersedia.catatan = catatan || "Pembelian Tiket Langsung (OTS)";
    if (autoCheckIn) {
        tiketTersedia.checkIn = true;
        tiketTersedia.checkInTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    res.status(201).json({ success: true, message: "Tiket OTS berhasil diterbitkan!", kode: tiketTersedia.kode, tiket: tiketTersedia });
});

// Manajemen 
app.post(['/api/admin/users', '/admin/users'], (req, res) => {
    const { user, pass, role } = req.body;
    if ((db.users || []).find(x => x.user.toLowerCase() === user.toLowerCase())) {
        return res.status(400).json({ error: "Username sudah terdaftar!" });
    }
    db.users.push({ user, pass, role: role || 'admin' });
    res.status(201).json({ success: true, message: "Akun baru berhasil ditambahkan!" });
});

app.delete(['/api/admin/users/:user', '/admin/users/:user'], (req, res) => {
    const u = req.params.user;
    if (u.toLowerCase() === 'admin') {
        return res.status(400).json({ error: "Akun Super Admin utama tidak boleh dihapus!" });
    }
    db.users = (db.users || []).filter(x => x.user !== u);
    res.json({ success: true, message: `Akun ${u} berhasil dihapus!` });
});

// SDM Anggota
app.post(['/api/admin/anggota', '/admin/anggota'], (req, res) => {
    let body = req.body || {};
    const { id, nama, divisi, status, foto } = body;
    if (id) {
        const idx = db.anggota.findIndex(a => a.id == id);
        if (idx !== -1) db.anggota[idx] = { ...db.anggota[idx], nama, divisi, status, foto };
    } else {
        db.anggota.push({ id: Date.now(), nama, divisi, status, foto });
    }
    res.json({ success: true });
});

// Galeri & Prestasi
app.post(['/api/admin/galeri', '/admin/galeri'], (req, res) => {
    db.galeri.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.post(['/api/admin/prestasi', '/admin/prestasi'], (req, res) => {
    db.prestasi.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

// Sinkronisasi Oprec
app.post(['/api/admin/pendaftar-sync', '/admin/pendaftar-sync'], (req, res) => {
    db.pendaftar = req.body.data || [];
    res.json({ success: true, count: db.pendaftar.length });
});

// Update Tiket Lunas / Batal
app.put(['/api/admin/tiket/status', '/admin/tiket/status'], (req, res) => {
    const { jadwalId, kode, status } = req.body;
    const j = db.jadwal.find(x => x.id == jadwalId);
    if (j) {
        const t = (j.tiketList || []).find(x => x.kode === kode);
        if (t) t.status = status;
    }
    res.json({ success: true });
});

app.put(['/api/admin/profil', '/admin/profil'], (req, res) => {
    db.profil = { ...db.profil, ...req.body };
    res.json({ success: true, message: "Profil diperbarui" });
});

app.delete(['/api/admin/:tipe/:id', '/admin/:tipe/:id'], (req, res) => {
    const { tipe, id } = req.params;
    if (db[tipe]) {
        db[tipe] = db[tipe].filter(item => item.id != id);
        res.json({ success: true, message: `Data ${tipe} dihapus` });
    } else {
        res.status(400).json({ error: "Tipe data tidak valid" });
    }
});

// Penanganan Rute POST Universal
app.post('*', (req, res, next) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    if (req.url.includes('jadwal') || (body.judul && body.kuota)) {
        db.jadwal.push(body);
        return res.status(201).json({ success: true, message: "Event berhasil dibuat" });
    }
    if (req.url.includes('pesan') || (body.nama && body.kontak && body.isi)) {
        return handlePesan(req, res);
    }
    if (req.url.includes('checkout') || (body.jadwalId && body.email)) {
        return handleCheckout(req, res);
    }
    if (req.url.includes('login') || (body.user && body.pass && !body.role)) {
        return handleLogin(req, res);
    }
    if (req.url.includes('register') || (body.user && body.pass && body.role)) {
        return handleRegister(req, res);
    }
    next();
});

// GET Routes
app.get(['/api/admin/all', '/admin/all'], (req, res) => res.json(db));
app.get(['/api/public/data', '/public/data'], (req, res) => {
    res.json({
        profil: db.profil,
        prestasi: db.prestasi,
        galeri: db.galeri,
        anggota: (db.anggota || []).filter(a => a.status === 'Aktif'),
        jadwal: db.jadwal
    });
});

app.get('*', (req, res) => {
    if (req.url.startsWith('/admin')) {
        return res.sendFile(path.join(__dirname, '../frontend/admin.html'));
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
}

module.exports = app;