import { Geist, Geist_Mono } from 'next/font/google'
import './styles/admin-tailwind.css'
import { AdminDashboard } from './AdminDashboard'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export function AdminDashboardLayout() {
  return (
    <div className={`admin-dashboard ${geist.variable} ${geistMono.variable}`}>
      <AdminDashboard />
    </div>
  )
}
