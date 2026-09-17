/* Data master demo — dipakai endpoint admin /demo (tanpa riwayat transaksi palsu) */

export const KATEGORI_DEMO = [
  'Minuman',
  'Makanan Instan',
  'Sembako',
  'Snack & Biskuit',
  'Perawatan Diri',
  'Rumah Tangga',
  'Alat Tulis',
  'Lain-lain',
]

export const SATUAN_DEMO = ['pcs', 'pack', 'botol', 'kaleng', 'sachet', 'kg', 'liter', 'renteng', 'dus']

export const SUPPLIER_DEMO = [
  { nama: 'Toko Grosir Amanah', telepon: '022-7318890', alamat: 'Jl. Pasar Baru No. 12, Bandung', catatan: 'Sembako & minuman' },
  { nama: 'Distributor Sumber Rejeki', telepon: '022-7304455', alamat: 'Jl. Industri No. 88, Cimahi', catatan: 'Makanan instan & snack' },
  { nama: 'Agen Segar Jaya', telepon: '0812-2233-4455', alamat: 'Pasar Induk Caringin Blok C-21', catatan: 'Telur & kebutuhan segar' },
]

export const PELANGGAN_DEMO = [
  { nama: 'Bu Ningsih', telepon: '0812-1001-2001', alamat: 'Jl. Mawar No. 5' },
  { nama: 'Pak Hadi', telepon: '0813-3002-4002', alamat: 'Jl. Melati No. 18' },
  { nama: 'Warung Bu Tuti', telepon: '0815-5003-6003', alamat: 'Jl. Kebon Jeruk No. 2' },
  { nama: 'Kantin SDN 3', telepon: '022-7441122', alamat: 'Jl. Sekolah No. 3' },
  { nama: 'Ibu Sari', telepon: '0817-7004-8004', alamat: 'Komplek Permata Blok B-9' },
]

// [sku, nama, kategori, satuan, beli, jual, stok, stokMin]
export const PRODUK_DEMO = [
  ['8991002101010', 'Aqua Botol 600ml', 'Minuman', 'botol', 2600, 4000, 96, 24],
  ['8991002101027', 'Aqua Galon 19L', 'Minuman', 'pcs', 17000, 21000, 14, 6],
  ['8992761111017', 'Teh Botol Sosro 350ml', 'Minuman', 'botol', 3800, 5000, 62, 18],
  ['8998009011016', 'Coca-Cola Kaleng 330ml', 'Minuman', 'kaleng', 5200, 7000, 40, 12],
  ['8998866200011', 'Le Minerale 600ml', 'Minuman', 'botol', 2800, 4000, 78, 24],
  ['8993175537018', 'Kopi Kapal Api Special 165gr', 'Minuman', 'pack', 12500, 16000, 26, 8],
  ['8992775211014', 'Susu Ultra Milk Cokelat 250ml', 'Minuman', 'pcs', 5300, 7000, 48, 12],
  ['8996001600146', 'Energen Cokelat (isi 10)', 'Minuman', 'pack', 11000, 14500, 22, 6],
  ['8993189251012', 'Good Day Cappuccino Sachet', 'Minuman', 'sachet', 1400, 2000, 120, 30],
  ['8998866101011', 'Indomie Goreng', 'Makanan Instan', 'pcs', 2700, 3500, 180, 48],
  ['8998866101028', 'Indomie Kuah Ayam Bawang', 'Makanan Instan', 'pcs', 2600, 3500, 144, 48],
  ['8998866101035', 'Mie Sedaap Soto', 'Makanan Instan', 'pcs', 2500, 3300, 96, 36],
  ['8992388101015', 'Sarden ABC Saus Tomat 155gr', 'Makanan Instan', 'kaleng', 8200, 11000, 30, 10],
  ['8991102000019', 'Kornet Pronas 340gr', 'Makanan Instan', 'kaleng', 21000, 27000, 12, 4],
  ['8993110001015', 'Bubur Instan Ayam 40gr', 'Makanan Instan', 'pcs', 4200, 5500, 24, 8],
  ['8996006200015', 'Beras Pandan Wangi 5kg', 'Sembako', 'pack', 62000, 72000, 18, 5],
  ['8992696400012', 'Gula Pasir Gulaku 1kg', 'Sembako', 'kg', 14500, 17500, 34, 10],
  ['8992222100013', 'Minyak Goreng Bimoli 2L', 'Sembako', 'pcs', 34000, 39000, 22, 8],
  ['8998103200018', 'Tepung Terigu Segitiga Biru 1kg', 'Sembako', 'kg', 11500, 14000, 26, 8],
  ['8991389100014', 'Telur Ayam Negeri', 'Sembako', 'kg', 26000, 30000, 20, 6],
  ['8992770100011', 'Kecap Manis Bango 520ml', 'Sembako', 'botol', 21500, 26000, 16, 5],
  ['8993240300017', 'Garam Dapur Beryodium 250gr', 'Sembako', 'pack', 2200, 3500, 40, 12],
  ['8992753100016', 'Chitato Sapi Panggang 68gr', 'Snack & Biskuit', 'pcs', 9500, 12500, 36, 12],
  ['8992745100013', 'Oreo Cokelat 133gr', 'Snack & Biskuit', 'pack', 8800, 11500, 30, 10],
  ['8996241100019', 'Roma Malkist Abon 115gr', 'Snack & Biskuit', 'pack', 7200, 9500, 34, 12],
  ['8991001100015', 'SilverQueen Cashew 58gr', 'Snack & Biskuit', 'pcs', 12000, 15500, 20, 6],
  ['8993058100011', 'Beng-Beng (renteng isi 10)', 'Snack & Biskuit', 'renteng', 15500, 20000, 14, 5],
  ['8999999100012', 'Pepsodent Pasta Gigi 190gr', 'Perawatan Diri', 'pcs', 15500, 19500, 24, 8],
  ['8999999200019', 'Lifebuoy Sabun Cair 400ml', 'Perawatan Diri', 'botol', 24000, 29500, 18, 6],
  ['8999999300016', 'Sunsilk Sampo Sachet 12ml', 'Perawatan Diri', 'sachet', 900, 1500, 150, 40],
  ['8992727100014', 'Rexona Roll On 45ml', 'Perawatan Diri', 'pcs', 18500, 23500, 14, 5],
  ['8999999400013', 'Rinso Deterjen Bubuk 770gr', 'Rumah Tangga', 'pack', 19500, 24000, 20, 6],
  ['8999999500010', 'Sunlight Pencuci Piring 755ml', 'Rumah Tangga', 'botol', 17000, 21500, 22, 8],
  ['8993456100018', 'Tisu Paseo Facial 250 sheet', 'Rumah Tangga', 'pack', 14000, 18000, 16, 6],
  ['8992345100015', 'Baygon Aerosol 600ml', 'Rumah Tangga', 'pcs', 32000, 38500, 8, 4],
  ['8991234100016', 'Pulpen Standard AE7 Hitam', 'Alat Tulis', 'pcs', 2000, 3000, 60, 20],
  ['8991234200013', 'Buku Tulis Sidu 38 Lembar', 'Alat Tulis', 'pcs', 3400, 4500, 45, 15],
  ['8991234300010', 'Pensil 2B Faber-Castell', 'Alat Tulis', 'pcs', 3200, 4500, 38, 12],
]
