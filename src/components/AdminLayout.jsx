import { Outlet } from 'react-router-dom'
import './styles/AdminLayout.css'
import Sidebar from './Sidebar.jsx'
import Header from './header.jsx'

export default function AdminLayout() {
  
  return (
    <>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        < div className="admin__layout">
            <Header />
        <main>
            <Outlet />
        </main>
        </div>
      </div>
    </>
  )
}

