import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("https://alikafecrm.uz/user", {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        });
        console.log("Fetched users:", response.data);
        // Предполагаем, что response.data — это массив пользователей
        const customerUser = response.data.find(
          (user) => user.role === "CUSTOMER"
        );
        if (customerUser) {
          setCustomer(customerUser);
        } else {
          setError(true);
          setTimeout(() => setError(false), 3000);
        }
      } catch (err) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", err);
        setError(true);
        setTimeout(() => setError(false), 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    if (!customer) {
      setError(true);
      setTimeout(() => setError(false), 3000);
      return;
    }

    setIsAnimating(true);

    try {
      // Проверяем логин и пароль
      if (username === customer.username && password === customer.password) {
        // Сохраняем данные пользователя в localStorage
        const userData = {
          id: customer.id,
          username: customer.username,
          role: customer.role,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        // Сохраняем флаги для авторизации
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("admin", "true");

        // Если токен задается вручную, сохраняем его
        // Замените "your_manual_token" на реальный токен или получите его с сервера
        localStorage.setItem("token", "your_manual_token");

        // Альтернатива: если сервер возвращает токен при логине, выполните запрос
        /*
        const loginResponse = await axios.post("https://alikafecrm.uz/login", {
          username,
          password,
        });
        localStorage.setItem("token", loginResponse.data.token);
        */

        setError(false);
        setIsAnimating(false);
        navigate("/");
      } else {
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setIsAnimating(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="m7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="login-title">Admin profiliga kirish</h2>
          <p className="login-subtitle">
            Tizimga kirish uchun ma'lumotlarni kiriting
          </p>
        </div>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div className="form-container">
            {error && (
              <div className="error-message">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>Login yoki parol xato. Iltimos, qayta urining!</p>
              </div>
            )}

            {/* Username Input */}
            <div className={`input-group ${error ? "error" : ""}`}>
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                className={`modal-input1 ${error ? "error" : ""}`}
                type="text"
                placeholder="Login kiriting"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div
              className={`input-group password-container ${error ? "error" : ""}`}
            >
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="m7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                className={`modal-input1 ${error ? "error" : ""}`}
                type={showPassword ? "text" : "password"}
                placeholder="Parol kiriting"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="toggle-password"
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button
              className={`modButton ${isAnimating ? "loading" : ""}`}
              onClick={handleLogin}
              disabled={isAnimating}
            >
              {isAnimating ? (
                <div className="button-loading">
                  <div className="button-spinner"></div>
                  <span>Tekshirilmoqda...</span>
                </div>
              ) : (
                "Kirish"
              )}
            </button>
          </div>
        )}

        <div className="login-footer">
          <p>© 2025 Admin Panel. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
}