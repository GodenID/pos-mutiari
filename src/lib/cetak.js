/* Cetak sebagian halaman.

   Isi elemen sumber disalin ke wadah khusus di <body>, sehingga aturan
   @media print pada styles/print.css hanya menampilkan bagian itu.
   Cara ini aman meski elemen sumber berada di dalam modal atau panel
   bertransform.                                                            */

const ID_WADAH = 'cetak-wadah'

function ambilWadah() {
  let wadah = document.getElementById(ID_WADAH)
  if (!wadah) {
    wadah = document.createElement('div')
    wadah.id = ID_WADAH
    document.body.appendChild(wadah)
  }
  return wadah
}

/**
 * @param {HTMLElement|null} elemen elemen sumber (isinya yang dicetak)
 * @param {'struk'|'lembar'} jenis  gaya kertas
 * @param {string} [judul]          judul dokumen saat menyimpan sebagai PDF
 */
export function cetakElemen(elemen, jenis = 'lembar', judul) {
  if (!elemen) return
  const wadah = ambilWadah()
  wadah.className = `cetak-area ${jenis}`
  wadah.innerHTML = elemen.innerHTML

  const judulLama = document.title
  if (judul) document.title = judul

  const bersihkan = () => {
    wadah.innerHTML = ''
    wadah.className = ''
    document.title = judulLama
    window.removeEventListener('afterprint', bersihkan)
  }
  window.addEventListener('afterprint', bersihkan)

  window.print()

  // Jaring pengaman bila peramban tidak memicu afterprint
  setTimeout(bersihkan, 1500)
}
