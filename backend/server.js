// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Melayani file statis frontend saat dijalankan lokal
app.use(express.static(path.join(__dirname, '../frontend')));

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
    const { user, pass } = req.body || {};
    const u = (db.users || []).find(x => x.user === user && x.pass === pass);
    if (!u) return res.status(401).json({ error: "Username atau Password salah" });
    res.json({ success: true, user: { user: u.user, role: u.role } });
};

const handleRegister = (req, res) => {
    const { user, pass, role } = req.body || {};
    if ((db.users || []).find(x => x.user === user)) {
        return res.status(400).json({ error: "Username sudah terdaftar" });
    }
    db.users.push({ user, pass, role });
    res.status(201).json({ success: true, message: "Akun berhasil dibuat" });
};

// Rute fleksibel: cocokkan login & register apapun format URL-nya
app.post(['/api/auth/login', '/auth/login', '/api/login'], handleLogin);
app.post(['/api/auth/register', '/auth/register', '/api/register'], handleRegister);

// Fallback cerdas jika Vercel mengirim rute POST apa pun yang memuat data login/register
app.post('*', (req, res, next) => {
    if (req.url.includes('login') || (req.body && req.body.user && req.body.pass && !req.body.role)) {
        return handleLogin(req, res);
    }
    if (req.url.includes('register') || (req.body && req.body.role)) {
        return handleRegister(req, res);
    }
    next();
});

// ================= HANDLERS PUBLIC & ADMIN =================
app.get(['/api/public/data', '/public/data'], (req, res) => {
    res.json({
        profil: db.profil,
        prestasi: db.prestasi,
        galeri: db.galeri,
        anggota: (db.anggota || []).filter(a => a.status === 'Aktif'),
        jadwal: db.jadwal
    });
});

app.post(['/api/public/pesan', '/public/pesan'], (req, res) => {
    const { nama, kontak, isi } = req.body;
    const baru = { id: Date.now(), nama, kontak, isi, tgl: new Date().toLocaleDateString('id-ID') };
    db.pesan.push(baru);
    res.status(201).json({ message: "Pesan terkirim", data: baru });
});

app.post(['/api/public/checkout', '/public/checkout'], (req, res) => {
    const { jadwalId, nama, email, wa } = req.body;
    const j = db.jadwal.find(x => x.id == jadwalId);
    if (!j) return res.status(404).json({ error: "Jadwal tidak ditemukan" });

    const tiketTersedia = (j.tiketList || []).find(t => t.status === 'Tersedia');
    if (!tiketTersedia) return res.status(400).json({ error: "Tiket habis" });

    tiketTersedia.nama = nama;
    tiketTersedia.email = email;
    tiketTersedia.wa = wa;
    tiketTersedia.status = 'Pending';

    res.json({ message: "Tiket berhasil dibooking", kode: tiketTersedia.kode });
});

app.get(['/api/admin/all', '/admin/all'], (req, res) => {
    res.json(db);
});

// Fallback untuk GET data admin / public
app.get('*', (req, res, next) => {
    if (req.url.includes('admin') && req.url.includes('all')) return res.json(db);
    if (req.url.includes('public') && req.url.includes('data')) {
        return res.json({
            profil: db.profil,
            prestasi: db.prestasi,
            galeri: db.galeri,
            anggota: (db.anggota || []).filter(a => a.status === 'Aktif'),
            jadwal: db.jadwal
        });
    }
    // Rute halaman tampilan
    if (req.url.startsWith('/admin')) {
        return res.sendFile(path.join(__dirname, '../frontend/admin.html'));
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Listener lokal
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
}

module.exports = app;