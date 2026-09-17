import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Layout from './components/Layout.jsx'
import Dasbor from './pages/Dasbor.jsx'
import Kasir from './pages/Kasir.jsx'
import Masuk from './pages/Masuk.jsx'
import Pelanggan from './pages/Pelanggan.jsx'
import Supplier from './pages/Supplier.jsx'
import Produk from './pages/Produk.jsx'
import Stok from './pages/Stok.jsx'
import Penjualan from './pages/Penjualan.jsx'
import Laporan from './pages/Laporan.jsx'
import Pengaturan from './pages/Pengaturan.jsx'
import { useSesi } from './store/konteks.js'

/** Harus sudah masuk — sonst lempar ke halaman login */
function PerluMasuk({ children }) {
  const { pengguna } = useSesi()
  const lokasi = useLocation()
  if (!pengguna) {
    return <Navigate to="/masuk" replace state={{ dari: lokasi.pathname }} />
  }
  return children
}

/** Khusus peran admin (supplier/PO & pengaturan) */
function PerluAdmin({ children }) {
  const { pengguna } = useSesi()
  if (pengguna?.peran !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<Masuk />} />
      <Route
        path="/*"
        element={
          <PerluMasuk>
            <Layout>
              <Routes>
                <Route path="/" element={<Dasbor />} />
                <Route path="/kasir" element={<Kasir />} />
                <Route path="/pelanggan" element={<Pelanggan />} />
                <Route
                  path="/supplier"
                  element={
                    <PerluAdmin>
                      <Supplier />
                    </PerluAdmin>
                  }
                />
                <Route path="/produk" element={<Produk />} />
                <Route path="/stok" element={<Stok />} />
                <Route path="/penjualan" element={<Penjualan />} />
                <Route path="/laporan" element={<Laporan />} />
                <Route
                  path="/pengaturan"
                  element={
                    <PerluAdmin>
                      <Pengaturan />
                    </PerluAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PerluMasuk>
        }
      />
    </Routes>
  )
}
