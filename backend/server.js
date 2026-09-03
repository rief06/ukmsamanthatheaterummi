// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Melayani file statis frontend baik via / maupun /frontend saat lokal
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// --- DATABASE MEMORY ---
let db = {
    users: [{ user: "admin", pass: "admin123", role: "admin" }],
    profil: {
        nama: "TEATER SAMANTHA",
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

// ================= HANDLERS AUTH =================
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
    
    if (!u) {
        return res.status(401).json({ error: "Username atau Password salah" });
    }
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

// ================= HANDLERS PESAN & CHECKOUT =================
const handlePesan = (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};
    const { nama, kontak, isi } = body;
    const baru = { id: Date.now(), nama, kontak, isi, tgl: new Date().toLocaleDateString('id-ID') };
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
    
    // Cari jadwal atau gunakan jadwal pertama jika id tidak spesifik
    const j = (db.jadwal || []).find(x => x.id == jadwalId) || (db.jadwal || [])[0];
    if (!j) return res.status(404).json({ error: "Jadwal belum dibuat oleh admin" });

    const tiketTersedia = (j.tiketList || []).find(t => t.status === 'Tersedia');
    if (!tiketTersedia) return res.status(400).json({ error: "Tiket habis" });

    tiketTersedia.nama = nama;
    tiketTersedia.email = email;
    tiketTersedia.wa = wa;
    tiketTersedia.status = 'Pending';

    res.json({ message: "Tiket berhasil dibooking", kode: tiketTersedia.kode });
};

// Pasang rute eksplisit
app.post(['/api/public/pesan', '/public/pesan', '/api/pesan', '/pesan'], handlePesan);
app.post(['/api/public/checkout', '/public/checkout', '/api/checkout', '/checkout'], handleCheckout);

// Penanganan Rute POST Universal (Mendeteksi dari isi payload data)
app.post('*', (req, res, next) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    // 1. Pesan Masuk
    if (req.url.includes('pesan') || (body.nama && body.kontak && body.isi)) {
        return handlePesan(req, res);
    }
    // 2. Checkout Tiket
    if (req.url.includes('checkout') || (body.jadwalId && body.email) || (body.email && body.wa)) {
        return handleCheckout(req, res);
    }
    // 3. Login
    if (req.url.includes('login') || (body.user && body.pass && !body.role)) {
        return handleLogin(req, res);
    }
    // 4. Register
    if (req.url.includes('register') || (body.user && body.pass && body.role)) {
        return handleRegister(req, res);
    }
    next();
});

// ================= HANDLER CRUD ADMIN =================
app.post(['/api/admin/jadwal', '/admin/jadwal'], (req, res) => {
    db.jadwal.push(req.body);
    res.status(201).json({ success: true, message: "Event berhasil dibuat" });
});

app.post(['/api/admin/anggota', '/admin/anggota'], (req, res) => {
    const { id, nama, divisi, status, foto } = req.body;
    if (id) {
        const idx = db.anggota.findIndex(a => a.id == id);
        if (idx !== -1) db.anggota[idx] = { ...db.anggota[idx], nama, divisi, status, foto };
    } else {
        db.anggota.push({ id: Date.now(), nama, divisi, status, foto });
    }
    res.json({ success: true });
});

app.post(['/api/admin/galeri', '/admin/galeri'], (req, res) => {
    db.galeri.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.post(['/api/admin/prestasi', '/admin/prestasi'], (req, res) => {
    db.prestasi.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.post(['/api/admin/pendaftar-sync', '/admin/pendaftar-sync'], (req, res) => {
    db.pendaftar = req.body.data || [];
    res.json({ success: true, count: db.pendaftar.length });
});

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

// Penanganan Rute Auth Universal
app.post('*', (req, res, next) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    if (req.url.includes('login') || (body.user && body.pass && !body.role)) {
        return handleLogin(req, res);
    }
    if (req.url.includes('register') || (body.user && body.pass && body.role)) {
        return handleRegister(req, res);
    }
    next();
});

// Data Admin & Public GET
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