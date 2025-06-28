import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminPanel from "../pages/AdminPanel.jsx";
import AtchotOfitsant from "../pages/AtchotOfitsantlar.jsx";
import AtchotOvqatlar from "../pages/AtchotOvqatlar.jsx";
import Asboblar from "../pages/Asboblar.jsx";
import Sozlamalar from "../pages/Sozlamalar.jsx";
import Stollar from "../pages/Stollar.jsx";
import Taomlar from "../pages/Taomlar.jsx";
import TaomlarSoz from "../pages/TaomlarSoz.jsx";
import Zakazlar from "../pages/Zakazlar.jsx";
import ZakazlarTarixi from "../pages/ZakazlarTarixi.jsx";
import Chiqish from "../pages/Chiqish.jsx";
import Login from "../pages/Login.jsx";
import Dostavka from "../pages/Dostavka.jsx"; // Added Dostavka import
import AtchotDastafka from "../pages/AtchotDastafka.jsx"; // Added Dostavka import

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
      { path: "/AdminPanel/ofitsant", element: <AtchotOfitsant /> },
      { path: "AdminPanel/ovqat", element: <AtchotOvqatlar /> },
      { path: "AtchotDastafka", element: <AtchotDastafka /> },
      { path: "Asboblar", element: <Asboblar /> },
      { path: "Sozlamalar", element: <Sozlamalar /> },
      { path: "Stollar", element: <Stollar /> },
      { path: "Taomlar", element: <Taomlar /> },
      { path: "TaomlarSoz", element: <TaomlarSoz /> },
      { path: "Zakazlar", element: <Zakazlar /> },
      { path: "/Dostavka", element: <Dostavka />},
      { path: "ZakazlarTarixi", element: <ZakazlarTarixi /> },
      { path: "Chiqish", element: <Chiqish /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" />,
  },
]);
