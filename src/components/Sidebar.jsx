import React, { useState, useEffect } from "react";
import "./styles/sidebar.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  Home,
  FileText,
  LineChart,
  Coffee,
  ShoppingBag,
  Settings,
  List,
  Truck,
  Eye,
  EyeOff,
  HandPlatter,
  Pizza,
  Plus,
  Rocket,
} from "lucide-react";
import logotip from "/logo Ai-01.png"

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRoute, setPendingRoute] = useState(null);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      navigate("/Taomlar");
    }
  }, [navigate, location.pathname]);

  const isAdminPanelActive = location.pathname.startsWith("/AdminPanel") ||
    location.pathname === "/ZakazlarTarixi" ||
    location.pathname === "/AtchotDastafka";

  const checkAuth = async () => {
    setErrorMessage("");
    try {
      const response = await fetch("http://192.168.100.99:3000/user");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      const bigAdmin = data.find((user) => user.role === "BIGADMIN");
      if (
        bigAdmin &&
        bigAdmin.username === login &&
        bigAdmin.password === password
      ) {
        setIsAuthenticated(true);
        setShowModal(false);
        setLogin("");
        setPassword("");
        setShowPassword(false);
        if (pendingRoute) {
          navigate(pendingRoute);
          setPendingRoute(null);
        }
      } else {
        setErrorMessage("Неверный логин или пароль!");
        setPassword("");
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setErrorMessage(
        "Ошибка подключения к серверу. Проверьте интернет или API."
      );
      setShowModal(false);
    }
  };

  const handleNavigation = (to) => {
    const openRoutes = ["/Taomlar", "/Chiqish", "/Dostavka", "/ishniBoshlash"];
    if (!openRoutes.includes(to) && !isAuthenticated) {
      setPendingRoute(to);
      setShowModal(true);
    } else {
      if (to === "/Chiqish") {
        setIsAuthenticated(false);
      }
      navigate(to);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{
          display:'flex',
          flexDirection:'column',
          width:"100%"
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <img
              src={logotip}
              alt="AI Cafe Logo"
              style={{
                width: '180px',
                height: '70px',
                objectFit: 'cover',
                objectPosition: 'center',
                
              }}
            />
          </div>
          <h1 style={{
            cursor: 'default',
            fontSize: '22px',
            fontWeight: '700',
            marginTop:'-20px',
            color: '#fff',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '1.5px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            background: 'linear-gradient(135deg, #ffffff, #e0e0e0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            АДМИН
          </h1>
         
        </div>

        <button
          className="mobile-menu-toggle"
          style={{
            position: 'absolute',
            fontSize: '22px',
            right: '15px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <Menu size={24} />
        </button>

        <button
          className="mobile-menu-toggle"
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <Menu size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/Taomlar")}
          className={`nav-item ${location.pathname === "/Taomlar" ? "active" : ""}`}
        >
          <Coffee size={20} />
          <span>Столлар</span>
        </div>
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/Dostavka")}
          className={`nav-item ${location.pathname === "/Dostavka" ? "active" : ""}`}
        >
          <Truck size={20} />
          <span>Доставка</span>
        </div>
        <div
          style={{ cursor: 'pointer', display: 'none' }}
          onClick={() => handleNavigation("/Zakazlar")}
          className={`nav-item ${location.pathname === "/Zakazlar" ? "active" : ""}`}
        >
          <ShoppingBag size={20} />
          <span>Заказлар</span>
        </div>
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/AdminPanel")}
          className={`nav-item ${location.pathname === "/AdminPanel" ? "active" : ""}`}
        >
          <Home size={20} />
          <span>Администратор панели</span>
        </div>
        <div
          onClick={() => handleNavigation("/ZakazlarTarixi")}
          className={`nav-item ${location.pathname === "/ZakazlarTarixi" ? "active" : ""
            }`}
          style={{
            display: isAdminPanelActive ? "flex" : "none",
            marginLeft: '15px',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          <FileText size={20} />
          <span>Отчет по кассе</span>
        </div>
        <div
          onClick={() => handleNavigation("/AtchotDastafka")}
          className={`nav-item ${location.pathname === "/AtchotDastafka" ? "active" : ""
            }`}
          style={{
            display: isAdminPanelActive ? "flex" : "none",
            marginLeft: '15px',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          <Truck size={20} />
          <span>Отчет по доставка</span>
        </div>
        <div
          onClick={() => handleNavigation("/AdminPanel/ofitsant")}
          className={`nav-item ${location.pathname === "/AdminPanel/ofitsant" ? "active" : ""
            }`}
          style={{
            display: isAdminPanelActive ? "flex" : "none",
            marginLeft: '15px',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          <HandPlatter size={20} />
          <span>Отчет по Официантам</span>
        </div>
        <div
          onClick={() => handleNavigation("/AdminPanel/ovqat")}
          className={`nav-item ${location.pathname === "/AdminPanel/ovqat" ? "active" : ""
            }`}
          style={{
            display: isAdminPanelActive ? "flex" : "none",
            marginLeft: '15px',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          <Pizza size={20} />
          <span>Отчет по блюдам</span>
        </div>

        <div
          style={{ cursor: 'pointer', display: 'none' }}
          onClick={() => handleNavigation("/Asboblar")}
          className={`nav-item ${location.pathname === "/Asboblar" ? "active" : ""}`}
        >
          <LineChart size={20} />
          <span>Статистикалар</span>
        </div>

        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/ishniBoshlash")}
          className={`nav-item ${location.pathname === "/ishniBoshlash" ? "active" : ""}`}
        >
          <Rocket size={20} />
          <span>Иш фаолияти</span>
        </div>
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/TaomlarSoz")}
          className={`nav-item ${location.pathname === "/TaomlarSoz" ? "active" : ""}`}
        >
          <Plus size={20} />
          <span>Меню</span>
        </div>
        <div
          style={{ display: 'none' }}
          onClick={() => handleNavigation("/Stollar")}
          className={`nav-item ${location.pathname === "/Stollar" ? "active" : ""}`}
        >
          <List size={20} />
          <span>Столлар</span>
        </div>
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/Chiqish")}
          className={`nav-item logout ${location.pathname === "/Chiqish" ? "active" : ""
            }`}
        >
          <LogOut size={20} />
          <span>Чиқиш</span>
        </div>
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigation("/Sozlamalar")}
          className={`nav-item ${location.pathname === "/Sozlamalar" ? "active" : ""}`}
        >
          <Settings size={20} />
          <span>Настройки</span>
        </div>
      </nav>

      {showModal && (
        <>
          <div className="overlay" onClick={() => setShowModal(false)}></div>
          <div className="modal">
            <div className="modal-content">
              <h2>Авторизация</h2>
              <input
                style={{
                  width: "300px",
                  height: "50px",
                  marginBottom: "-10px",
                }}
                className="modal-input"
                type="text"
                placeholder="Логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
              <div style={{ position: "relative", display: "inline-block" }}>
                <input
                  style={{
                    width: "300px",
                    height: "50px",
                    marginBottom: "5px",
                    paddingRight: "40px",
                  }}
                  className="modal-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginBottom: '15px',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)'
                </button>
              </div>
              {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
              <button className="success-message2"
                onClick={() => setShowModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}