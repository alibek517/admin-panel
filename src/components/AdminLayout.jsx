import { Outlet } from 'react-router-dom'
import './styles/AdminLayout.css'
import Sidebar from './Sidebar.jsx'


export default function AdminLayout() {
  
  return (
    <>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        < div className="admin__layout">
           
        <main>
            <Outlet />
        </main>
        </div>
      </div>
    </>
  )
}

