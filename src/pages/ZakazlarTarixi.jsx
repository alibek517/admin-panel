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

// Filter options for order statuses
const filters = [
  { label: "Барчаси", name: "ALL", icon: Package },
  { label: "Навбатда", name: "PENDING", icon: CircleDot },
  { label: "Тайёрланмоқда", name: "COOKING", icon: ChefHat },
  { label: "Тайёр", name: "READY", icon: Hamburger },
  { label: "Мижоз олдида", name: "COMPLETED", icon: UserCircle2 },
  { label: "Тугалланган", name: "ARCHIVE", icon: CheckCheck },
];

// Map order status to CSS class for styling
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
  // State variables
  const [orders, setOrders] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0);
  const [openFoodItems, setOpenFoodItems] = useState(null);

  // Calculate total price of order items
  const calculateTotalPrice = (orderItems) => {
    if (!Array.isArray(orderItems)) return 0;
    return orderItems.reduce(
      (sum, item) => sum + parseFloat(item.product?.price || 0) * (item.count || 0),
      0
    );
  };

  // Fetch data from API
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

        const [ordersResponse, categoriesResponse, tablesResponse, percentResponse] =
          await Promise.all([
            axios.get("https://alikafecrm.uz/order", config),
            axios.get("https://alikafecrm.uz/category", config),
            axios.get("https://alikafecrm.uz/tables", config),
            axios.get("https://alikafecrm.uz/percent/1", config),
          ]);

        // Sanitize orders to ensure orderItems is an array
        const sanitizedOrders = ordersResponse.data.map((order) => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
        }));

        setOrders(sanitizedOrders);
        setCategoryList(categoriesResponse.data || []);
        setTables(tablesResponse.data.data || []);
        setCommissionRate(parseFloat(percentResponse.data?.percent) || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Маълумотларни юклашда хатолик юз берди.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Map table IDs to their number and name
  const tableMap = tables.reduce(
    (map, table) => ({
      ...map,
      [table.id]: {
        number: table.number || "Unknown",
        name: table.name || "Номсиз", // Fallback if name is missing
      },
    }),
    {}
  );

  // Filter and sort orders
  const filteredHistory = orders
    .filter((order) => {
      const matchesFilterStatus =
        activeFilter === "ALL" || order.status === activeFilter;
      const matchesSearchInput =
        order.id.toString().includes(searchInput) ||
        (order.tableId &&
          (tableMap[order.tableId]?.number?.toString().includes(searchInput) ||
            tableMap[order.tableId]?.name?.toLowerCase().includes(searchInput.toLowerCase()))) ||
        (order.carrierNumber && order.carrierNumber.toLowerCase().includes(searchInput.toLowerCase())) ||
        false;
      const orderDate = new Date(order.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const matchesDateRange =
        (!start || orderDate >= start) &&
        (!end || orderDate <= new Date(end).setHours(23, 59, 59, 999));
      return matchesFilterStatus && matchesSearchInput && matchesDateRange;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortAscending ? dateA - dateB : dateB - dateA;
    });

  // Toggle food items visibility
  const toggleFoodItems = (orderId) => {
    setOpenFoodItems(openFoodItems === orderId ? null : orderId);
  };

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
            <div className="controls">
              <div className="search-container">
                <div className="search-input">
                  <Search className="icon" />
                  <input
                    type="text"
                    placeholder="ID, стол ёки телефон бўйича қидириш..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="date-input">
                  <Calendar className="icon" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Бошланиш санаси"
                  />
                </div>
                <div className="date-input">
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
                  const totalPrice = calculateTotalPrice(order.orderItems);
                  const commission = totalPrice * (commissionRate / 100);
                  const totalWithCommission = totalPrice + commission;
                  const isDelivery = !order.tableId;
                  return (
                    <React.Fragment key={order.id}>
                      <tr>
                        <td>{order.id}</td>
                        <td>
                          {isDelivery
                            ? order.carrierNumber || "Йўқ"
                            : tableMap[order.tableId]
                              ? `${tableMap[order.tableId].name} - ${tableMap[order.tableId].number}`
                              : "Йўқ"}
                        </td>
                        <td>{totalPrice.toLocaleString("uz-UZ")} сўм</td>
                        <td>{commission.toLocaleString("uz-UZ")} сўм</td>
                        <td>{totalWithCommission.toLocaleString("uz-UZ")} сўм</td>
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
                          <td colSpan="8" className="food-items">
                            {order.orderItems.length > 0 ? (
                              order.orderItems.map((item) => (
                                <div key={item.id}>
                                  {`${item.product?.name || "Номаълум"} (${item.count || 0})`}
                                </div>
                              ))
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