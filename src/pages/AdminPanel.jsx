import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import { Printer, Edit, Trash2, Eye } from "lucide-react";
import Receipt from "../components/Receipt.jsx";
import "./styles/AdminPanel.css";
import Header from "../components/Header.jsx";

export default function AdminPanel() {
  // Helper function to get today's date in yyyy-mm-dd format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalType, setModalType] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const receiptRef = useRef();
  const token = localStorage.getItem("token");

  const createApiRequest = (token) => ({
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  const calculateTotalPrice = (order) => {
    const itemsPrice = order?.orderItems?.reduce((sum, item) => {
      const price = item?.product?.price ? parseFloat(item.product.price) : 0;
      const count = item?.count ? parseInt(item.count) : 0;
      return sum + price * count;
    }, 0) || 0;
    return itemsPrice;
  };

  const getCommissionRate = (order) => {
    return order?.tableId && order?.uslug ? parseFloat(order.uslug) : 0;
  };

  const formatPrice = (price) => {
    const validPrice = isNaN(price) || price === null ? 0 : Math.floor(price);
    const priceStr = validPrice.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${formatted} сўм`;
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handlePrintOrder = (order) => {
    const isDelivery = !order.tableId;
    const table = tables.find((table) => table.id === order.tableId);
    const totalPrice = calculateTotalPrice(order);
    const commissionRate = getCommissionRate(order);
    const commission = totalPrice * (commissionRate / 100);
    setCurrentOrder({
      id: order.id || null,
      orderItems: order.orderItems || [],
      tableNumber: isDelivery
        ? order.carrierNumber || "Йўқ"
        : table
        ? `${table.name} - ${table.number}`
        : "Йўқ",
      totalPrice: totalPrice,
      commission: commission,
      totalWithCommission: totalPrice + commission,
      createdAt: order.createdAt || null,
      uslug: parseFloat(order.uslug) || 0,
    });
    setTimeout(() => {
      if (receiptRef.current) {
        handlePrint();
      } else {
        console.log("Receipt ref is not set yet.");
      }
    }, 100);
  };

  const fetchData = async () => {
    try {
      const [ordersRes, tablesRes] = await Promise.all([
        axios.get("https://alikafecrm.uz/order", createApiRequest(token)),
        axios.get("https://alikafecrm.uz/tables", createApiRequest(token)),
      ]);

      const sanitizedOrders = ordersRes.data
        .map((order) => ({
          ...order,
          orderItems: Array.isArray(order.orderItems)
            ? order.orderItems.map((item) => ({
                ...item,
                product: item.product
                  ? {
                      ...item.product,
                      price: parseFloat(item.product.price) || 0,
                    }
                  : { price: 0, name: "Номаълум таом" },
                count: parseInt(item.count) || 0,
              }))
            : [],
          uslug: parseFloat(order.uslug) || null,
        }))
        .sort((a, b) => {
          if (a.status === "ARCHIVE" && b.status !== "ARCHIVE") return 1;
          if (a.status !== "ARCHIVE" && b.status === "ARCHIVE") return -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      setOrders((prevOrders) => {
        if (JSON.stringify(prevOrders) !== JSON.stringify(sanitizedOrders)) {
          return sanitizedOrders;
        }
        return prevOrders;
      });
      setTables(tablesRes.data.data || []);
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

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      alert("Бошланғич сана якуний санадан катта бўлмаслиги керак.");
      return;
    }

    const confirmClear = window.confirm(
      `Ростдан ҳам ${startDate} 00:00 дан ${endDate} 23:59 гача бўлган арxиви буюртмаларни ўчирмоқчимисиз? Бу амални ортга қайтариб бўлмайди!`
    );
    if (!confirmClear) return;

    try {
      const archiveOrders = orders.filter(
        (order) =>
          order.status === "ARCHIVE" &&
          new Date(order.createdAt) >= start &&
          new Date(order.createdAt) <= end
      );

      if (archiveOrders.length === 0) {
        alert("Танланган даврда арxиви буюртмалар йўқ.");
        return;
      }

      await Promise.all(
        archiveOrders.map((order) =>
          axios.delete(`https://alikafecrm.uz/order/${order.id}`, createApiRequest(token))
        )
      );

      alert("Арxиви буюртмалар муваффақиятли ўчирилди.");
      await fetchData();
      setStartDate(getTodayDate());
      setEndDate(getTodayDate());
    } catch (error) {
      console.error("Ўчириш хатоси:", error);
      const message = error.response?.data?.message || "Буюртмаларни ўчиришда хатолик юз берди.";
      alert(message);
    }
  };

  const getFilteredOrders = () => {
    if (!startDate || !endDate) {
      return orders;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });
  };

  const calculateSummary = () => {
    const filteredOrders = getFilteredOrders();
    let totalPrice = 0;
    let totalCommission = 0;
    let totalWithCommission = 0;

    filteredOrders.forEach((order) => {
      const orderTotal = calculateTotalPrice(order);
      const commissionRate = getCommissionRate(order);
      const orderCommission = orderTotal * (commissionRate / 100);
      totalPrice += orderTotal;
      totalCommission += orderCommission;
      totalWithCommission += orderTotal + orderCommission;
    });

    return {
      totalPrice,
      totalCommission,
      totalWithCommission,
      ordersCount: filteredOrders.length,
    };
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const tableMap = tables.reduce((map, table) => {
    map[table.id] = { name: table.name, number: table.number };
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
      case "PENDING":
        return "Навбатда";
      case "COOKING":
        return "Тайёрланмоқда";
      case "READY":
        return "Тайёр";
      case "COMPLETED":
        return "Мижоз олдида";
      case "ARCHIVE":
        return "Тугалланган";
      default:
        return status;
    }
  };

  const filteredOrders = getFilteredOrders();
  const summary = calculateSummary();

  return (
    <div className="app">
      <Header />
      <header
        style={{
          marginTop: "28px",
          marginLeft: "-40px",
        }}
        className="header1"
      >
        <h1
          style={{
            color: "#ffffff",
            marginTop: "-30px",
            marginLeft: "40px",
            fontSize: "40px",
          }}
        >
          Администратор панели
        </h1>
      </header>
      <div style={{ marginTop: "5px" }} className="admin-panel">
        <section className="orders-section">
          <div
            style={{
              marginBottom: "var(--space-4)",
              padding: "var(--space-4)",
              backgroundColor: "#f8f9fa",
              borderRadius: "var(--radius-md)",
              border: "1px solid #dee2e6",
            }}
          >
            <h3 style={{ marginBottom: "var(--space-3)", color: "#495057" }}>
              Жами ҳисобот
              {startDate && endDate && (
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "normal",
                    color: "#6c757d",
                  }}
                >
                  ( {startDate} 00:00 дан {endDate} 23:59 гача )
                </span>
              )}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  backgroundColor: "white",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#28a745",
                  }}
                >
                  {summary.ordersCount}
                </div>
                <div style={{ color: "#6c757d", fontSize: "14px" }}>
                  Буюртмалар сони
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  backgroundColor: "white",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#007bff",
                  }}
                >
                  {formatPrice(summary.totalPrice)}
                </div>
                <div style={{ color: "#6c757d", fontSize: "14px" }}>
                  Умумий сотув
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  backgroundColor: "white",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#ffc107",
                  }}
                >
                  {formatPrice(summary.totalCommission)}
                </div>
                <div style={{ color: "#6c757d", fontSize: "14px" }}>
                  Жами комиссия
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  backgroundColor: "white",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#dc3545",
                  }}
                >
                  {formatPrice(summary.totalWithCommission)}
                </div>
                <div style={{ color: "#6c757d", fontSize: "14px" }}>
                  Жами (комиссия билан)
                </div>
              </div>
            </div>
          </div>

          <div
            className="clear-orders-form"
            style={{ marginBottom: "var(--space-4)" }}
          >
            <div
              style={{
                display: "flex",
                sucked: "var(--space-3)",
                alignItems: "center",
              }}
            >
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
                    border: "1px solid var(--color-neutral-300)",
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
                    border: "1px solid var(--color-neutral-300)",
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
                  height: "36px",
                }}
              >
                Арxивни ўчириш
              </button>
            </div>
          </div>
          {orders.length === 0 ? (
            <p style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              Буюртмалар йўқ
            </p>
          ) : (
            <>
              <div className="table-container">
                <table style={{ overflow: "hidden" }} className="orders-table">
                  <thead>
                    <tr>
                      <th>Буюртма №</th>
                      <th>Стол/Телефон</th>
                      <th>Бошланғич сана</th>
                      <th>Жами сумма</th>
                      <th>Комиссия (%)</th>
                      <th>Ҳолати</th>
                      <th>Амаллар</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => {
                      const isDelivery = !order.tableId;
                      const totalPrice = calculateTotalPrice(order);
                      const commissionRate = getCommissionRate(order);
                      const commission = totalPrice * (commissionRate / 100);
                      const totalWithCommission = totalPrice + commission;
                      const table = tableMap[order.tableId];
                      return (
                        <tr key={`${order.id}-${index}`}>
                          <td>№ {order.id}</td>
                          <td>
                            {isDelivery
                              ? order.carrierNumber || "Йўқ"
                              : table
                              ? `${table.name} - ${table.number}`
                              : "Йўқ"}
                          </td>
                          <td>
                            {new Date(order.createdAt).toLocaleString("uz-UZ", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td>{formatPrice(totalWithCommission)}</td>
                          <td>{commissionRate}%</td>
                          <td>
                            <span
                              className={`status-badge ${
                                order.status === "PENDING"
                                  ? "status-pending"
                                  : order.status === "COOKING"
                                  ? "status-cooking"
                                  : order.status === "READY"
                                  ? "status-ready"
                                  : order.status === "COMPLETED"
                                  ? "status-completed"
                                  : order.status === "ARCHIVE"
                                  ? "status-archive"
                                  : "status-default"
                              }`}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </td>
                          <td className="actions-column">
                            {order.status !== "ARCHIVE" && (
                              <>
                                <button
                                  className="action-button edit"
                                  onClick={() => handleEdit(order)}
                                  title="Таҳрирлаш"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="action-button delete"
                                  onClick={() => handleDelete(order.id)}
                                  title="Ўчириш"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            <button
                              className="action-button view"
                              onClick={() => handleView(order)}
                              title="Кўриш"
                            >
                              <Eye size={16} />
                            </button>
                            {order.status === "ARCHIVE" && (
                              <>
                                <button
                                  className="action-button delete"
                                  onClick={() => handleDelete(order.id)}
                                  title="Ўчириш"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button
                                  className="action-button order-card__print-btn"
                                  onClick={() => handlePrintOrder(order)}
                                  title="Чоп этиш"
                                >
                                  <Printer size={16} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {selectedOrder && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-content">
                <h3>
                  {modalType === "view" ? "Буюртма ҳақида" : "Буюртмани таҳрирлаш"}
                </h3>
                <p>
                  <b>Буюртма №</b> {selectedOrder.id}
                </p>
                <p>
                  <b>Стол/Телефон:</b>{" "}
                  {!selectedOrder.tableId
                    ? selectedOrder.carrierNumber || "Йўқ"
                    : tableMap[selectedOrder.tableId]
                    ? `${tableMap[selectedOrder.tableId].name} - ${tableMap[selectedOrder.tableId].number}`
                    : "Йўқ"}
                </p>
                <div>
                  <b>Таомлар:</b>
                  {selectedOrder.orderItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      <img
                        src={`https://alikafecrm.uz${item.product?.image}`}
                        alt={item.product?.name}
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "var(--radius-md)",
                          marginRight: "var(--space-3)",
                        }}
                        onError={(e) => {
                          e.target.src = "/placeholder-food.jpg";
                        }}
                      />
                      <span>
                        {item.product?.name || "Номаълум таом"} ({item.count}) -{" "}
                        {formatPrice((item.product?.price || 0) * (item.count || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <p>
                  <b>Умумий нарxи:</b>{" "}
                  {formatPrice(calculateTotalPrice(selectedOrder))}
                </p>
                <p>
                  <b>Комиссия ({getCommissionRate(selectedOrder)}%):</b>{" "}
                  {formatPrice(
                    calculateTotalPrice(selectedOrder) *
                      (getCommissionRate(selectedOrder) / 100)
                  )}
                </p>
                <p>
                  <b>Жами (комиссия билан):</b>{" "}
                  {formatPrice(
                    calculateTotalPrice(selectedOrder) *
                      (1 + getCommissionRate(selectedOrder) / 100)
                  )}
                </p>

                {modalType === "edit" && (
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <label>Ҳолатни ўзгартириш:</label>
                    <select
                      className="modal-input"
                      value={selectedOrder.status}
                      onChange={(e) =>
                        setSelectedOrder({
                          ...selectedOrder,
                          status: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "var(--space-2)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-neutral-300)",
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
                          await axios.put(
                            `https://alikafecrm.uz/order/${selectedOrder.id}`,
                            {
                              status: selectedOrder.status,
                              uslug: parseFloat(selectedOrder.uslug) || null,
                            },
                            createApiRequest(token)
                          );
                          alert("Буюртма янгиланди");
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

                <button
                  style={{ padding: "10px" }}
                  className="action-button delete"
                  onClick={() => setSelectedOrder(null)}
                >
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
                uslug: 0,
              }
            }
          />
        </div>
      </div>
    </div>
  );
}