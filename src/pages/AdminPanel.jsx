import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import { Printer } from "lucide-react";
import Receipt from "../components/Receipt.jsx";
import "./styles/AdminPanel.css";

export default function AdminPanel() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalType, setModalType] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [commissionRate, setCommissionRate] = useState(0);
  const receiptRef = useRef();
  const token = localStorage.getItem("token");

  const createApiRequest = (token) => ({
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  const calculateTotalPrice = (orderItems) => {
    if (!orderItems || !Array.isArray(orderItems)) {
      console.warn("Invalid orderItems:", orderItems);
      return 0;
    }
    return orderItems.reduce(
      (sum, item) => sum + parseFloat(item.product?.price || 0) * item.count,
      0
    );
  };

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${formatted} сўм`;
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handlePrintOrder = (order) => {
    const isDelivery = !order.tableId;
    setCurrentOrder({
      id: order.id || null,
      orderItems: order.orderItems || [],
      tableNumber: isDelivery
        ? order.carrierNumber || "Йўқ" 
        : tables.find((table) => table.id === order.tableId)?.number || "Йўқ",
      totalPrice: calculateTotalPrice(order.orderItems),
      commission: calculateTotalPrice(order.orderItems) * (commissionRate / 100),
      totalWithCommission:
        calculateTotalPrice(order.orderItems) +
        calculateTotalPrice(order.orderItems) * (commissionRate / 100),
      createdAt: order.createdAt || null,
    });
    setTimeout(() => {
      if (receiptRef.current) {
        handlePrint();
      } else {
        alert("Чоп этиш учун маълумотлар тайёр эмас.");
      }
    }, 100);
  };

  const fetchData = async () => {
    try {
      const [ordersRes, tablesRes, percentRes] = await Promise.all([
        axios.get("https://alikafecrm.uz/order", createApiRequest(token)),
        axios.get("https://alikafecrm.uz/tables", createApiRequest(token)),
        axios.get("https://alikafecrm.uz/percent/1", createApiRequest(token)),
      ]);

      const sanitizedOrders = ordersRes.data
        .map((order) => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
        }))
        .sort((a, b) => {
          if (a.status === "ARCHIVE" && b.status !== "ARCHIVE") return 1;
          if (a.status !== "ARCHIVE" && b.status === "ARCHIVE") return -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      // Логируем данные заказов для отладки
      console.log("Orders:", sanitizedOrders);

      setOrders((prevOrders) => {
        if (JSON.stringify(prevOrders) !== JSON.stringify(sanitizedOrders)) {
          return sanitizedOrders;
        }
        return prevOrders;
      });
      setTables(tablesRes.data.data);
      setCommissionRate(parseFloat(percentRes.data?.percent) || 0);
    } catch (error) {
      console.error("Маълумотларни олишда хатолик:", error);
      alert("Маълумотларни олишда хатолик юз берди.");
    }
  };

  const handleClearOrders = async () => {
    if (!startDate || !endDate) {
      alert("Илтимос, бошланғич ва якуний санани танланг.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Бошланғич сана якуний санадан катта бўлмаслиги керак.");
      return;
    }

    const confirmClear = window.confirm(
      `Ростдан ҳам ${startDate} дан ${endDate} гача бўлган архиви буюртмаларни ўчирмоқчимисиз? Бу амални ортга қайтариб бўлмайди!`
    );
    if (!confirmClear) return;

    try {
      const archiveOrders = orders.filter(
        (order) =>
          order.status === "ARCHIVE" &&
          new Date(order.createdAt) >= new Date(startDate) &&
          new Date(order.createdAt) <= new Date(endDate)
      );

      if (archiveOrders.length === 0) {
        alert("Танланган даврда архиви буюртмалар йўқ.");
        return;
      }

      await Promise.all(
        archiveOrders.map((order) =>
          axios.delete(`https://alikafecrm.uz/order/${order.id}`, createApiRequest(token))
        )
      );

      alert("Архиви буюртмалар муваффақиятли ўчирилди.");
      await fetchData();
      setStartDate("");
      setEndDate("");
    } catch (error) {
      console.error("Ўчириш хатоси:", error);
      const message = error.response?.data?.message || "Буюртмаларни ўчиришда хатолик юз берди.";
      alert(message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const tableMap = tables.reduce((map, table) => {
    map[table.id] = table.number;
    return map;
  }, {});

  const handleView = (order) => {
    setSelectedOrder(order);
    setModalType("view");
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setModalType("edit");
  };

  const handleDelete = async (orderId) => {
    const confirmDelete = window.confirm("Ростдан ҳам бу буюртмани ўчирмоқчимисиз?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`https://alikafecrm.uz/order/${orderId}`, createApiRequest(token));
      alert("Буюртма ўчирилди");
      await fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setModalType("");
      }
    } catch (error) {
      alert("Ўчиришда хатолик юз берди");
      console.error("Ўчириш хатоси:", error);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "PENDING": return "Навбатда";
      case "COOKING": return "Тайёрланмоқда";
      case "READY": return "Тайёр";
      case "COMPLETED": return "Мижоз олдида";
      case "ARCHIVE": return "Тугалланган";
      default: return status;
    }
  };

  return (
    <div className="app">
      <header style={{
        marginTop: "-45px",
        marginLeft: "-40px",
      }} className="header1">
        <h1 style={{ color: '#ffffff', marginTop: "-30px", marginLeft: "40px", fontSize: "40px" }}>
          Администратор панели 
        </h1>
      </header>
      <div style={{ marginTop: "5px" }} className="admin-panel">
        <section className="orders-section">
          <h2>Барча буюртмалар</h2>
          <div className="clear-orders-form" style={{ marginBottom: "var(--space-4)" }}>
            <h3>Архиви буюртмаларни ўчириш</h3> 
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
              <div>
                <label>Бошланғич сана:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="modal-input"
                  style={{
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid var(--color-neutral-300)`,
                    marginTop: "var(--space-1)",
                  }}
                />
              </div>
              <div>
                <label>Якуний сана:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="modal-input"
                  style={{
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid var(--color-neutral-300)`,
                    marginTop: "var(--space-1)",
                  }}
                />
              </div>
              <button
                className="action-button delete"
                onClick={handleClearOrders}
                style={{
                  padding: "var(--space-1) var(--space-4)",
                  marginTop: "25px",
                  height: "36px"
                }}
              >
                Ўчириш 
              </button>
            </div>
          </div>
          {orders.length === 0 ? (
            <p style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              Буюртмалар йўқ 
            </p>
          ) : (
            <div className="table-container">
              <table style={{overflow: "hidden"}} className="orders-table">
                <thead>
                  <tr>
                    <th>Буюртма №</th>
                    <th>Стол/Телефон</th>
                    <th>Таом</th>
                    <th>Комиссия ({commissionRate}%)</th>
                    <th>Умумий нархи</th>
                    <th>Комиссия</th>
                    <th>Жами</th>
                    <th>Ҳолати</th>
                    <th>Сана</th>
                    <th>Бажариладиган иши</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const totalPrice = calculateTotalPrice(order.orderItems);
                    const commission = totalPrice * (commissionRate / 100);
                    const totalWithCommission = totalPrice + commission;
                    const isDelivery = !order.tableId;
                    return (
                      <tr key={`${order.id}-${index}`}>
                        <td>№ {order.id}</td>
                        <td>
                          {isDelivery
                            ? order.carrierNumber || "Йўқ"
                            : tableMap[order.tableId] || "Йўқ"}
                        </td>
                        <td className="item-column">
                          {order.orderItems.map((item) => `${item.product.name} (${item.count})`).join(", ")}
                        </td>
                        <td>{formatPrice(commission)}</td>
                        <td>{formatPrice(totalPrice)}</td>
                        <td>{formatPrice(commission)}</td>
                        <td>{formatPrice(totalWithCommission)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              order.status === "PENDING" ? "status-pending" :
                              order.status === "COOKING" ? "status-cooking" :
                              order.status === "READY" ? "status-ready" :
                              order.status === "COMPLETED" ? "status-completed" :
                              order.status === "ARCHIVE" ? "status-archive" :
                              "status-default"
                            }`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="actions-column">
                          {order.status !== "ARCHIVE" && (
                            <>
                              <button className="action-button edit" onClick={() => handleEdit(order)}>
                                Таҳрирлаш
                              </button>
                              <button className="action-button delete" onClick={() => handleDelete(order.id)}>
                                Ўчириш
                              </button>
                            </>
                          )}
                          <button className="action-button view" onClick={() => handleView(order)}>
                            Кўриш
                          </button>
                          {order.status === "ARCHIVE" && (
                            <button
                              className="order-card__print-btn"
                              onClick={() => handlePrintOrder(order)}
                              title="Чоп этиш"
                            >
                              <Printer size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedOrder && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-content">
                <h3>{modalType === "view" ? "Буюртма ҳақида" : "Буюртмани таҳрирлаш"}</h3>
                <p><b>Буюртма №</b> {selectedOrder.id}</p>
                <p>
                  <b>Стол/Телефон:</b>{" "}
                  {!selectedOrder.tableId
                    ? selectedOrder.carrierNumber || "Йўқ"
                    : tableMap[selectedOrder.tableId] || "Йўқ"}
                </p>
                <div>
                  <b>Таомлар:</b>
                  {selectedOrder.orderItems.map((item, index) => (
                    <div
                      key={index}
                      style={{ display: "flex", alignItems: "center", marginBottom: "var(--space-2)" }}
                    >
                      <img
                        src={`https://alikafecrm.uz${item.product?.image}`}
                        alt={item.product?.name}
                        style={{ width: "50px", height: "50px", borderRadius: "var(--radius-md)", marginRight: "var(--space-3)" }}
                      />
                      <span>{item.product.name} ({item.count})</span>
                    </div>
                  ))}
                </div>
                <p><b>Ҳолати:</b> {getStatusText(selectedOrder.status)}</p>
                <p><b>Умумий нархи:</b> {formatPrice(calculateTotalPrice(selectedOrder.orderItems))}</p>
                <p><b>Комиссия ({commissionRate}%):</b> {formatPrice(calculateTotalPrice(selectedOrder.orderItems) * (commissionRate / 100))}</p>
                <p><b>Жами (комиссия билан):</b> {formatPrice(calculateTotalPrice(selectedOrder.orderItems) + calculateTotalPrice(selectedOrder.orderItems) * (commissionRate / 100))}</p>

                {modalType === "edit" && (
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <label>Ҳолатни ўзгартириш:</label>
                    <select
                      className="modal-input"
                      value={selectedOrder.status}
                      onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "var(--space-2)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid var(--color-neutral-300)`,
                        marginTop: "var(--space-2)",
                      }}
                    >
                      <option value="PENDING">Навбатда</option>
                      <option value="COOKING">Тайёрланмоқда</option>
                      <option value="READY">Тайёр</option>
                      <option value="COMPLETED">Мижоз олдида</option>
                      <option value="ARCHIVE">Тугалланган</option>
                    </select>
                    <button
                      className="action-button edit"
                      onClick={async () => {
                        try {
                          await axios.put(`https://alikafecrm.uz/order/${selectedOrder.id}`, { status: selectedOrder.status }, createApiRequest(token));
                          alert("Буюртма янгилани");
                          setSelectedOrder(null);
                          setModalType("");
                          await fetchData();
                        } catch (err) {
                          alert("Хатолик юз берди");
                          console.error(err);
                        }
                      }}
                      style={{ marginTop: "var(--space-3)" }}
                    >
                      Сақлаш
                    </button>
                  </div>
                )}

                <button className="action-button delete" onClick={() => setSelectedOrder(null)}>
                  Ёпиш
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "none" }}>
          <Receipt
            ref={receiptRef}
            order={
              currentOrder || {
                id: null,
                orderItems: [],
                tableNumber: "",
                totalPrice: 0,
                commission: 0,
                totalWithCommission: 0,
                createdAt: null,
              }
            }
          />
        </div>
      </div>
    </div>
  );
}