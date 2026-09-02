// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const path = require('path');

// Tambahkan ini agar server Express menampilkan folder frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Simpan data state/memori (bisa diganti query ke MySQL/PostgreSQL/MongoDB)
let db = {
    users: [{ user: "admin", pass: "admin123", role: "admin" }],
    profil: {
        nama: "TEATER SAMANTHA",
        sejarah: "Wadah berekspresi seni teater.",
        email: "st@example.com",
        telepon: "08",
        sosmed: { ig: "#", tiktok: "#", youtube: "#" },
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

// --- ROUTES: PUBLIC ---
app.get('/api/public/data', (req, res) => {
    res.json({
        profil: db.profil,
        prestasi: db.prestasi,
        galeri: db.galeri,
        anggota: db.anggota.filter(a => a.status === 'Aktif'),
        jadwal: db.jadwal
    });
});

app.post('/api/public/pesan', (req, res) => {
    const { nama, kontak, isi } = req.body;
    const baru = { id: Date.now(), nama, kontak, isi, tgl: new Date().toLocaleDateString('id-ID') };
    db.pesan.push(baru);
    res.status(201).json({ message: "Pesan terkirim", data: baru });
});

app.post('/api/public/checkout', (req, res) => {
    const { jadwalId, nama, email, wa } = req.body;
    const j = db.jadwal.find(x => x.id == jadwalId);
    if (!j) return res.status(404).json({ error: "Jadwal tidak ditemukan" });

    const tiketTersedia = j.tiketList.find(t => t.status === 'Tersedia');
    if (!tiketTersedia) return res.status(400).json({ error: "Tiket habis" });

    tiketTersedia.nama = nama;
    tiketTersedia.email = email;
    tiketTersedia.wa = wa;
    tiketTersedia.status = 'Pending';

    res.json({ message: "Tiket berhasil dibooking", kode: tiketTersedia.kode });
});

// --- ROUTES: AUTH ---
app.post('/api/auth/login', (req, res) => {
    const { user, pass } = req.body;
    const u = db.users.find(x => x.user === user && x.pass === pass);
    if (!u) return res.status(401).json({ error: "Username atau Password salah" });
    res.json({ success: true, user: { user: u.user, role: u.role } });
});

app.post('/api/auth/register', (req, res) => {
    const { user, pass, role } = req.body;
    if (db.users.find(x => x.user === user)) {
        return res.status(400).json({ error: "Username sudah terdaftar" });
    }
    db.users.push({ user, pass, role });
    res.status(201).json({ success: true, message: "Akun berhasil dibuat" });
});

// --- ROUTES: ADMIN CRUD ---
app.get('/api/admin/all', (req, res) => {
    res.json(db);
});

app.put('/api/admin/profil', (req, res) => {
    db.profil = { ...db.profil, ...req.body };
    res.json({ success: true, message: "Profil diperbarui" });
});

app.post('/api/admin/jadwal', (req, res) => {
    db.jadwal.push(req.body);
    res.status(201).json({ success: true, message: "Event berhasil dibuat" });
});

app.post('/api/admin/anggota', (req, res) => {
    const { id, nama, divisi, status, foto } = req.body;
    if (id) {
        const idx = db.anggota.findIndex(a => a.id == id);
        if (idx !== -1) db.anggota[idx] = { ...db.anggota[idx], nama, divisi, status, foto };
    } else {
        db.anggota.push({ id: Date.now(), nama, divisi, status, foto });
    }
    res.json({ success: true });
});

app.post('/api/admin/galeri', (req, res) => {
    db.galeri.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.post('/api/admin/prestasi', (req, res) => {
    db.prestasi.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.post('/api/admin/pendaftar-sync', (req, res) => {
    const { data } = req.body;
    db.pendaftar = data;
    res.json({ success: true, count: data.length });
});

app.put('/api/admin/tiket/status', (req, res) => {
    const { jadwalId, kode, status } = req.body;
    const j = db.jadwal.find(x => x.id == jadwalId);
    if (j) {
        const t = j.tiketList.find(x => x.kode === kode);
        if (t) t.status = status;
    }
    res.json({ success: true });
});

app.delete('/api/admin/:tipe/:id', (req, res) => {
    const { tipe, id } = req.params;
    if (db[tipe]) {
        db[tipe] = db[tipe].filter(item => item.id != id);
        res.json({ success: true, message: `Data ${tipe} dihapus` });
    } else {
        res.status(400).json({ error: "Tipe data tidak valid" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

module.exports = app;