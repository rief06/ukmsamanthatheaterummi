-- database/schema.sql

-- 1. Tabel Pengguna (Admin & Petugas)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'ketum', 'sekre', 'pdd') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Profil & Pengaturan Website
CREATE TABLE IF NOT EXISTS profil (
    id INT PRIMARY KEY DEFAULT 1,
    nama VARCHAR(100) NOT NULL,
    sejarah TEXT,
    email VARCHAR(100),
    telepon VARCHAR(50),
    ig VARCHAR(255),
    tiktok VARCHAR(255),
    youtube VARCHAR(255),
    status_oprec ENUM('Buka', 'Tutup') DEFAULT 'Buka',
    link_oprec VARCHAR(255),
    logo LONGTEXT,
    bg_hero LONGTEXT,
    img_tentang LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Tabel Anggota SDM
CREATE TABLE IF NOT EXISTS anggota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    divisi VARCHAR(100) NOT NULL,
    status ENUM('Aktif', 'Pasif', 'Alumni') DEFAULT 'Aktif',
    foto LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Event / Pementasan
CREATE TABLE IF NOT EXISTS jadwal (
    id BIGINT PRIMARY KEY,
    judul VARCHAR(150) NOT NULL,
    tanggal DATE NOT NULL,
    lokasi VARCHAR(150) NOT NULL,
    harga INT NOT NULL,
    kuota INT NOT NULL,
    qr_image LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Tiket
CREATE TABLE IF NOT EXISTS tiket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jadwal_id BIGINT NOT NULL,
    kode VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('Tersedia', 'Pending', 'Lunas') DEFAULT 'Tersedia',
    nama VARCHAR(100),
    email VARCHAR(100),
    wa VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jadwal_id) REFERENCES jadwal(id) ON DELETE CASCADE
);

-- 6. Tabel Galeri
CREATE TABLE IF NOT EXISTS galeri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL,
    src LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Prestasi
CREATE TABLE IF NOT EXISTS prestasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tahun INT NOT NULL,
    judul VARCHAR(150) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Pesan Masuk
CREATE TABLE IF NOT EXISTS pesan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    kontak VARCHAR(100) NOT NULL,
    isi TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Pendaftar Oprec
CREATE TABLE IF NOT EXISTS pendaftar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tgl VARCHAR(50),
    nama VARCHAR(100) NOT NULL,
    nim VARCHAR(50),
    prodi VARCHAR(100),
    wa VARCHAR(50),
    posisi VARCHAR(50) DEFAULT 'Calon Anggota',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);