import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import AdminLayout from './components/AdminLayout.jsx';
import SignIn from './pages/SignIn.jsx';

function App() {
  const role = localStorage.getItem('userRole');

  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<SignIn />} />
          <Route
            path="/menyu/*"
            element={role === 'CUSTOMER' ? <AdminLayout /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;