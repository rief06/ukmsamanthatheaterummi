// frontend/js/main.js

async function loadData() {
    try {
        const res = await fetch(`${API_BASE_URL}/public/data`);
        const data = await res.json();

        // Render Profil
        document.querySelectorAll('[id^="pub-nama"]').forEach(el => el.innerText = data.profil.nama.toUpperCase());
        document.getElementById('pub-sejarah').innerText = data.profil.sejarah;
        document.getElementById('pub-sej-singkat').innerText = data.profil.sejarah.substring(0, 150) + '...';
        document.getElementById('pub-email').innerText = data.profil.email;
        document.getElementById('pub-tlp').innerText = data.profil.telepon;
        document.getElementById('l-ig').href = data.profil.sosmed.ig;
        document.getElementById('l-tt').href = data.profil.sosmed.tiktok;
        
        document.querySelectorAll('[id^="pub-logo"]').forEach(el => el.src = data.profil.logo);
        document.getElementById('pub-img-about').src = data.profil.imgTentang;
        document.getElementById('pub-bg').style.backgroundImage = `url('${data.profil.bgHero}')`;

        // Oprec
        const oprecBtn = document.getElementById('btn-link-oprec');
        if (data.profil.statusOprec === 'Tutup') {
            oprecBtn.innerHTML = 'Pendaftaran Ditutup <i class="fa-solid fa-lock ml-2"></i>';
            oprecBtn.className = 'inline-block bg-gray-800 text-gray-500 px-10 py-4 font-bold rounded cursor-not-allowed shadow-none';
            oprecBtn.href = "javascript:void(0)";
            oprecBtn.removeAttribute("target");
            document.getElementById('oprec-container').classList.add('opacity-75');
        } else {
            oprecBtn.href = data.profil.linkOprec || '#';
        }

        // Prestasi
        document.getElementById('pub-prestasi').innerHTML = data.prestasi.map(p => `
            <div class="flex items-center gap-4 bg-black p-4 border border-gray-800 rounded-lg hover:border-brand-red transition group">
                <div class="bg-brand-dark text-brand-red border border-brand-red/30 font-bold px-4 py-2 rounded group-hover:bg-brand-red group-hover:text-white transition">${p.tahun}</div>
                <div><h4 class="font-bold text-white text-base">${p.judul}</h4><p class="text-xs text-gray-400 mt-1">${p.desc}</p></div>
            </div>`).join('');

        // Galeri
        document.getElementById('pub-galeri').innerHTML = data.galeri.map(g => `
            <div class="gallery-item relative group overflow-hidden h-48 md:h-72 rounded-xl border border-gray-800" data-kat="${g.kategori.includes('Latihan')?'Latihan':'Pementasan'}">
                <img src="${g.src}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
                    <span class="bg-brand-red text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">${g.kategori}</span>
                </div>
            </div>`).join('');

        // Pengurus Aktif
        document.getElementById('pub-pengurus-container').innerHTML = data.anggota.length > 0 ? data.anggota.map(a => {
            const fotoSrc = a.foto ? a.foto : `https://placehold.co/150x150/1a1a1a/dc2626?text=${a.nama.charAt(0)}`;
            return `
            <div class="bg-brand-dark p-6 rounded border border-gray-900 flex flex-col items-center">
                <div class="w-24 h-24 bg-gray-800 rounded-full mb-4 overflow-hidden border border-brand-red">
                    <img src="${fotoSrc}" class="w-full h-full object-cover">
                </div>
                <h3 class="font-bold text-white text-center">${a.nama}</h3>
                <p class="text-brand-red text-xs mt-1 text-center">${a.divisi}</p>
            </div>`
        }).join('') : '<p class="text-gray-500 col-span-full">Belum ada pengurus di-publish.</p>';

        // Jadwal Tiket
        window.currentJadwal = data.jadwal;
        document.getElementById('pub-jadwal').innerHTML = data.jadwal.length === 0 ? '<p class="text-gray-500 text-center col-span-full bg-brand-dark p-10 rounded-xl">Belum ada event dibuka.</p>' : data.jadwal.map(j => {
            const sisa = j.tiketList.filter(t => t.status === 'Tersedia').length;
            return `
            <div class="bg-black border border-gray-800 p-8 rounded-xl shadow-lg relative overflow-hidden group hover:border-brand-red/50 transition">
                <span class="bg-brand-red/20 text-brand-red border border-brand-red/30 text-xs font-bold px-3 py-1 mb-4 inline-block rounded-full">Event Aktif</span>
                <h3 class="text-2xl font-bold text-white mb-4">${j.judul}</h3>
                <div class="space-y-3 mb-8 text-sm">
                    <p class="text-gray-300 flex items-center gap-3"><i class="fa-regular fa-calendar text-brand-red w-4"></i> ${j.tanggal}</p>
                    <p class="text-gray-300 flex items-center gap-3"><i class="fa-solid fa-location-dot text-brand-red w-4"></i> ${j.lokasi}</p>
                    <p class="text-gray-300 flex items-center gap-3"><i class="fa-solid fa-ticket text-brand-red w-4"></i> Rp ${j.harga}</p>
                    <p class="${sisa>0?'text-green-500':'text-red-500'} font-bold flex items-center gap-3"><i class="fa-solid fa-chair text-brand-red w-4"></i> Sisa: ${sisa} Kursi</p>
                </div>
                <button onclick="bukaCheckout(${j.id})" ${sisa===0?'disabled':''} class="w-full ${sisa===0?'bg-gray-800 text-gray-500':'bg-brand-red text-white hover:bg-red-700 shadow-lg'} py-3 rounded font-bold transition">${sisa===0?'Tiket Habis Terjual':'Beli Tiket Sekarang'}</button>
            </div>`
        }).join('');
    } catch (err) {
        console.error("Gagal mengambil data:", err);
    }
}

// Kirim Pesan
document.getElementById('form-pesan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nama: document.getElementById('psn-nama').value,
        kontak: document.getElementById('psn-kontak').value,
        isi: document.getElementById('psn-isi').value
    };
    const res = await fetch(`${API_BASE_URL}/public/pesan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        alert('Pesan berhasil dikirim!');
        e.target.reset();
    }
});

// Checkout Tiket
window.bukaCheckout = function(id) {
    const j = window.currentJadwal.find(x => x.id == id);
    document.getElementById('co-id-jadwal').value = j.id;
    document.getElementById('co-judul').innerText = j.judul;
    document.getElementById('co-harga').innerText = "Rp " + j.harga;
    document.getElementById('co-qr').src = j.qrImage || "https://placehold.co/200";
    document.getElementById('modal-checkout').classList.remove('hidden');
};

document.getElementById('form-checkout').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        jadwalId: document.getElementById('co-id-jadwal').value,
        nama: document.getElementById('co-nama').value,
        email: document.getElementById('co-email').value,
        wa: document.getElementById('co-wa').value
    };
    const res = await fetch(`${API_BASE_URL}/public/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
        alert(`Pemesanan Berhasil!\nKode Booking: ${result.kode}`);
        document.getElementById('modal-checkout').classList.add('hidden');
        e.target.reset();
        loadData();
    } else {
        alert('Gagal: ' + result.error);
    }
});

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', loadData);