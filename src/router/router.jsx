import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminPanel from "../pages/AdminPanel.jsx";
import Asboblar from "../pages/Asboblar.jsx";
import Sozlamalar from "../pages/Sozlamalar.jsx";
import Stollar from "../pages/Stollar.jsx";
import Taomlar from "../pages/Taomlar.jsx";
import TaomlarSoz from "../pages/TaomlarSoz.jsx";
import Zakazlar from "../pages/Zakazlar.jsx";
import ZakazlarTarixi from "../pages/ZakazlarTarixi.jsx";
import Chiqish from "../pages/Chiqish.jsx";
import Login from "../pages/Login.jsx";

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return isLoggedIn ? children : <Navigate to="/login" />;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <Zakazlar /> },
      { path: "AdminPanel", element: <AdminPanel /> },
      { path: "Asboblar", element: <Asboblar /> },
      { path: "Sozlamalar", element: <Sozlamalar /> },
      { path: "Stollar", element: <Stollar /> },
      { path: "Taomlar", element: <Taomlar /> },
      { path: "TaomlarSoz", element: <TaomlarSoz /> },
      { path: "Zakazlar", element: <Zakazlar /> },
      { path: "ZakazlarTarixi", element: <ZakazlarTarixi /> },
      { path: "Chiqish", element: <Chiqish /> }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/login" />
  },
]);