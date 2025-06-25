import React, { useEffect, useState } from "react";
import "./styles/taomlar.css";
import axios from "axios";
import { Clock, ShoppingCart, Plus, Trash2, Edit } from "lucide-react";
import ModalBasket from "../components/modal/modal-basket";

// Statusni normallashtirish funksiyasi
const normalizeStatus = (status) => {
  if (!status) return "empty";
  const normalized = status.toLowerCase().trim();
  return normalized === "busy" || normalized === "band" ? "busy" : "empty";
};

// Reusable Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Add Place Modal Component
const AddPlaceModal = ({ isOpen, onClose, onConfirm }) => {
  const [placeName, setPlaceName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!placeName.trim()) {
      alert("Илтимос, жой номини киритинг.");
      return;
    }
    onConfirm(placeName.trim());
    setPlaceName("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Янги жой қўшиш">
      <form onSubmit={handleSubmit} className="add-place-form">
        <div className="form-group">
          <label htmlFor="placeName">Жой номи:</label>
          <input
            type="text"
            id="placeName"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Масалан: Зал 1"
            required
          />
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Бекор қилиш
          </button>
          <button type="submit" className="submit-btn">
            Қўшиш
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Add Table Modal Component
const AddTableModal = ({ isOpen, onClose, onConfirm, editingTable, places }) => {
  const [selectedPlace, setSelectedPlace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [spaceCount, setSpaceCount] = useState(0);

  useEffect(() => {
    if (editingTable) {
      setSelectedPlace(editingTable.name || "");
      const parts = editingTable.number.split("-");
      setPrefix(parts[0] || "");
      setSuffix(parts[1] || "");
    } else {
      setSelectedPlace("");
      setPrefix("");
      setSuffix("");
    }
  }, [editingTable]);

  const handlePlaceChange = (e) => {
    const value = e.target.value;
    setSelectedPlace(value);
    const index = places.indexOf(value);
    setSpaceCount(index >= 0 ? index + 1 : 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlace || !prefix.trim() || !suffix.trim()) {
      alert("Илтимос, барча майдонларни тўлдиринг.");
      return;
    }

    setLoading(true);
    try {
      const tableNumber = `${prefix.trim()}${" ".repeat(spaceCount)}${suffix.trim()}`;
      await onConfirm({
        name: selectedPlace,
        number: tableNumber,
        status: editingTable ? editingTable.status : "empty",
      });
      setSelectedPlace("");
      setPrefix("");
      setSuffix("");
      onClose();
    } catch (err) {
      alert(`Хатолик: ${err.response?.data?.message || "Столни сақлашда хатолик юз берди."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTable ? "Столни таҳрирлаш" : "Янги стол қўшиш"}
    >
      <form onSubmit={handleSubmit} className="add-table-form">
        <div className="form-group">
          <label htmlFor="placeSelect">Жой номи:</label>
          <select
            id="placeSelect"
            value={selectedPlace}
            onChange={handlePlaceChange}
            required
          >
            <option value="">Жойни танланг</option>
            {places.map((place, index) => (
              <option key={index} value={place}>
                {place} ({index + 1} пробел)
              </option>
            ))}
          </select>
        </div>
        <div className="form-group number-inputs">
          <div>
            <label htmlFor="prefix">Стол префикси:</label>
            <input
              type="text"
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Масалан: A"
              disabled={!selectedPlace}
              required
            />
          </div>
          <span className="spacer">{" ".repeat(spaceCount) || "-"}</span>
          <div>
            <label htmlFor="suffix">Стол суффикси:</label>
            <input
              type="number"
              id="suffix"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="Масалан: 001"
              disabled={!selectedPlace}
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Бекор қилиш
          </button>
          <button type="submit" disabled={loading || !selectedPlace} className="submit-btn">
            {loading
              ? editingTable
                ? "Сақланмоқда..."
                : "Қўшилмоқда..."
              : editingTable
              ? "Сақлаш"
              : "Қўшиш"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, tableName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Столни ўчириш">
      <div className="delete-confirm-content">
        <p>
          Сиз ҳақиқатан ҳам <strong>"{tableName}"</strong> столини ўчиришни
          хоҳлайсизми?
        </p>
        <p className="warning-text">Бу амални бекор қилиб бўлмайди!</p>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onClose} className="cancel-btn">
          Бекор қилиш
        </button>
        <button onClick={onConfirm} className="delete-btn">
          Ўчириш
        </button>
      </div>
    </Modal>
  );
};

export default function Taomlar() {
  const [taomlar, setTaomlar] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedTableOrder, setSelectedTableOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [categories, setCategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [filterPlace, setFilterPlace] = useState("Barchasi");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      alert("Илтимос, тизимга киринг.");
      window.location.href = "/login";
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchTables = async () => {
      try {
        const res = await axios.get("https://alikafecrm.uz/tables", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const tablesData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const normalizedTables = tablesData.map((table) => ({
          ...table,
          status: normalizeStatus(table.status),
        }));
        setTables(normalizedTables);
        const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(Boolean);
        setPlaces(uniquePlaces);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(`Столларни юклашда хатолик: ${err.response?.data?.message || err.message}`);
        setTables([]);
      }
    };

    const fetchTaomlar = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://alikafecrm.uz/product", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const products = Array.isArray(res.data) ? res.data : [];
        setTaomlar(products);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(`Таомларни олишда хатолик: ${err.response?.data?.message || err.message}`);
        setTaomlar([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await axios.get("https://alikafecrm.uz/category", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const categoriesData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setCategories(categoriesData);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(`Категорияларни юклашда хатолик: ${err.response?.data?.message || err.message}`);
      }
    };

    fetchTables();
    fetchTaomlar();
    fetchCategories();

    return () => controller.abort();
  }, [token]);

  const handleAddPlace = (placeName) => {
    setPlaces((prev) => [...prev, placeName]);
  };

  const handleAddTable = async (tableData) => {
    try {
      const isEditing = !!editingTable;
      const url = isEditing
        ? `https://alikafecrm.uz/tables/${editingTable.id}`
        : "https://alikafecrm.uz/tables";
      const method = isEditing ? axios.patch : axios.post;

      await method(url, tableData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMsg(
        isEditing
          ? "Стол муваффақиятли янгиланди!"
          : "Стол муваффақиятли қўшилди!"
      );

      const res = await axios.get("https://alikafecrm.uz/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tablesData = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      const normalizedTables = tablesData.map((table) => ({
        ...table,
        status: normalizeStatus(table.status),
      }));
      setTables(normalizedTables);
      const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(Boolean);
      setPlaces(uniquePlaces);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        (editingTable
          ? "Столни янгилашда хатолик юз берди."
          : "Стол қўшишда хатолик юз берди.");
      setError(`Хатолик: ${errorMessage}`);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTable) return;

    try {
      await axios.delete(`https://alikafecrm.uz/tables/${deletingTable.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMsg("Стол муваффақиятли ўчирилди!");

      const res = await axios.get("https://alikafecrm.uz/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tablesData = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      const normalizedTables = tablesData.map((table) => ({
        ...table,
        status: normalizeStatus(table.status),
      }));
      setTables(normalizedTables);
      const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(Boolean);
      setPlaces(uniquePlaces);

      if (selectedTableId === deletingTable.id) {
        setSelectedTableId(null);
        setSelectedTableOrder(null);
        setCart([]);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Столни ўчиришда хатолик юз берди.";
      setError(`Хатолик: ${errorMessage}`);
    } finally {
      setShowDeleteModal(false);
      setDeletingTable(null);
    }
  };

  const handleEditTable = (table, e) => {
    e.stopPropagation();
    setEditingTable(table);
    setShowAddTableModal(true);
  };

  const handleDeleteTableClick = (table, e) => {
    e.stopPropagation();
    setDeletingTable(table);
    setShowDeleteModal(true);
  };

  const resetTableStatus = async (tableId) => {
    try {
      await axios.patch(
        `https://alikafecrm.uz/tables/${tableId}`,
        { status: "empty" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, status: "empty" } : table
        )
      );
      setSuccessMsg("Стол статуси автоматик равишда бўшга ўзгартирилди!");
    } catch (err) {
      console.error("Стол статусини ўзгартиришда хатолик:", err);
    }
  };

  useEffect(() => {
    if (!selectedTableId) {
      setSelectedTableOrder(null);
      setCart([]);
      setError(null);
      return;
    }

    const selectedTable = tables.find((t) => t?.id === selectedTableId);
    if (!selectedTable) {
      setSelectedTableOrder(null);
      setCart([]);
      setError("Стол топилмади.");
      return;
    }

    if (selectedTable.status === "busy" && selectedTable.orders?.length > 0) {
      const activeOrders = selectedTable.orders.filter(
        (order) => order.status !== "ARCHIVE"
      );
      if (activeOrders.length > 0) {
        const latestOrder = activeOrders.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        setSelectedTableOrder(latestOrder);
        setError(null);
        setCart(
          latestOrder.orderItems?.map((item) => ({
            id: item.productId || item.product?.id || 0,
            name: item.product?.name || "Noma'lum taom",
            price: parseFloat(item.product?.price) || 0,
            count: item.count || 0,
            status: item.status || "PENDING",
          })) || []
        );
      } else {
        setSelectedTableOrder(null);
        setCart([]);
        setError("Актив буюртма топилмади. Стол бўшатилмоқда...");
        resetTableStatus(selectedTableId);
      }
    } else {
      setSelectedTableOrder(null);
      setCart([]);
      setError(null);
    }
  }, [selectedTableId, tables, token]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const addToCart = (taom) => {
    setCart((prev) => {
      const foundTaom = prev.find((item) => item.id === taom.id);
      if (foundTaom) {
        return prev.map((item) =>
          item.id === taom.id ? { ...item, count: item.count + 1 } : item
        );
      }
      return [...prev, { ...taom, count: 1, status: "PENDING" }];
    });
  };

  const removeFromCart = (taom) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === taom.id ? { ...item, count: item.count - 1 } : item
        )
        .filter((item) => item.count > 0)
    );
  };

  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const userId = currentUser.id;

  const formatPrice = (price) => {
    const priceStr = (price || 0).toString();
    return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм";
  };

  const statusMapToFrontend = { empty: "Бўш", busy: "Банд", unknown: "Номаълум" };
  const dishStatusMap = {
    PENDING: "Кутилмоқда",
    COOKING: "Пишмоқда",
    READY: "Тайёр",
    COMPLETED: "Тугалланган",
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.price || 0) * item.count,
    0
  );

  const handleOrderConfirm = async (orderData) => {
    const products = orderData.orderItems
      .filter((item) => item?.productId && item.count > 0)
      .map((item) => ({
        productId: Number(item.productId),
        count: Number(item.count),
      }));

    if (!products.length) {
      alert("Буюртмада камида битта маҳсулот бўлиши керак.");
      return;
    }

    const tableId = orderData.isTableOrder ? Number(orderData.tableId) : null;
    const carrierNumber = !orderData.isTableOrder
      ? orderData.carrierNumber?.trim()
      : null;

    const totalPrice = orderData.orderItems.reduce((acc, item) => {
      const price = item?.product?.price ? Number(item.product.price) : 0;
      return acc + price * item.count;
    }, 0);

    if (!userId) {
      alert("Фойдаланувчи ID топилмади. Илтимос, қайта киринг.");
      return;
    }

    const body = {
      products,
      tableId,
      totalPrice: Number(totalPrice),
      userId: Number(userId),
      carrierNumber,
    };

    if (orderData.isTableOrder && !tableId) {
      alert("Илтимос, стол танланг.");
      return;
    }

    if (!orderData.isTableOrder && !carrierNumber) {
      alert("Илтимос, телефон рақамини киритинг.");
      return;
    }

    try {
      const isEditing = selectedTableOrder && tableId && tables.find((t) => t?.id === tableId)?.status === "busy";
      const url = isEditing
        ? `https://alikafecrm.uz/order/${selectedTableOrder.id}`
        : "https://alikafecrm.uz/order";
      const method = isEditing ? axios.patch : axios.post;

      await method(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCart([]);
      setSelectedTableId(null);
      setSelectedTableOrder(null);
      setError(null);
      setSuccessMsg("Буюртма муваффақиятли юборилди!");

      if (orderData.isTableOrder && tableId && !isEditing) {
        await axios.patch(
          `https://alikafecrm.uz/tables/${tableId}`,
          { status: "busy" },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setTables((prev) =>
          prev.map((table) =>
            table.id === tableId ? { ...table, status: "busy" } : table
          )
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        (isEditing
          ? "Буюртма янгиланмади."
          : "Буюртма юборишда хатолик юз берди.");
      setError(`Хатолик: ${errorMessage}`);
    } finally {
      setShowModal(false);
    }
  };

  const transformedOrder = selectedTableOrder
    ? {
        id: selectedTableOrder.id || "N/A",
        tableNumber: tables.find((t) => t?.id === selectedTableId)?.number || "N/A",
        createdAt: selectedTableOrder.createdAt || Date.now(),
        orderItems: selectedTableOrder.orderItems?.map((item) => ({
          product: {
            name: item.product?.name || "Noma'lum taom",
            price: parseFloat(item.product?.price) || 0,
          },
          count: item.count || 0,
        })) || [],
        totalWithCommission: selectedTableOrder.totalPrice || totalPrice,
      }
    : null;

  const selectedTable = tables.find((t) => t?.id === selectedTableId);
  const isBusyTable = selectedTable?.status === "busy";

  const filteredTaomlar = selectedCategory === "Barchasi"
    ? taomlar
    : taomlar.filter(
        (taom) =>
          taom.categoryId &&
          taom.categoryId === categories.find((cat) => cat.name === selectedCategory)?.id
      );

  const filteredTables = filterPlace === "Barchasi"
    ? tables
    : tables.filter((table) => table.name === filterPlace);

  return (
    <section className="content-section">
      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="table-controls">
        <div className="place-filter">
          <label htmlFor="placeFilter">Жой фильтри:</label>
          <select
            id="placeFilter"
            value={filterPlace}
            onChange={(e) => setFilterPlace(e.target.value)}
          >
            <option value="Barchasi">Барчаси</option>
            {places.map((place, index) => (
              <option key={index} value={place}>
                {place}
              </option>
            ))}
          </select>
        </div>
        <div className="table-actions">
          <button
            className="add-table-btn"
            onClick={() => setShowAddTableModal(true)}
            title="Янги стол қўшиш"
          >
            <Plus size={20} />
            Стол қўшиш
          </button>
          <button
            className="add-place-btn"
            onClick={() => setShowAddPlaceModal(true)}
            title="Янги жой қўшиш"
          >
            <Plus size={20} />
            Жой қўшиш
          </button>
        </div>
      </div>

      <div className="order-layout">
        <div className="tables-column">
          <h3>Столлар</h3>
          <ul className="tables-list">
            {filteredTables.length === 0 ? (
              <p>Столлар йўқ</p>
            ) : (
              filteredTables.map((table) => (
                <li
                  key={table.id}
                  className={`table-item ${
                    selectedTableId === table.id ? "selected" : ""
                  } ${table.status === "busy" ? "band" : "bosh"}`}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <div className="table-info">
                    <span>{table.name}</span>
                    <span>{table.number}</span>
                    <span className="table-status">
                      {statusMapToFrontend[table.status] || statusMapToFrontend.unknown}
                    </span>
                  </div>
                  <div className="table-actions">
                    <button
                      className="action-btn edit-btn"
                      style={{ background: "none" }}
                      onClick={(e) => handleEditTable(table, e)}
                      title="Столни таҳрирлаш"
                    >
                      <Edit size={16} color="#007bff" />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      style={{ background: "none", padding: "8px" }}
                      onClick={(e) => handleDeleteTableClick(table, e)}
                      title="Столни ўчириш"
                    >
                      <Trash2 size={16} color="#ff0000" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="cart-column">
          <h3>Буюртма савати</h3>
          {selectedTableId ? (
            <>
              <p className="selected-table">
                Танланган стол:{" "}
                {tables.find((t) => t?.id === selectedTableId)?.name || "Noma'lum"} -{" "}
                {tables.find((t) => t?.id === selectedTableId)?.number || "N/A"}
              </p>
              {tables.find((t) => t?.id === selectedTableId)?.status === "empty" ? (
                <p>Янги буюртма беринг</p>
              ) : selectedTableOrder ? (
                <div className="order-details">
                  <h4>Буюртма маълумотлари</h4>
                  <p>
                    <strong>Банд қилинган вақт:</strong>{" "}
                    {selectedTableOrder.createdAt
                      ? new Date(selectedTableOrder.createdAt).toLocaleString("uz-UZ", {
                          timeZone: "Asia/Tashkent",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Маълумот йўқ"}
                  </p>
                  <h5>Буюртма қилинган таомлар:</h5>
                </div>
              ) : (
                <p>{error || "Буюртма маълумотлари юкланмоқда..."}</p>
              )}
            </>
          ) : (
            <p>Илтимос, стол танланг.</p>
          )}
          {(cart.length > 0 || selectedTableOrder) && (
            <>
              <table className="basket-table">
                <thead>
                  <tr>
                    <th>Номи</th>
                    <th>Миқдор</th>
                    <th>Нархи</th>
                    <th>Суммаси</th>
                    <th>Ҳолати</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPrice(item.price * item.count)}</td>
                        <td>{dishStatusMap[item.status] || item.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">Саватда таомлар йўқ</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="basket-table__total-label">
                      Жами:
                    </td>
                    <td className="basket-table__total">{formatPrice(totalPrice)}</td>
                  </tr>
                  
                </tfoot>
              </table>
              {!isBusyTable && (
                <button
                  className="confirm-order-btn"
                  disabled={cart.length === 0}
                  onClick={() => setShowModal(true)}
                >
                  Буюртмани расмийлаштириш
                </button>
              )}
            </>
          )}
        </div>

        {!isBusyTable && (
          <div className="products-column">
            <div className="category-buttons">
              <button
                className={`category-btn ${selectedCategory === "Barchasi" ? "active" : ""}`}
                onClick={() => setSelectedCategory("Barchasi")}
              >
                Barchasi
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.name ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <h3>Таомлар</h3>
            {loading ? (
              <div className="spinner">Юкланмоқда...</div>
            ) : filteredTaomlar.length === 0 ? (
              <p>Таомлар топилмади</p>
            ) : (
              <ul className="products-list">
                {filteredTaomlar.map((taom) => (
                  <li key={taom.id} className="product-item">
                    <div onClick={() => addToCart(taom)} className="product-info">
                      <span className="product-name">{taom.name || "Noma'lum taom"}</span>
                      <span className="product-price">({formatPrice(taom.price)})</span>
                    </div>
                    <div className="menu-card__controls">
                      <button
                        className="control-btn"
                        onClick={() => removeFromCart(taom)}
                      >
                        -
                      </button>
                      <span className="control-value">
                        {Math.max(
                          cart.find((item) => item.id === taom.id)?.count || 0,
                          0
                        )}
                      </span>
                      <button
                        className="control-btn"
                        onClick={() => addToCart(taom)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <ModalBasket
          cart={cart}
          tables={tables}
          userId={userId}
          onClose={() => setShowModal(false)}
          onConfirm={handleOrderConfirm}
          selectedTableId={selectedTableId}
          isEditing={!!selectedTableOrder}
        />
      )}

      {showAddTableModal && (
        <AddTableModal
          isOpen={showAddTableModal}
          onClose={() => {
            setShowAddTableModal(false);
            setEditingTable(null);
          }}
          onConfirm={handleAddTable}
          editingTable={editingTable}
          places={places}
        />
      )}

      {showAddPlaceModal && (
        <AddPlaceModal
          isOpen={showAddPlaceModal}
          onClose={() => setShowAddPlaceModal(false)}
          onConfirm={handleAddPlace}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingTable(null);
          }}
          onConfirm={handleDeleteTable}
          tableName={deletingTable ? `${deletingTable.number}` : ""}
        />
      )}
    </section>
  );
}