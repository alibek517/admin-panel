import React, { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import "./styles/taomlar.css";
import axios from "axios";
import {
  Clock, ShoppingCart, X, Plus, Trash, Pencil, Printer, ArrowLeftRight, Lock, RefreshCw
} from "lucide-react";
import ModalBasket from "../components/modal/modal-basket";
import Receipt from "../components/Receipt.jsx";

const handleApiError = (error, defaultMessage) => {
  const statusMessages = {
    401: "Авторизация хатоси. Илтимос, қайта киринг.",
    403: "Рухсат йўқ. Администратор билан боғланинг.",
    404: "Маълумот топилмади.",
    422: "Нотўғри маълумот юборилди.",
    500: "Сервер хатоси. Кейинроқ уриниб кўринг.",
  };
  return (
    error.response?.data?.message ||
    statusMessages[error.response?.status] ||
    defaultMessage
  );
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

const API_BASE = "https://alikafecrm.uz";
const API_ENDPOINTS = {
  orders: `${API_BASE}/order`,
  categories: `${API_BASE}/category`,
  products: `${API_BASE}/product`,
  tables: `${API_BASE}/tables`,
  percent: `${API_BASE}/percent/1`,
};

const STATUS_LABELS = {
  PENDING: "Янги",
  COOKING: "Тайёрланмоқда",
  READY: "Тайёр",
  COMPLETED: "Мижоз олдида",
  ARCHIVE: "Архиви буюртма",
};

const normalizeStatus = (status) => {
  if (!status) return "empty";
  const normalized = status.toLowerCase().trim();
  return normalized === "busy" || normalized === "band" ? "busy" : "empty";
};

// Modified checkFinishedProducts to return the list of finished products
const checkFinishedProducts = (products, taomlar) => {
  return products.filter((item) => {
    const product = taomlar.find((p) => p.id === item.productId);
    return !product || product.isFinished;
  });
};

const FinishedProductsModal = ({ isOpen, onClose, finishedProducts, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Quyidagi taomlar tugagan yoki topilmadi:</h3>
        <ul  style={{listStyle:'none'}}>
          {finishedProducts.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
        <button style={{backgroundColor:'orange'}} onClick={onConfirm}>OK</button>
      </div>
    </div>
  );
};

// Existing Modal component (unchanged)
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

// AddPlaceModal component (unchanged)
const AddPlaceModal = ({ isOpen, onClose, onConfirm }) => {
  const [placeName, setPlaceName] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!placeName.trim()) {
      alert("Жой номини киритинг.");
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

// AddTableModal component (unchanged)
const AddTableModal = ({ isOpen, onClose, onConfirm, places }) => {
  const [selectedPlace, setSelectedPlace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [spaceCount, setSpaceCount] = useState(0);

  const handlePlaceChange = (e) => {
    const value = e.target.value;
    setSelectedPlace(value);
    const index = places.indexOf(value);
    setSpaceCount(index >= 0 ? index + 1 : 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlace || !prefix.trim() || !suffix.trim()) {
      alert("Барча майдонларни тўлдиринг.");
      return;
    }
    setLoading(true);
    try {
      const tableNumber = `${prefix.trim()}${" ".repeat(spaceCount)}${suffix.trim()}`;
      await onConfirm({ name: selectedPlace, number: tableNumber, status: "empty" });
      setSelectedPlace("");
      setPrefix("");
      setSuffix("");
      onClose();
    } catch (err) {
      alert(`Хатолик: ${err.response?.data?.message || "Стол қўшишда хатолик."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Янги стол қўшиш">
      <form onSubmit={handleSubmit} className="add-table-form">
        <div className="form-group">
          <label htmlFor="placeSelect">Жой номи:</label>
          <select id="placeSelect" value={selectedPlace} onChange={handlePlaceChange} required>
            <option value="">Жойни танланг</option>
            {places.map((place, index) => (
              <option key={index} value={place}>
                {place}
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
            <label htmlFor="suffix">Стол номери:</label>
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
          <button
            type="submit"
            disabled={loading || !selectedPlace}
            className="submit-btn"
          >
            {loading ? "Қўшилмоқда..." : "Қўшиш"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// EditOrderModal component (unchanged)
const EditOrderModal = ({
  isOpen,
  onClose,
  order,
  products,
  isSaving,
  token,
  setTables,
  tables,
  setSelectedTableOrder,
  setCart,
  setSuccessMsg,
  setError,
  commissionPercent,
  categories,
}) => {
  const [newItem, setNewItem] = useState({ categoryId: "", productId: "", count: 1, description: "" });
  const [editingOrder, setEditingOrder] = useState(order);
  const [localError, setLocalError] = useState("");
  const [localIsSaving, setLocalIsSaving] = useState(isSaving);
  const [orderDescriptions, setOrderDescriptions] = useState({});

  useEffect(() => {
    const initialDescriptions = editingOrder?.orderItems?.reduce((acc, item) => ({
      ...acc,
      [item.id]: item.description || "",
    }), {}) || {};
    setOrderDescriptions(initialDescriptions);
  }, [editingOrder]);

  useEffect(() => {
    if (localIsSaving) {
      const timer = setTimeout(() => {
        setLocalIsSaving(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [localIsSaving]);

  const formatPrice = (price) =>
    price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм" : "0 сўм";

  const calculateTotalPrice = (orderItems) =>
    orderItems?.reduce((sum, item) => sum + parseFloat(item.product?.price || 0) * (item.count || 0), 0) || 0;

  const handleRemoveItem = async (itemId) => {
    if (localIsSaving || !itemId) return;

    const itemToDelete = editingOrder?.orderItems?.find((item) => item.id === itemId);
    if (itemToDelete && itemToDelete.status === "READY") {
      setLocalError("Тайёр таомларни ўчириб бўлмайди.");
      return;
    }

    try {
      setLocalIsSaving(true);
      setLocalError("");

      await axios.delete(`${API_ENDPOINTS.orders}/orderItem/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await axios.get(`${API_ENDPOINTS.orders}/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedOrder = response.data || {};
      const totalPrice = calculateTotalPrice(updatedOrder.orderItems);

      setTables((prev) =>
        prev.map((table) =>
          table.id === updatedOrder.tableId
            ? {
                ...table,
                status: updatedOrder.orderItems?.length ? "busy" : "empty",
                orders: updatedOrder.orderItems?.length ? [{ ...updatedOrder, table }] : [],
              }
            : table
        )
      );
      setEditingOrder({ ...updatedOrder, totalPrice });
      setSelectedTableOrder({ ...updatedOrder, totalPrice });
      setCart(
        updatedOrder.orderItems?.map((item) => ({
          id: item.productId || item.product?.id || 0,
          name: item.product?.name || "Номаълум таом",
          price: parseFloat(item.product?.price) || 0,
          count: item.count || 0,
          status: item.status || "PENDING",
          description: item.description || "",
        })) || []
      );
      setSuccessMsg("Таом муваффақиятли ўчирилди!");
      setOrderDescriptions((prev) => {
        const newDescriptions = { ...prev };
        delete newDescriptions[itemId];
        return newDescriptions;
      });
    } catch (error) {
      const message = handleApiError(error, "Таом ўчиришда хатолик.");
      setLocalError(message);
      setLocalIsSaving(false);
      setError(message);
    }
  };

  const handleAddItem = async () => {
    if (localIsSaving || !editingOrder) return;

    const { categoryId, productId, count, description } = newItem;
    if (!categoryId) {
      setLocalError("Илтимос, аввал категория танланг.");
      return;
    }
    if (!productId || count <= 0) {
      setLocalError("Илтимос, таом танланг ва сонини тўғри киритинг.");
      return;
    }
    const product = products.find((p) => p.id === parseInt(productId));
    if (!product) {
      setLocalError("Танланган таом топилмади.");
      return;
    }
    if (product.isFinished) {
      setLocalError("Бу таом тугаган, қўшиш мумкин эмас.");
      return;
    }

    try {
      setLocalIsSaving(true);
      setLocalError("");

      const productsRes = await axios.get(API_ENDPOINTS.products, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
      const updatedProduct = updatedProducts.find((p) => p.id === parseInt(productId));
      if (!updatedProduct) {
        setLocalError("Таом маълумотлари топилмади.");
        return;
      }
      if (updatedProduct.isFinished) {
        setLocalError("Бу таом тугаган, қўшиш мумкин эмас.");
        return;
      }

      const payload = {
        products: [{ productId: Number(productId), count: Number(count), description: description || "" }],
        tableId: editingOrder.tableId,
        userId: editingOrder.userId,
        status: editingOrder.status,
      };
      const response = await axios.put(
        `${API_ENDPOINTS.orders}/${editingOrder.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedOrder = response.data || {};
      const totalPrice = calculateTotalPrice(updatedOrder.orderItems);

      setTables((prev) =>
        prev.map((table) =>
          table.id === updatedOrder.tableId
            ? { ...table, status: "busy", orders: [{ ...updatedOrder, table }] }
            : table
        )
      );
      setEditingOrder({ ...updatedOrder, totalPrice });
      setSelectedTableOrder({ ...updatedOrder, totalPrice });
      setCart(
        updatedOrder.orderItems?.map((item) => ({
          id: item.productId || item.product?.id || 0,
          name: item.product?.name || "Номаълум таом",
          price: parseFloat(item.product?.price) || 0,
          count: item.count || 0,
          status: item.status || "PENDING",
          description: item.description || "",
        })) || []
      );
      setNewItem({ categoryId: "", productId: "", count: 1, description: "" });
      setSuccessMsg("Таом муваффақиятли қўшилди!");
      setOrderDescriptions((prev) => ({
        ...prev,
        ...updatedOrder.orderItems.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.description || "",
        }), {}),
      }));
    } catch (error) {
      const message = handleApiError(error, "Таом қўшишда хатолик.");
      setLocalError(message);
      setLocalIsSaving(false);
      setError(message);
    }
  };

  const filteredProducts = newItem.categoryId
    ? products.filter((product) => product.categoryId === parseInt(newItem.categoryId))
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal1" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Буюртма №{order?.id || "N/A"} ни таҳрирлаш</h2>
          <button className="modal__close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal__content">
          {localError && <p className="error-message">{localError}</p>}
          {localIsSaving && <p className="saving-message">Сақланмоқда...</p>}
          <div className="modal__items">
            <h3>Жорий таомлар:</h3>
            {editingOrder?.orderItems?.length ? (
              <div className="modal__items-list">
                {editingOrder.orderItems.map((item) => (
                  <div className="modal__item" key={item.id || item.productId || Math.random()}>
                    <img
                      src={`${API_BASE}${item.product?.image || "/placeholder-food.jpg"}`}
                      alt={item.product?.name || "Номаълум"}
                      className="modal__item-img"
                      onError={(e) => {
                        e.target.src = "/placeholder-food.jpg";
                      }}
                    />
                    <div className="modal__item-info">
                      <span className="modal__item-name">{item.product?.name || "Номаълум таом"}</span>
                      <span className="modal__item-details">
                        Сони: {item.count || 0} | {formatPrice(item.product?.price || 0)}
                      </span>
                      <span>{orderDescriptions[item.id] || " "}</span>
                    </div>
                    <button
                      className="modal__item-remove"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={localIsSaving || item.status === "READY"}
                    >
                      Ўчириш
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="modal__empty">Таомлар йўқ.</p>
            )}
          </div>
          <div className="modal__add-section">
            <h3 className="modal__add-title">Янги таом қўшиш:</h3>
            <div className="modal__add-form">
              <select
                className="modal__select"
                value={newItem.categoryId}
                onChange={(e) =>
                  setNewItem({ ...newItem, categoryId: e.target.value, productId: "", description: "" })
                }
                style={{ color: "#000" }}
                disabled={localIsSaving}
              >
                <option value="">Категория танланг</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="modal__select"
                value={newItem.productId}
                onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                style={{ color: "#000" }}
                disabled={localIsSaving || !newItem.categoryId}
              >
                <option value="">Таом танланг</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id} disabled={product.isFinished}>
                    {product.name} ({formatPrice(product.price)}) {product.isFinished ? "(Тугаган)" : ""}
                  </option>
                ))}
              </select>
              <input
                className="modal__input"
                type="number"
                min="1"
                value={newItem.count}
                onChange={(e) =>
                  setNewItem({ ...newItem, count: parseInt(e.target.value) || 1 })
                }
                placeholder="Сони"
                style={{ color: "#000" }}
                disabled={localIsSaving}
              />
              <textarea
                value={newItem.description || ""}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Ta'rif kiriting (masalan, qadoqlash turi, maxsus so'rovlar)"
                className="modal__input"
                style={{
                  width: "100%",
                  minHeight: "60px",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
                aria-label="Ta'rif uchun yangi taom"
                disabled={localIsSaving}
              />
              <button
                style={{
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  cursor: localIsSaving ? "not-allowed" : "pointer",
                  backgroundColor: localIsSaving ? "#6c757d" : "#007bff",
                }}
                className="modal__add-btn"
                onClick={handleAddItem}
                disabled={localIsSaving}
              >
                Қўшиш
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChangeTableModal component (unchanged)
const ChangeTableModal = ({ isOpen, onClose, onConfirm, tables, selectedOrderId, isSaving }) => {
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("");
  const uniquePlaces = [...new Set(tables.map((table) => table.name))].filter(Boolean);

  const availableTables = selectedPlace
    ? tables.filter((table) => table.status === "empty" && table.name === selectedPlace)
    : tables.filter((table) => table.status === "empty");

  useEffect(() => {
    if (uniquePlaces.length > 0 && !selectedPlace) {
      setSelectedPlace(uniquePlaces[0]);
    }
  }, [uniquePlaces, selectedPlace]);

  const handleConfirm = () => {
    if (selectedTableId) {
      onConfirm(selectedTableId);
    } else {
      alert("Илтимос, стол танланг.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Буюртма №${selectedOrderId || "N/A"} учун столни ўзгартириш`}
    >
      <div className="modal-content">
        {isSaving && <p className="saving-message">Сақланмоқда...</p>}
        <div className="modal__add-section">
          <h3 className="modal__add-title">Жой фильтри:</h3>
          <div className="place-filter-buttons">
            {uniquePlaces.length ? (
              uniquePlaces.map((place, index) => (
                <button
                  key={index}
                  className={`place-filter-btn ${selectedPlace === place ? "active" : ""}`}
                  onClick={() => setSelectedPlace(place)}
                >
                  {place}
                </button>
              ))
            ) : (
              <p>Жойлар топилмади</p>
            )}
          </div>
          <h3 className="modal__add-title">Бўш столлар:</h3>
          {availableTables.length ? (
            <select
              className="modal__select"
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(parseInt(e.target.value))}
              disabled={isSaving}
            >
              <option value="">Стол танланг</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} - {table.number}
                </option>
              ))}
            </select>
          ) : (
            <p className="modal__empty">Бўш столлар йўқ.</p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Бекор қилиш
          </button>
          <button
            onClick={handleConfirm}
            className="submit-btn"
            disabled={isSaving || !selectedTableId}
          >
            Сақлаш
          </button>
        </div>
      </div>
    </Modal>
  );
};

// DeleteConfirmModal component (unchanged)
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, orderId }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Буюртмани ўчириш">
      <div className="delete-confirm-content">
        <p>
          Сиз ҳақиқатан ҳам <strong>№{orderId || "N/A"}</strong> буюртмани ўчиришни хоҳлайсизми?
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

// DeleteTableModal component (unchanged)
const DeleteTableModal = ({ isOpen, onClose, onConfirm, table }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Столни ўчириш">
      <div className="delete-confirm-content">
        <p>
          Сиз ҳақиқатан ҳам <strong>{table?.name || "Номаълум"} - {table?.number || "N/A"}</strong> столни ўчиришни хоҳлайсизми?
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

const ResetFinishedProductsModal = ({ isOpen, onClose, onConfirm, setCart }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Тугаган таомларни тиклаш">
      <div className="delete-confirm-content">
        <p>Сиз ҳақиқатан ҳам барча тугаган таомларни қайта тиклашни хоҳлайсизми?</p>
        <p className="warning-text">Бу амал барча таомларни мавжуд қилиб белгилайди ва саватни тозалайди!</p>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onClose} className="cancel-btn">
          Бекор қилиш
        </button>
        <button
          onClick={() => {
            onConfirm();
            setCart([]);
          }}
          className="submit-btn"
        >
          Тиклаш ва Тозалаш
        </button>
      </div>
    </Modal>
  );
};

// Main Taomlar component with updates
const Taomlar = React.memo(() => {
  const [taomlar, setTaomlar] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeTableModal, setShowChangeTableModal] = useState(false);
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [showResetProductsModal, setShowResetProductsModal] = useState(false);
  const [showFinishedProductsModal, setShowFinishedProductsModal] = useState(false); 
  const [finishedProducts, setFinishedProducts] = useState([]); // New state for finished products
  const [tableToDelete, setTableToDelete] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedTableOrder, setSelectedTableOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [filterPlace, setFilterPlace] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [uslug, setUslug] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const receiptRef = useRef();
  const token = localStorage.getItem("token");

  useEffect(() => {
    console.log("taomlar updated:", taomlar, new Date().toISOString());
  }, [taomlar]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  const formatPrice = useCallback((price) => {
    return price
      ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм"
      : "0 сўм";
  }, []);

  const calculateTotalPrice = useCallback((orderItems) => {
    return orderItems?.reduce(
      (sum, item) =>
        sum + parseFloat(item.product?.price || item.price || 0) * (item.count || 0),
      0
    ) || 0;
  }, []);

  const handleUslugChange = useCallback(
    async (e) => {
      const value = e.target.value;
      setUslug(value);
      if (value.trim() === "") return;

      try {
        await axios.put(
          API_ENDPOINTS.percent,
          { percent: parseFloat(value) || commissionPercent },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCommissionPercent(parseFloat(value) || commissionPercent);
        setSuccessMsg("Хизмат нархи муваффақиятли ўзгартирилди!");
      } catch (error) {
        console.error("Uslug update error:", error);
        setError(handleApiError(error, "Хизмат нархини ўзгартиришда хатолик."));
      }
    },
    [token, commissionPercent]
  );

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    onError: (error) => {
      console.error("Print error:", error);
      setError("Чоп этишда хатолик: Принтерни текширинг.");
    },
  });

  const handlePrintOnly = useCallback(
    async (order) => {
      if (!order?.id) {
        setError("Буюртма маълумотлари топилмади.");
        return;
      }
      try {
        await axios.put(
          `${API_ENDPOINTS.orders}/${order.id}`,
          { uslug: parseFloat(uslug) || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedTableOrder({
          ...order,
          uslug: parseFloat(uslug) || null,
          commissionPercent: parseFloat(uslug) || commissionPercent,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!receiptRef.current) {
          console.log("Чоп этиш учун маълумотлар тайёр эмас.");
          return;
        }
        handlePrint();
      } catch (error) {
        console.error("Print error:", error);
        setError(handleApiError(error, "Чоп этишда хатолик."));
      }
    },
    [handlePrint, uslug, commissionPercent, token]
  );

  const handlePrintAndPay = useCallback(
    async (order) => {
      if (!order?.id) {
        setError("Буюртма маълумотлари топилмади.");
        return;
      }
      try {
        setIsSaving(true);
        const commissionToSend = parseFloat(uslug) || commissionPercent;
        await axios.put(
          `${API_ENDPOINTS.orders}/${order.id}`,
          { status: "ARCHIVE", uslug: commissionToSend },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (order.tableId) {
          await axios.patch(
            `${API_ENDPOINTS.tables}/${order.tableId}`,
            { status: "empty" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setTables((prev) =>
            prev.map((table) =>
              table.id === order.tableId ? { ...table, status: "empty", orders: [] } : table
            )
          );
        }
        setSelectedTableOrder({
          ...order,
          uslug: commissionToSend,
          commissionPercent: commissionToSend,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!receiptRef.current) {
          console.log("Чоп этиш учун маълумотлар тайёр эмас.");
          return;
        }
        handlePrint();
        setCart([]);
        setSelectedTableId(null);
        setSelectedTableOrder(null);
        setUslug(commissionPercent.toString());
        setSuccessMsg("Буюртма архиви буюртма қилинди ва чоп этди!");
      } catch (error) {
        console.error("Print and pay error:", error);
        setError(handleApiError(error, "Чоп этиш ва тўлашда хатолик."));
      } finally {
        setIsSaving(false);
      }
    },
    [token, handlePrint, uslug, commissionPercent]
  );

  const handleDeleteOrder = useCallback(async () => {
    if (!selectedTableOrder?.id) {
      setError("Буюртма танланмаган.");
      console.error("No order selected for deletion");
      return;
    }

    const hasReadyItems = selectedTableOrder.orderItems?.some(
      (item) => item.status === "READY"
    );
    if (hasReadyItems) {
      setError("Буюртмада тайёр таомлар мавжуд, ўчириб бўлмайди.");
      setShowDeleteModal(false);
      return;
    }

    try {
      setIsSaving(true);
      await axios.delete(`${API_ENDPOINTS.orders}/${selectedTableOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tableId = selectedTableOrder.tableId;
      if (tableId) {
        const hasOtherOrders = tables.some((t) =>
          t.id === tableId &&
          t.orders?.some((o) => o.id !== selectedTableOrder.id && o.status !== "ARCHIVE")
        );
        if (!hasOtherOrders) {
          await axios.patch(
            `${API_ENDPOINTS.tables}/${tableId}`,
            { status: "empty" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setTables((prev) =>
            prev.map((table) =>
              table.id === tableId ? { ...table, status: "empty", orders: [] } : table
            )
          );
        }
      }
      setCart([]);
      setSelectedTableId(null);
      setSelectedTableOrder(null);
      setSuccessMsg("Буюртма муваффақиятли ўчирилди!");
      console.log(`Order ${selectedTableOrder.id} deleted successfully`);
    } catch (error) {
      console.error("Delete order error:", error);
      setError(handleApiError(error, "Буюртма ўчиришда хатолик."));
    } finally {
      setIsSaving(false);
      setShowDeleteModal(false);
    }
  }, [selectedTableOrder, token, tables]);

  const handleChangeTable = useCallback(
    async (newTableId) => {
      if (!selectedTableOrder?.id || !newTableId) {
        setError("Стол ёки буюртма танланмаган.");
        console.error("No order or table selected for table change", {
          orderId: selectedTableOrder?.id,
          newTableId,
        });
        return;
      }
      try {
        setIsSaving(true);
        const oldTableId = selectedTableOrder.tableId;
        const payload = {
          tableId: newTableId,
          status: selectedTableOrder.status,
          userId: selectedTableOrder.userId,
          uslug: parseFloat(uslug) || null,
        };
        const response = await axios.put(
          `${API_ENDPOINTS.orders}/${selectedTableOrder.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedOrder = response.data || {};
        await axios.patch(
          `${API_ENDPOINTS.tables}/${newTableId}`,
          { status: "busy" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (oldTableId && oldTableId !== newTableId) {
          const hasOtherOrders = tables.some(
            (t) =>
              t.id === oldTableId &&
              t.orders?.some(
                (o) => o.id !== selectedTableOrder.id && o.status !== "ARCHIVE"
              )
          );
          if (!hasOtherOrders) {
            await axios.patch(
              `${API_ENDPOINTS.tables}/${oldTableId}`,
              { status: "empty" },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        setTables((prev) =>
          prev.map((table) => {
            if (table.id === newTableId) {
              return { ...table, status: "busy", orders: [...(table.orders || []), updatedOrder] };
            }
            if (table.id === oldTableId && oldTableId !== newTableId) {
              const updatedOrders = table.orders?.filter((o) => o.id !== selectedTableOrder.id) || [];
              const hasActiveOrders = updatedOrders.some((o) => o.status !== "ARCHIVE");
              return { ...table, orders: updatedOrders, status: hasActiveOrders ? "busy" : "empty" };
            }
            return table;
          })
        );
        setSelectedTableId(newTableId);
        setSelectedTableOrder({
          ...updatedOrder,
          table: tables.find((t) => t.id === newTableId) || { name: "Йўқ", number: "Йўқ" },
          totalPrice: calculateTotalPrice(updatedOrder.orderItems),
          uslug: parseFloat(uslug) || null,
        });
        setCart(
          updatedOrder.orderItems?.map((item) => ({
            id: item.productId || item.product?.id || 0,
            name: item.product?.name || "Номаълум таом",
            price: parseFloat(item.product?.price) || 0,
            count: item.count || 0,
            status: item.status || "PENDING",
          })) || []
        );
        setSuccessMsg("Стол муваффақиятли ўзгартирилди!");
        console.log(
          `Table changed for order ${selectedTableOrder.id} to table ${newTableId}`
        );
      } catch (error) {
        console.error("Change table error:", error);
        setError(handleApiError(error, "Стол ўзгартиришда хатолик."));
      } finally {
        setIsSaving(false);
        setShowChangeTableModal(false);
      }
    },
    [selectedTableOrder, token, tables, uslug, calculateTotalPrice]
  );

  const handleResetFinishedProducts = useCallback(async () => {
    try {
      setIsSaving(true);
      const productsRes = await axios.get(API_ENDPOINTS.products, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const currentProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
      
      const finishedProducts = currentProducts.filter((product) => product.isFinished);
      if (finishedProducts.length === 0) {
        setSuccessMsg("Тугаган таомлар йўқ.");
        setShowResetProductsModal(false);
        return;
      }

      await Promise.all(
        finishedProducts.map((product) =>
          axios.patch(
            `${API_ENDPOINTS.products}/${product.id}`,
            { isFinished: false },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      const updatedProductsRes = await axios.get(API_ENDPOINTS.products, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedProducts = Array.isArray(updatedProductsRes.data) ? updatedProductsRes.data : [];
      setTaomlar(updatedProducts);
      setCart([]);
      setSuccessMsg("Quyidagi taomlar tugagan yoki topilmadi holatidan tiklandi va savat tozalandi!");
    } catch (error) {
      setError(handleApiError(error, "Таомларни тиклашда хатолик."));
    } finally {
      setIsSaving(false);
      setShowResetProductsModal(false);
    }
  }, [token]);

  const handleAdminCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) {
      setAdminCode(value);
    }
  };

  const toggleAdminMode = () => {
    if (adminCode === "1234" && !isAdminMode) {
      setSuccessMsg("Админ режими ёқилди!");
      setAdminCode("");
      setIsAdminMode(true);
      setError(null);
    } else if (adminCode === "" && isAdminMode) {
      setSuccessMsg("Админ режими ўчирилди!");
      setAdminCode("");
      setIsAdminMode(false);
      setError(null);
    } else {
      setError("Нотўғри код. Илтимос, 1234 ни киритинг.");
      setAdminCode("");
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete?.id) {
      setError("Стол танланмаган.");
      return;
    }
    try {
      setIsSaving(true);
      await axios.delete(`${API_ENDPOINTS.tables}/${tableToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTables((prev) => prev.filter((table) => table.id !== tableToDelete.id));
      setPlaces((prev) => {
        const remainingTables = tables.filter((table) => table.id !== tableToDelete.id);
        const uniquePlaces = [...new Set(remainingTables.map((table) => table.name))].filter(Boolean);
        if (!uniquePlaces.includes(filterPlace) && uniquePlaces.length > 0) {
          setFilterPlace(uniquePlaces[0]);
        } else if (uniquePlaces.length === 0) {
          setFilterPlace("");
        }
        return uniquePlaces;
      });
      if (selectedTableId === tableToDelete.id) {
        setSelectedTableId(null);
        setSelectedTableOrder(null);
        setCart([]);
      }
      setSuccessMsg("Стол муваффақиятли ўчирилди!");
    } catch (error) {
      console.error("Delete table error:", error);
      setError(handleApiError(error, "Стол ўчиришда хатолик."));
    } finally {
      setIsSaving(false);
      setShowDeleteTableModal(false);
      setTableToDelete(null);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Токен топилмади. Илтимос, тизимга қайта киринг.");
      console.error("No token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("Fetching data with token:", token);
        const [tablesRes, productsRes, categoriesRes, percentRes] = await Promise.all([
          axios.get(API_ENDPOINTS.tables, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).catch((err) => {
            throw new Error(`Столларни юклашда хатолик: ${err.message}`);
          }),
          axios.get(API_ENDPOINTS.products, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).catch((err) => {
            throw new Error(`Маҳсулотларни юклашда хатолик: ${err.message}`);
          }),
          axios.get(API_ENDPOINTS.categories, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).catch((err) => {
            throw new Error(`Категорияларни юклашда хатолик: ${err.message}`);
          }),
          axios.get(API_ENDPOINTS.percent, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).catch((err) => {
            throw new Error(`Хизмат нархини юклашда хатолик: ${err.message}`);
          }),
        ]);

        const tablesData = Array.isArray(tablesRes.data?.data)
          ? tablesRes.data.data
          : Array.isArray(tablesRes.data)
          ? tablesRes.data
          : [];
        const normalizedTables = tablesData.map((table) => ({
          ...table,
          status: normalizeStatus(table.status),
          orders: Array.isArray(table.orders) ? table.orders : [],
        }));
        const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(
          Boolean
        );

        setTables(normalizedTables);
        setPlaces(uniquePlaces);
        setFilterPlace(uniquePlaces[0] || "");
        setTaomlar((prev) => {
          const newProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
          if (JSON.stringify(prev) !== JSON.stringify(newProducts)) {
            console.log("Updating taomlar with new data:", newProducts);
            return newProducts;
          }
          console.log("No change in taomlar, skipping update");
          return prev;
        });
        const categoriesData = Array.isArray(categoriesRes.data?.data)
          ? categoriesRes.data.data
          : Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : [];
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].name);
        }
        setCommissionPercent(parseFloat(percentRes.data?.percent) || 0);
        setUslug(percentRes.data?.percent?.toString() || "0");
        console.log("Data fetched successfully", {
          tables: tablesData.length,
          products: productsRes.data.length,
          categories: categoriesData.length,
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(handleApiError(err, "Маълумотларни юклашда хатолик."));
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(async () => {
      try {
        const productsRes = await axios.get(API_ENDPOINTS.products, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        setTaomlar((prev) => {
          const newProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
          if (JSON.stringify(prev) !== JSON.stringify(newProducts)) {
            console.log("Polling: Updating taomlar with new data:", newProducts);
            return newProducts;
          }
          console.log("Polling: No change in taomlar, skipping update");
          return prev;
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Polling error:", err);
      }
    }, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (!selectedTableId) {
      setSelectedTableOrder(null);
      setCart([]);
      setError(null);
      console.log("No table selected, resetting order and cart");
      return;
    }

    const selectedTable = tables.find((t) => t?.id === selectedTableId);
    if (!selectedTable) {
      setSelectedTableOrder(null);
      setCart([]);
      setError("Стол топилмади.");
      console.error("Selected table not found", { selectedTableId });
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
        const totalPrice = calculateTotalPrice(latestOrder.orderItems);
        setSelectedTableOrder({ ...latestOrder, totalPrice });
        setCart(
          latestOrder.orderItems?.map((item) => ({
            id: item.productId || item.product?.id || 0,
            name: item.product?.name || "Номаълум таом",
            price: parseFloat(item.product?.price) || 0,
            count: item.count || 0,
            status: item.status || "PENDING",
          })) || []
        );
        console.log("Selected table order updated", {
          orderId: latestOrder.id,
          items: latestOrder.orderItems.length,
        });
      } else {
        setSelectedTableOrder(null);
        setCart([]);
        setError("Актив буюртма топилмади.");
        console.log("No active orders for selected table", { tableId: selectedTableId });
      }
    } else {
      setSelectedTableOrder(null);
      setCart([]);
      setError(null);
      console.log("Selected table is empty or has no orders", {
        tableId: selectedTableId,
      });
    }
  }, [selectedTableId, tables, calculateTotalPrice]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const addToCart = (taom) => {
    const product = taomlar.find((p) => p.id === taom.id);
    if (!product) {
      setError(`Таом топилмади: ${taom.name || "ID " + taom.id}`);
      console.warn(`Product not found in taomlar: ${taom.id}`);
      return;
    }
    if (product.isFinished) {
      setError(`Бу таом тугаган, саватга қўшиш мумкин эмас: ${product.name}`);
      console.warn(`Attempted to add finished product to cart: ${product.name}`);
      return;
    }
    setCart((prev) => {
      const foundTaom = prev.find((item) => item.id === taom.id);
      if (foundTaom) {
        return prev.map((item) =>
          item.id === taom.id ? { ...item, count: item.count + 1 } : item
        );
      }
      return [...prev, { ...taom, count: 1, status: "PENDING" }];
    });
    console.log("Added to cart", { taomId: taom.id, name: taom.name });
  };

  const removeFromCart = (taom) => {
    const product = taomlar.find((p) => p.id === taom.id);
    if (!product) {
      setError(`Таом топилмади: ${taom.name || "ID " + taom.id}`);
      console.warn(`Product not found in taomlar for removal: ${taom.id}`);
      return;
    }
    if (product.isFinished) {
      setError(`Бу таом тугаган, саватдан ўчириш мумкин эмас: ${product.name}`);
      console.warn(`Attempted to remove finished product from cart: ${product.name}`);
      return;
    }
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === taom.id ? { ...item, count: item.count - 1 } : item
        )
        .filter((item) => item.count > 0)
    );
    console.log("Removed from cart", { taomId: taom.id });
  };

  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const userId = currentUser.id;

  const statusMapToFrontend = { empty: "Бўш", busy: "Банд", unknown: "Номаълум" };
  const dishStatusMap = {
    PENDING: "Кутилмоқда",
    COOKING: "Пишмоқда",
    READY: "Тайёр",
    COMPLETED: "Тугалланган",
  };

  const totalPrice = calculateTotalPrice(cart);
  const totalWithCommission = totalPrice + totalPrice * (parseFloat(uslug) / 100 || 0);

  // Updated handleOrderConfirm to use the modal
  const handleOrderConfirm = async (orderData) => {
    console.log("Order confirmation started:", orderData);
    const products = orderData.orderItems
      ?.filter((item) => item?.productId && item.count > 0)
      .map((item) => ({
        productId: Number(item.productId),
        count: Number(item.count),
        description: item.description || "",
      })) || [];

    if (!products.length) {
      setError("Буюртмада камида битта мавжуд маҳсулот бўлиши керак.");
      console.error("Order confirmation failed: No valid products");
      return;
    }

    try {
      const productsRes = await axios.get(API_ENDPOINTS.products, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
      setTaomlar(updatedProducts);
      console.log("Product data refreshed before order confirmation");

      const finishedProductsList = checkFinishedProducts(products, updatedProducts);
      if (finishedProductsList.length > 0) {
        const finishedItems = finishedProductsList.map((item) => {
          const product = updatedProducts.find((p) => p.id === item.productId);
          return {
            id: item.productId,
            name: product ? product.name : `ID ${item.productId} (Топилмади)`,
          };
        });
        setFinishedProducts(finishedItems);
        setShowFinishedProductsModal(true);
        return;
      }
    } catch (err) {
      console.error("Failed to refresh products:", err);
      setError(handleApiError(err, "Маҳсулот маълумотларини янгилашда хатолик."));
      return;
    }

    const tableId = orderData.isTableOrder ? Number(orderData.tableId) : null;
    const carrierNumber = !orderData.isTableOrder ? orderData.carrierNumber?.trim() : null;

    if (!userId) {
      setError("Фойдаланувчи ID топилмади.");
      console.error("Order confirmation failed: No userId");
      return;
    }

    const body = {
      products,
      tableId,
      totalPrice: calculateTotalPrice(orderData.orderItems),
      userId: Number(userId),
      carrierNumber,
      uslug: parseFloat(uslug) || null,
    };

    if (orderData.isTableOrder && !tableId) {
      setError("Стол танланг.");
      console.error("Order confirmation failed: No tableId");
      return;
    }

    if (!orderData.isTableOrder && !carrierNumber) {
      setError("Телефон рақамини киритинг.");
      console.error("Order confirmation failed: No carrierNumber");
      return;
    }

    try {
      const isEditing =
        selectedTableOrder &&
        tableId &&
        tables.find((t) => t?.id === tableId)?.status === "busy";
      const url = isEditing
        ? `${API_ENDPOINTS.orders}/${selectedTableOrder.id}`
        : API_ENDPOINTS.orders;
      const method = isEditing ? axios.patch : axios.post;

      console.log("Sending order:", { url, method, body });
      const response = await method(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (orderData.isTableOrder && tableId) {
        await axios.patch(
          `${API_ENDPOINTS.tables}/${tableId}`,
          { status: "busy" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTables((prev) =>
          prev.map((table) =>
            table.id === tableId ? { ...table, status: "busy", orders: [response.data] } : table
          )
        );
      }

      setCart([]);
      setSelectedTableId(null);
      setSelectedTableOrder(null);
      setSuccessMsg("Буюртма муваффақиятли юборилди!");
      console.log(`Order ${isEditing ? "updated" : "created"} successfully`, {
        orderId: response.data.id,
      });
    } catch (err) {
      console.error("Order confirmation error:", err);
      setError(handleApiError(err, "Буюртма юборувда хатолик."));
    } finally {
      setShowModal(false);
    }
  };

  const filteredTaomlar = React.useMemo(() => {
    return (
      selectedCategory && categories.length
        ? taomlar
            .filter(
              (taom) =>
                taom.categoryId &&
                taom.categoryId === categories.find((cat) => cat.name === selectedCategory)?.id
            )
            .sort((a, b) => a.id - b.id)
        : taomlar.sort((a, b) => a.id - b.id)
    );
  }, [selectedCategory, categories, taomlar]);

  const filteredTables = filterPlace
    ? tables.filter((table) => table.name === filterPlace)
    : tables;

  return (
    <section className="content-section">
      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="admin-mode-control" style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="text"
            value={adminCode}
            onChange={handleAdminCodeChange}
            placeholder="4 хонали код"
            maxLength={4}
            style={{ padding: "8px", width: "120px" }}
          />
          <button
            onClick={toggleAdminMode}
            className="admin-mode-btn"
            style={{
              padding: "8px 16px",
              backgroundColor: isAdminMode ? "#dc3545" : "#28a745",
              color: "#fff",
            }}
          >
            <Lock size={20} /> {isAdminMode ? "Админни ўчириш" : "Админ режими"}
          </button>
        </div>
      </div>

      <div className="table-controls">
        <div className="place-filter">
          <div className="place-filter-buttons">
            {places.length ? (
              places.map((place, index) => (
                <button
                  key={index}
                  className={`place-filter-btn ${filterPlace === place ? "active" : ""}`}
                  onClick={() => setFilterPlace(place)}
                >
                  {place}
                </button>
              ))
            ) : (
              <p>Жойлар топилмади</p>
            )}
          </div>
        </div>
        {isAdminMode && (
          <div className="table-actions">
            <button
              className="delete-table-btn"
              onClick={() => {
                if (selectedTableId) {
                  const table = tables.find((t) => t.id === selectedTableId);
                  if (table && table.status === "empty") {
                    setTableToDelete(table);
                    setShowDeleteTableModal(true);
                  } else {
                    setError("Фақат бўш столларни ўчириш мумкин.");
                  }
                } else {
                  setError("Илтимос, стол танланг.");
                }
              }}
              title="Танланган столни ўчириш"
            >
              <Trash size={20} /> Столни ўчириш
            </button>
            <button
              className="add-table-btn"
              onClick={() => setShowAddTableModal(true)}
              title="Янги стол қўшиш"
            >
              <Plus size={20} /> Стол қўшиш
            </button>
            <button
              className="add-place-btn"
              onClick={() => setShowAddPlaceModal(true)}
              title="Янги жой қўшиш"
            >
              <Plus size={20} /> Жой қўшиш
            </button>
            <button
              className="reset-products-btn"
              onClick={() => setShowResetProductsModal(true)}
              title="Тугаган таомларни тиклаш"
            >
              <RefreshCw size={20} /> Тугаган таомларни тиклаш
            </button>
          </div>
        )}
      </div>

      <div style={{ marginRight: "-30px" }} className="order-layout">
        <div style={{ maxWidth: "300px" }} className="tables-column">
          <h3>Столлар</h3>
          {loading ? (
            <div className="spinner"></div>
          ) : filteredTables.length === 0 ? (
            <p>Столлар топилмади</p>
          ) : (
            <ul style={{ maxHeight: "700px" }} className="tables-list">
              {filteredTables.map((table) => (
                <li
                  key={table.id}
                  className={`table-item ${
                    selectedTableId === table.id ? "selected" : ""
                  } ${table.status === "busy" ? "band" : "bosh"}`}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <div className="table-item-container">
                    <div className="table-info">
                      <span>{table.name || "Номаълум"}</span>
                      <span>{table.number || "N/A"}</span>
                      <span className="table-status">
                        {statusMapToFrontend[table.status] || "Номаълум"}
                      </span>
                    </div>
                    <div className="table-actions-container">
                      {table.status === "busy" && table.orders?.length > 0 && (
                        <span className="band-button">BAND</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cart-column">
          <h3>Буюртма савати</h3>
          {selectedTableId ? (
            <>
              <p className="selected-table">
                Танланган стол:{" "}
                {tables.find((t) => t?.id === selectedTableId)?.name || "Номаълум"} -{" "}
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
              <table style={{ marginLeft: "-5px" }} className="basket-table">
                <thead>
                  <tr>
                    <th>Номи</th>
                    <th>Миқдор</th>
                    <th>Нархи</th>
                    <th>Суммаси</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name || "Номаълум"}</td>
                        <td>{item.count || 0}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPrice(item.price * item.count)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">Саватда таомлар йўқ</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {selectedTableOrder && (
                <div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    className="cart-actions"
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "start", gap: "5px" }}>
                      <input
                        placeholder="Хизмат нархи (%)"
                        type="number"
                        value={uslug}
                        onChange={handleUslugChange}
                        style={{ padding: "8px", width: "150px" }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "start",
                          gap: "5px",
                        }}
                      >
                        <button
                          className="action-btn delete-btn"
                          onClick={() => setShowDeleteModal(true)}
                          disabled={isSaving || selectedTableOrder.orderItems?.some((item) => item.status === "READY")}
                        >
                          <Trash size={20} />
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => setShowEditModal(true)}
                          disabled={isSaving}
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          className="action-btn change-table-btn"
                          onClick={() => setShowChangeTableModal(true)}
                          disabled={isSaving}
                        >
                          <ArrowLeftRight size={20} />
                        </button>
                      </div>
                    </div>
                    <h3 className="basket-table__total">{formatPrice(totalWithCommission)}</h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                        gap: "5px",
                      }}
                    >
                      <button
                        className="action-btn print-btn"
                        onClick={() => handlePrintOnly(selectedTableOrder)}
                        disabled={isSaving}
                      >
                        <Printer size={20} /> Причек
                      </button>
                      <button
                        className="action-btn print-pay-btn"
                        onClick={() => handlePrintAndPay(selectedTableOrder)}
                        disabled={isSaving}
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!selectedTableOrder && (
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

        {!selectedTableOrder && (
          <div className="products-column">
            <div className="category-buttons">
              {categories.length ? (
                categories.map((category) => (
                  <button
                    key={category.id}
                    className={`category-btn ${
                      selectedCategory === category.name ? "active" : ""
                    }`}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name}
                  </button>
                ))
              ) : (
                <p>Категориялар топилмади</p>
              )}
            </div>
            <h3>Таомлар</h3>
            {loading ? (
              <div className="spinner"></div>
            ) : filteredTaomlar.length === 0 ? (
              <p>Таомлар топилмади</p>
            ) : (
              <ul style={{ maxHeight: "600px" }} className="products-list">
                {filteredTaomlar.map((taom) => (
                  <li
                    key={taom.id}
                    className={`product-item ${taom.isFinished ? "finished" : ""}`}
                  >
                    <div
                      onClick={() => !taom.isFinished && addToCart(taom)}
                      className="product-info"
                      style={{
                        cursor: taom.isFinished ? "not-allowed" : "pointer",
                        opacity: taom.isFinished ? 0.5 : 1,
                      }}
                    >
                      <span className="product-name">
                        {taom.name || "Номаълум таом"} {taom.isFinished ? "(Тугаган)" : ""}
                      </span>
                      <span className="product-price">({formatPrice(taom.price)})</span>
                    </div>
                    <div className="menu-card__controls">
                      <button
                        className="control-btn"
                        onClick={() => removeFromCart(taom)}
                        disabled={taom.isFinished}
                      >
                        -
                      </button>
                      <span className="control-value">
                        {Math.max(cart.find((item) => item.id === taom.id)?.count || 0, 0)}
                      </span>
                      <button
                        className="control-btn"
                        onClick={() => addToCart(taom)}
                        disabled={taom.isFinished}
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
          onClose={() => setShowAddTableModal(false)}
          onConfirm={async (tableData) => {
            try {
              await axios.post(API_ENDPOINTS.tables, tableData, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const res = await axios.get(API_ENDPOINTS.tables, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const tablesData = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data)
                ? res.data
                : [];
              setTables(
                tablesData.map((table) => ({
                  ...table,
                  status: normalizeStatus(table.status),
                  orders: Array.isArray(table.orders) ? table.orders : [],
                }))
              );
              setPlaces((prev) => {
                const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(Boolean);
                if (!uniquePlaces.includes(filterPlace) && uniquePlaces.length > 0) {
                  setFilterPlace(uniquePlaces[0]);
                }
                return uniquePlaces;
              });
              setSuccessMsg("Стол муваффақиятли қўшилди!");
              console.log("Table added successfully", { tableData });
            } catch (error) {
              console.error("Add table error:", error);
              setError(handleApiError(error, "Стол қўшишда хатолик."));
            } finally {
              setShowAddTableModal(false);
            }
          }}
          places={places}
        />
      )}

      {showAddPlaceModal && (
        <AddPlaceModal
          isOpen={showAddPlaceModal}
          onClose={() => setShowAddPlaceModal(false)}
          onConfirm={async (placeName) => {
            try {
              if (places.includes(placeName)) {
                setError("Бу жой номи аллақачон мавжуд.");
                return;
              }
              const tableData = {
                name: placeName,
                number: `${placeName} - 001`,
                status: "empty",
              };
              await axios.post(API_ENDPOINTS.tables, tableData, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const res = await axios.get(API_ENDPOINTS.tables, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const tablesData = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data)
                ? res.data
                : [];
              setTables(
                tablesData.map((table) => ({
                  ...table,
                  status: normalizeStatus(table.status),
                  orders: Array.isArray(table.orders) ? table.orders : [],
                }))
              );
              setPlaces((prev) => {
                const uniquePlaces = [...new Set(tablesData.map((table) => table.name))].filter(Boolean);
                if (!filterPlace || !uniquePlaces.includes(filterPlace)) {
                  setFilterPlace(placeName);
                }
                return uniquePlaces;
              });
              setSuccessMsg("Жой муваффақиятли қўшилди!");
              console.log("Place added successfully", { placeName });
            } catch (error) {
              console.error("Add place error:", error);
              setError(handleApiError(error, "Жой қўшишда хатолик."));
            } finally {
              setShowAddPlaceModal(false);
            }
          }}
        />
      )}

      {showEditModal && selectedTableOrder && (
        <EditOrderModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          order={selectedTableOrder}
          products={taomlar}
          isSaving={isSaving}
          token={token}
          setTables={setTables}
          tables={tables}
          setSelectedTableOrder={setSelectedTableOrder}
          setCart={setCart}
          setSuccessMsg={setSuccessMsg}
          setError={setError}
          commissionPercent={commissionPercent}
          categories={categories}
        />
      )}

      {showChangeTableModal && selectedTableOrder && (
        <ChangeTableModal
          isOpen={showChangeTableModal}
          onClose={() => setShowChangeTableModal(false)}
          onConfirm={handleChangeTable}
          tables={tables}
          selectedOrderId={selectedTableOrder.id}
          isSaving={isSaving}
        />
      )}

      {showDeleteModal && selectedTableOrder && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteOrder}
          orderId={selectedTableOrder.id}
        />
      )}

      {showDeleteTableModal && tableToDelete && (
        <DeleteTableModal
          isOpen={showDeleteTableModal}
          onClose={() => {
            setShowDeleteTableModal(false);
            setTableToDelete(null);
          }}
          onConfirm={handleDeleteTable}
          table={tableToDelete}
        />
      )}

      {showResetProductsModal && (
        <ResetFinishedProductsModal
          isOpen={showResetProductsModal}
          onClose={() => setShowResetProductsModal(false)}
          onConfirm={handleResetFinishedProducts}
          setCart={setCart}
        />
      )}

      {showFinishedProductsModal && (
        <FinishedProductsModal
          isOpen={showFinishedProductsModal}
          onClose={() => setShowFinishedProductsModal(false)}
          finishedProducts={finishedProducts}
          onConfirm={() => {
            setCart((prevCart) =>
              prevCart.map((item) =>
                finishedProducts.some((fp) => fp.id === item.id)
                  ? { ...item, count: 0 }
                  : item
              ).filter((item) => item.count > 0)
            );
            setShowFinishedProductsModal(false);
          }}
        />
      )}

      <div style={{ display: "none" }}>
        <Receipt
          ref={receiptRef}
          order={selectedTableOrder}
          commissionPercent={parseFloat(uslug) || commissionPercent}
          formatPrice={formatPrice}
        />
      </div>
    </section>
  );
});

export default Taomlar;