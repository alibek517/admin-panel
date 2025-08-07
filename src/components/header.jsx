import React, { useState, useEffect, useRef, useCallback } from "react";
import "./styles/header.css";
import axios from "axios";
import { socket } from "../socket.js";

export default function Header() {
  const [commissions, setCommissions] = useState({
    totalCommission: 0,
    dailyCommission: 0,
    last30DaysCommission: 0,
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const processedEvents = useRef(new Set());

  const formatPrice = (price) => {
    return Number(price).toLocaleString("uz-UZ");
  };

  const calculateTotalPrice = useCallback((order) => {
    const itemsPrice = order?.orderItems?.reduce((sum, item) => {
      const price = item?.product?.price ? parseFloat(item.product.price) : 0;
      const count = item?.count ? parseInt(item.count) : 0;
      return sum + price * count;
    }, 0) || 0;
    return itemsPrice;
  }, []);

  const getCommissionRate = useCallback((order) => {
    return order?.tableId && order?.uslug ? parseFloat(order.uslug) : 0;
  }, []);

  const calculateCommissions = useCallback((orders = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const totalCommission = orders.reduce((sum, order) => {
      if (!order) return sum;
      const totalPrice = calculateTotalPrice(order);
      const commissionRate = getCommissionRate(order);
      const commission = totalPrice * (commissionRate / 100);
      return sum + commission;
    }, 0);

    const dailyCommission = orders.reduce((sum, order) => {
      if (!order || new Date(order.createdAt) < today || new Date(order.createdAt) > todayEnd) return sum;
      const totalPrice = calculateTotalPrice(order);
      const commissionRate = getCommissionRate(order);
      const commission = totalPrice * (commissionRate / 100);
      return sum + commission;
    }, 0);

    const last30DaysCommission = orders.reduce((sum, order) => {
      if (!order || new Date(order.createdAt) < thirtyDaysAgo) return sum;
      const totalPrice = calculateTotalPrice(order);
      const commissionRate = getCommissionRate(order);
      const commission = totalPrice * (commissionRate / 100);
      return sum + commission;
    }, 0);

    return { totalCommission, dailyCommission, last30DaysCommission };
  }, [calculateTotalPrice, getCommissionRate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ordersResponse = await axios.get("http://192.168.1.8:4356/order", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const orders = ordersResponse.data.map((order) => ({
        ...order,
        orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
        uslug: parseFloat(order.uslug) || null,
        createdAt: order.createdAt || new Date().toISOString(),
      }));

      let usersData = [{ email: "AdminInfo@gmail.com", role: "CUSTOMER", username: "Admin" }];
      try {
        const usersResponse = await axios.get("http://192.168.1.8:4356/user", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        usersData = Array.isArray(usersResponse.data) ? usersResponse.data : usersData;
      } catch (userError) {
        console.warn("Error fetching users:", userError);
      }

      const customerUsers = usersData.filter((user) => user.role === "CUSTOMER");
      setUsers(customerUsers);
      setSelectedUser(customerUsers.length > 0 ? customerUsers[0].username : "Фойдаланувчи топилмади");

      const commissionData = calculateCommissions(orders);
      setCommissions(commissionData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Маълумотларни юклашда хатолик юз берди");
    } finally {
      setLoading(false);
    }
  }, [calculateCommissions]);

  useEffect(() => {
    fetchData();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleOrderCreated = (newOrder) => {
      if (!newOrder || !newOrder.id) return;
      const eventKey = `orderCreated:${newOrder.id}:${newOrder.createdAt || Date.now()}`;
      if (processedEvents.current.has(eventKey)) return;
      processedEvents.current.add(eventKey);

      setCommissions((prev) => {
        const sanitizedOrder = {
          ...newOrder,
          orderItems: Array.isArray(newOrder.orderItems) ? [...newOrder.orderItems] : [],
          uslug: parseFloat(newOrder.uslug) || null,
          createdAt: newOrder.createdAt || new Date().toISOString(),
        };
        const totalPrice = calculateTotalPrice(sanitizedOrder);
        const commissionRate = getCommissionRate(sanitizedOrder);
        const commission = totalPrice * (commissionRate / 100);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const isToday = new Date(sanitizedOrder.createdAt) >= today && new Date(sanitizedOrder.createdAt) <= todayEnd;
        const isLast30Days = new Date(sanitizedOrder.createdAt) >= thirtyDaysAgo;

        return {
          totalCommission: prev.totalCommission + commission,
          dailyCommission: isToday ? prev.dailyCommission + commission : prev.dailyCommission,
          last30DaysCommission: isLast30Days ? prev.last30DaysCommission + commission : prev.last30DaysCommission,
        };
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      if (!updatedOrder || !updatedOrder.id) return;
      const eventKey = `orderUpdated:${updatedOrder.id}:${updatedOrder.updatedAt || Date.now()}`;
      if (processedEvents.current.has(eventKey)) return;
      processedEvents.current.add(eventKey);
      fetchData();
    };

    const handleOrderDeleted = (data) => {
      if (!data?.id) return;
      const eventKey = `orderDeleted:${data.id}:${Date.now()}`;
      if (processedEvents.current.has(eventKey)) return;
      processedEvents.current.add(eventKey);
      fetchData();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderUpdated);
    socket.on("orderDeleted", handleOrderDeleted);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderUpdated);
      socket.off("orderDeleted", handleOrderDeleted);
    };
  }, [fetchData]);

  return (
    <header className="main-header">
      {error && <div className="error-message">{error}</div>}
      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">Комиссия жами:</span>
          <span className="stat-value">{loading ? "..." : formatPrice(commissions.totalCommission)} сўм</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Бугунги комиссия:</span>
          <span className="stat-value">{loading ? "..." : formatPrice(commissions.dailyCommission)} сўм</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Охирги 30 кунги комиссия:</span>
          <span className="stat-value">{loading ? "..." : formatPrice(commissions.last30DaysCommission)} сўм</span>
        </div>
      </div>
      <div className="user-dropdown">
        <select
          className="dropdown-toggle"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          disabled={loading}
        >
          {users.length > 0 ? (
            users.map((user) => (
              <option key={user.id || user.username} value={user.username}>
                {user.username} {user.name ? `(${user.name})` : ""}
              </option>
            ))
          ) : (
            <option>Фойдаланувчи топилмади</option>
          )}
        </select>
      </div>
      <div className="connection-status !isConnected">
        <span className={`status-indicator ${isConnected ? "online" : "offline"}`}>{isConnected ? "Online" : "Offline"}</span>
        
      </div>
    </header>
  );
}