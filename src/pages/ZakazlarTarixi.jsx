import React, { useState, useEffect } from "react";
import "./styles/ZakazTarixi.css";
import axios from "axios";
import {
  CheckCheck,
  ChefHat,
  Hamburger,
  Package,
  CircleDot,
  UserCircle2,
  Calendar,
  Search,
  Eye,
} from "lucide-react";

const filters = [
  { label: "Барчаси", name: "ALL", icon: Package },
  { label: "Навбатда", name: "PENDING", icon: CircleDot },
  { label: "Тайёрланмоқда", name: "COOKING", icon: ChefHat },
  { label: "Тайёр", name: "READY", icon: Hamburger },
  { label: "Мижоз олдида", name: "COMPLETED", icon: UserCircle2 },
  { label: "Тугалланган", name: "ARCHIVE", icon: CheckCheck },
];

const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "status navbatda";
    case "COOKING":
      return "status tayyorlanmoqda";
    case "READY":
      return "status tayyor";
    case "COMPLETED":
      return "status mijoz";
    case "ARCHIVE":
      return "status tugallangan";
    default:
      return "status";
  }
};

export default function ZakazTarixi() {
  const today = new Date().toISOString().split("T")[0];
  const [orders, setOrders] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [sortAscending, setSortAscending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openFoodItems, setOpenFoodItems] = useState(null);

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

  const formatPrice = (price) => {
    const integerPrice = Math.floor(price);
    const priceStr = integerPrice.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${formatted} сўм`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token not found");

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const [ordersResponse, categoriesResponse, tablesResponse] = await Promise.all([
          axios.get("https://alikafecrm.uz/order", config),
          axios.get("https://alikafecrm.uz/category", config),
          axios.get("https://alikafecrm.uz/tables", config),
        ]);

        const sanitizedOrders = ordersResponse.data.map((order) => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
          uslug: parseFloat(order.uslug) || null,
        }));

        setOrders(sanitizedOrders);
        setCategoryList(categoriesResponse.data || []);
        setTables(tablesResponse.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Маълумотларни юклашда хатолик юз берди.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tableMap = tables.reduce(
    (map, table) => ({
      ...map,
      [table.id]: {
        number: table.number || "Unknown",
        name: table.name || "Номсиз",
      },
    }),
    {}
  );

  const getFilteredOrders = () => {
    return orders
      .filter((order) => {
        const matchesFilterStatus =
          activeFilter === "ALL" || order.status === activeFilter;
        const matchesSearchInput =
          order.id.toString().includes(searchInput) ||
          (order.tableId &&
            (tableMap[order.tableId]?.number?.toString().includes(searchInput) ||
              tableMap[order.tableId]?.name?.toLowerCase().includes(searchInput.toLowerCase()))) ||
          (order.carrierNumber && order.carrierNumber.toString().includes(searchInput));
        const orderDate = new Date(order.createdAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        const matchesDateRange =
          (!start || orderDate >= start) &&
          (!end || orderDate <= new Date(end).setHours(23, 59, 59, 999));
        return matchesFilterStatus && matchesSearchInput && matchesDateRange && order.tableId;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortAscending ? dateA - dateB : dateB - dateA;
      });
  };

  const toggleFoodItems = (orderId) => {
    setOpenFoodItems(openFoodItems === orderId ? null : orderId);
  };

  const filteredHistory = getFilteredOrders();
  const summary = calculateSummary();

  return (
    <div className="app-container">
      <header>
        <h1 className="order-history__title">Буюртмалар тарихи</h1>
      </header>
      <div className="order-history">
        {loading ? (
          <div className="spinner" />
        ) : (
          <div>
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
                    ( {startDate} д а н {endDate} г а ч а )
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

            <div className="controls">
              <div className="search-container">
                <div style={{ display: "flex", alignItems: "center" }} className="search-input">
                  <Search className="icon" />
                  <input
                    type="text"
                    placeholder="ID, стол ёки телефон бўйича қидириш..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center" }} className="date-input">
                  <Calendar className="icon" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Бошланиш санаси"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center" }} className="date-input">
                  <Calendar className="icon" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Тугаш санаси"
                  />
                </div>
              </div>
              <div className="filter-buttons">
                {filters.map((filter) => {
                  const IconComponent = filter.icon;
                  return (
                    <button
                      key={filter.name}
                      className={activeFilter === filter.name ? "active" : ""}
                      onClick={() => setActiveFilter(filter.name)}
                    >
                      <IconComponent className="icon" />
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
                <button
                  className="filter-buttons__button latest"
                  onClick={() => setSortAscending(!sortAscending)}
                >
                  {sortAscending ? "↑ Энг эски" : "↓ Энг янги"}
                </button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Стол/Телефон</th>
                  <th>Нархи</th>
                  <th>Комиссия</th>
                  <th>Жами</th>
                  <th>Вақти</th>
                  <th>Таомлар</th>
                  <th>Ҳолати</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((order) => {
                  const totalPrice = calculateTotalPrice(order);
                  const commissionRate = getCommissionRate(order);
                  const commission = totalPrice * (commissionRate / 100);
                  const totalWithCommission = totalPrice + commission;
                  return (
                    <React.Fragment key={order.id}>
                      <tr>
                        <td>{order.id}</td>
                        <td>
                          {tableMap[order.tableId]
                            ? `${tableMap[order.tableId].name} - ${tableMap[order.tableId].number}`
                            : ""}
                        </td>
                        <td>{formatPrice(totalPrice)}</td>
                        <td>{formatPrice(commission)} ({commissionRate}%)</td>
                        <td>{formatPrice(totalWithCommission)}</td>
                        <td>
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString("uz-UZ")
                            : "Номаълум"}
                        </td>
                        <td>
                          <Eye
                            className="food-icon"
                            onClick={() => toggleFoodItems(order.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td className={getStatusClass(order.status)}>
                          {order.status === "PENDING"
                            ? "Навбатда"
                            : order.status === "COOKING"
                            ? "Тайёрланмоқда"
                            : order.status === "READY"
                            ? "Тайёр"
                            : order.status === "COMPLETED"
                            ? "Мижоз олдида"
                            : order.status === "ARCHIVE"
                            ? "Тугалланган"
                            : "Номаълум"}
                        </td>
                      </tr>
                      {openFoodItems === order.id && (
                        <tr>
                          <td colSpan="8" className="food-itemss">
                            {order.orderItems.length > 0 ? (
                              order.orderItems.map((item) => {
                                const category = categoryList.find(
                                  (cat) => cat.id === item.product?.categoryId
                                );
                                return (
                                  <div key={item.id}>
                                    {`${item.product?.name || "Номаълум"} (${
                                      item.count || 0
                                    }) - Категория: ${category?.name || "Номаълум"}`}
                                  </div>
                                );
                              })
                            ) : (
                              <div>Таомлар йўқ</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {filteredHistory.length === 0 && (
              <div className="no-results">
                <p>Ҳеч қандай буюртма топилмади</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
