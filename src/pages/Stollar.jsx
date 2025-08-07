import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash, Edit, Eye, Loader2 } from "lucide-react";
import "./styles/Stollar.css";

export default function Stollar() {
  const [stollar, setStollar] = useState([]);
  const [modal, setModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [filter, setFilter] = useState("Барча"); 
  const [nameFilter, setNameFilter] = useState("Барча");
  const [newStol, setNewStol] = useState({
    name: "",
    number: "",
    status: "Бўш",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = "http://192.168.1.8:4356/tables";

  const statusMapToBackend = { "Бўш": "empty", Банд: "busy" };
  const statusMapToFrontend = { empty: "Бўш", busy: "Банд" };

  const calculateTotalPrice = (orderItems) => {
    return orderItems.reduce(
      (sum, item) => sum + parseFloat(item.product?.price || 0) * item.count,
      0
    );
  };

  const cleanNumber = (number) => number.replace(/\s+/g, " ").trim();

  const uniqueNames = ["Барча", ...new Set(stollar.map((stol) => stol.name))];

  useEffect(() => {
    const fetchStollar = async () => {
      try {
        const res = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const result = res.data;

        if (result.success && Array.isArray(result.data)) {
          const mappedData = result.data
            .map((stol) => ({
              ...stol,
              number: cleanNumber(stol.number),
              status: statusMapToFrontend[stol.status] || stol.status,
              orders: Array.isArray(stol.orders)
                ? stol.orders
                    .filter((order) => order.status !== "ARCHIVE")
                    .map((order) => ({
                      ...order,
                      orderItems: Array.isArray(order.orderItems)
                        ? order.orderItems
                        : [],
                    }))
                : [],
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setStollar(mappedData);
          await checkAndUpdateStatuses(mappedData);
        } else {
          setError(result.message || "Столларни олишда хато юз берди");
        }
      } catch (error) {
        console.error("Столларни олишда хато:", error);
        setError("API билан боғланишда хато");
      } finally {
        setLoading(false);
      }
    };

    fetchStollar();
  }, []);

  const checkAndUpdateStatuses = async (tables) => {
    try {
      for (const table of tables) {
        if (table.orders.length === 0 && table.status === "Банд") {
          await axios.patch(
            `${API_URL}/${table.id}`,
            { status: "empty" },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setStollar((prev) =>
            prev.map((stol) =>
              stol.id === table.id ? { ...stol, status: "Бўш" } : stol
            )
          );
        }
      }
    } catch (error) {
      console.error(
        "Статусларни текширишда хато:",
        error.response?.data || error.message
      );
      setError("Стол статусларини янгилашда хато");
    }
  };

  const handleAddStol = async () => {
    if (!newStol.name || !newStol.number) {
      setError("Илтимос, стол номи ва рақамини киритинг");
      return;
    }
    if (!["Бўш", "Банд"].includes(newStol.status)) {
      setError("Илтимос, тўғри статус танланг");
      return;
    }

    try {
      const res = await axios.post(
        API_URL,
        {
          name: newStol.name,
          number: newStol.number,
          status: statusMapToBackend[newStol.status],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const newTable = {
        ...res.data.data,
        number: cleanNumber(res.data.data.number),
        status:
          statusMapToFrontend[res.data.data.status] || res.data.data.status,
        orders: [],
      };

      setStollar((prev) =>
        [newTable, ...prev].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
      setNewStol({ name: "", number: "", status: "Бўш" });
      setModal(false);
      setError(null);
    } catch (err) {
      console.error("Стол қўшишда хато:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Стол қўшишда хато";
      setError(errorMessage);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newFrontendStatus = currentStatus === "Бўш" ? "Банд" : "Бўш";
    const newBackendStatus = statusMapToBackend[newFrontendStatus];

    try {
      await axios.patch(
        `${API_URL}/${id}`,
        { status: newBackendStatus },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setStollar((prev) =>
        prev.map((stol) =>
          stol.id === id ? { ...stol, status: newFrontendStatus } : stol
        )
      );
    } catch (err) {
      console.error("Статусни ўзгартиришда хато:", err);
      setError("Статусни ўзгартиришда хато");
    }
  };

  const handleDelete = async (id, number) => {
    if (!window.confirm(`"${number}" столни ўчиришни хоҳлайсизми?`)) return;

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setStollar((prev) => prev.filter((stol) => stol.id !== id));
      setError(null);
    } catch (err) {
      console.error("Столни ўчиришда хато:", err);
      setError("Столни ўчиришда хато");
    }
  };

  const handleShowOrders = (table) => {
    setSelectedTable(table);
    setOrderModal(true);
  };

  const formatPrice = (price) => {
    const priceStr = price.toString();
    return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм";
  };

  const getOrdersForTable = (tableId) => {
    const table = stollar.find((stol) => stol.id === tableId);
    if (!table) return [];
    return table.orders;
  };

  const categories = ["Барча", "Бўш", "Банд"];

  const groupedTables = stollar.reduce((acc, stol) => {
    const existing = acc.find((item) => item.name === stol.name);
    if (existing) {
      existing.tables.push(stol);
      existing.orders = [...existing.orders, ...stol.orders];
      existing.status = existing.status === "Банд" || stol.status === "Банд" ? "Банд" : "Бўш";
    } else {
      acc.push({
        name: stol.name,
        tables: [stol],
        orders: stol.orders,
        status: stol.status,
        id: stol.id, 
        number: stol.number, 
      });
    }
    return acc;
  }, []);

  return (
    <div className="app">
      <div className="main-content">
        <div className="main-content-table">
          <h1 className="section-title">Столлар</h1>
          {error && <div className="text-danger">{error}</div>}
        </div>
        {loading ? (
          <div className="spinner">
            <Loader2 className="animate-spin" size={48} />
          </div>
        ) : (
          <div>
            <div className="filter-container">
              <div className="filter-buttons">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-button ${
                      filter === cat ? "active" : ""
                    }`}
                    onClick={() => setFilter(cat)}
                  >
                    {cat} столлар
                  </button>
                ))}
              </div>
              <div className="name-filter">
                <select
                style={{marginTop:'30px'}}
                  className="form-control"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                >
                  {uniqueNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-list">
              <ul>
                
                {groupedTables
                  .filter(
                    (group) =>
                      (filter === "Барча" || group.status === filter) &&
                      (nameFilter === "Барча" || group.name === nameFilter)
                  )
                  .map((group) => (
                    <li
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                      key={group.id}
                      className={`table-item ${
                        group.status === "Банд" ? "band" : "bosh"
                      }`}
                    >
                      <div className="table-item__header">
                        <div className="table-item__info">
                          <h3 className="table-title">{group.name}</h3>
                          <h3 className="table-title">{group.number}</h3>
                          <div className="table-item__details">
                            <div className="table-item__stats">
                              <span className="info-label">Статус:</span>
                              <span
                                className={`status-badge ${
                                  group.status === "Банд" ? "band" : "bosh"
                                }`}
                              >
                                {group.status}
                              </span>
                            </div>
                            <div className="table-item__stats">
                              <span className="info-label">
                                Фаол буюртмалар:
                              </span>
                              <span className="info-value">
                                {group.orders.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="table-item__actions">
                        {group.orders.length > 0 && (
                          <button
                            className="action-button primary"
                            onClick={() => handleShowOrders(group)}
                            title="Буюртмаларни кўриш"
                          >
                            <Eye size={16} />
                            Фаол буюртмани кўриш
                          </button>
                        )}
                        <button
                          className="action-button danger"
                          onClick={() => handleDelete(group.id, group.number)}
                          title="Ўчириш"
                        >
                          <Trash size={16} />
                          Столни ўчириш
                        </button>
                        <button
                          className={`action-button ${
                            group.status === "Бўш" ? "success" : "primary"
                          }`}
                          onClick={() =>
                            handleStatusChange(group.id, group.status)
                          }
                          title={
                            group.status === "Бўш"
                              ? "Банд қилиш"
                              : "Бўшатиш"
                          }
                        >
                          <Edit size={16} />
                          {group.status === "Бўш" ? "Банд қилиш" : "Бўшатиш"}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
        {modal && (
          <div
            className={`modal-backdrop ${modal ? "active" : ""}`}
            onClick={() => {
              setModal(false);
              setError(null);
            }}
          >
            <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Янги стол қўшиш</h2>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Стол номи</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Стол номи"
                    value={newStol.name}
                    onChange={(e) =>
                      setNewStol({ ...newStol, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Стол рақами</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Стол рақами"
                    value={newStol.number}
                    onChange={(e) =>
                      setNewStol({ ...newStol, number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Статус</label>
                  <select
                    className="form-control"
                    value={newStol.status}
                    onChange={(e) =>
                      setNewStol({ ...newStol, status: e.target.value })
                    }
                  >
                    <option value="Бўш">Бўш</option>
                    <option value="Банд">Банд</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={handleAddStol}>
                  Қўшиш
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setModal(false);
                    setError(null);
                  }}
                >
                  Бекор қилиш
                </button>
              </div>
            </div>
          </div>
        )}
        {orderModal && selectedTable && (
          <div
            className={`modal-backdrop ${orderModal ? "active" : ""}`}
            onClick={() => {
              setOrderModal(false);
              setSelectedTable(null);
            }}
          >
            <div
              className="modal fade-in order-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {selectedTable.number} учун буюртмалар
                </h2>
              </div>
              <div className="modal-body">
                {selectedTable.orders.length === 0 ? (
                  <p className="text-secondary">Фаол буюртмалар йўқ</p>
                ) : (
                  selectedTable.orders.map((order) => (
                    <div key={order.id} className="order-item">
                      <div className="order-items-list">
                        <p className="info-label order-info-label">
                          <strong>Буюртма №{order.id}</strong>
                        </p>
                        <span
                          style={{
                            marginTop: "-20px",
                            marginBottom: "-20px",
                          }}
                          className="info-label"
                        >
                          Таомлар:
                        </span>
                        <div
                          style={{ marginBottom: "-20px" }}
                          className="order-items-container"
                        >
                          {order.orderItems.length > 0 ? (
                            order.orderItems.map((item, index) => (
                              <div key={index} className="order-item-detail">
                                <img
                                  style={{ width: "50px", height: "50px" }}
                                  className="order-item-image"
                                  src={
                                    item.product?.image
                                      ? `http://192.168.1.8:4356${item.product.image}`
                                      : "http://192.168.1.8:4356/placeholder.png"
                                  }
                                  alt={item.product?.name || "Маҳсулот"}
                                />
                                <span
                                  style={{
                                    marginLeft: "10px",
                                    fontSize: "16px",
                                    fontWeight: "500",
                                  }}
                                  className="info-value order-item-name"
                                >
                                  {item.product?.name || "Номаълум таом"} (
                                  {item.count})
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-secondary">
                              Буюртмада таомлар йўқ
                            </span>
                          )}
                        </div>
                        <p className="order-price">
                          <span className="info-label">Нархи:</span>
                          <span className="info-value">
                            {formatPrice(calculateTotalPrice(order.orderItems))}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setOrderModal(false);
                    setSelectedTable(null);
                  }}
                >
                  Ёпиш
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}