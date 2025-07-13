import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosRetry from "axios-retry";
import { Truck, Hash, Phone, Package, DollarSign, Calendar, Printer, ShoppingCart, Search, Trash, Pencil, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import io from "socket.io-client";
import Receipt from "../components/Receipt.jsx";

// Consolidated API constants
const API_BASE_URL = "https://alikafecrm.uz";
const API_ENDPOINTS = {
  ORDERS: `${API_BASE_URL}/order`,
  PRODUCTS: `${API_BASE_URL}/product`,
  CATEGORIES: `${API_BASE_URL}/category`,
  SERVICE_FEE: `${API_BASE_URL}/percent/3`,
};

// Axios retry configuration
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Socket.IO client initialization
const socket = io(API_BASE_URL, {
  auth: { token: localStorage.getItem("token") },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 30000,
  transports: ["websocket", "polling"],
});

// Utility functions
const playSound = () => {
  const audio = new Audio("/synthesize.mp3");
  audio.play().catch((error) => console.error("Audio playback error:", error));
};

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
    defaultMessage ||
    "Номаълум хатолик юз берди."
  );
};

// Debounce hook
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// ModalBasket component
const ModalBasket = ({ isOpen, onClose, onConfirm, cart, orderDescriptions, setOrderDescriptions, orderToEdit = null, serviceFee, isConfirming }) => {
  const [carrierNumber, setCarrierNumber] = useState("+998");
  const inputRef = useRef(null);

  useEffect(() => {
    if (orderToEdit?.carrierNumber) {
      setCarrierNumber(orderToEdit.carrierNumber);
    }
  }, [orderToEdit]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.startsWith("+998")) {
      const digits = value.slice(4).replace(/[^0-9]/g, "");
      setCarrierNumber("+998" + digits);
    }
  };

  const handleKeyDown = (e) => {
    const cursorPosition = inputRef.current.selectionStart;
    if (e.key === "Backspace" && cursorPosition <= 4) {
      e.preventDefault();
    }
  };

  const handleDescriptionChange = (productId, value) => {
    setOrderDescriptions((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Саватда маҳсулотлар йўқ!");
      return;
    }
    if (carrierNumber !== "+998" && !/^\+998\d{9}$/.test(carrierNumber)) {
      alert("Илтимос, тўлиқ телефон рақамини киритинг (+998123456789)");
      return;
    }
    const orderItemsWithDescriptions = cart.map((item) => ({
      ...item,
      description: orderDescriptions[item.id] || "",
    }));
    onConfirm({
      orderItems: orderItemsWithDescriptions,
      carrierNumber: carrierNumber,
      orderId: orderToEdit?.id || null,
      serviceFee,
    });
    setCarrierNumber("+998");
    setOrderDescriptions({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="modal-title">{orderToEdit ? "Буюртмани таҳрирлаш" : "Доставка буюртмасини расмийлаштириш"}</h3>
          <button
            className="modal-close"
            aria-label="Модални ёпиш"
            onClick={() => {
              setCarrierNumber("+998");
              setOrderDescriptions({});
              onClose();
            }}
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="add-place-form">
          <div className="form-group">
            <label htmlFor="carrierNumber">Телефон рақами (ихтиёрий):</label>
            <input
              type="text"
              id="carrierNumber"
              value={carrierNumber}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              placeholder="+998901234567"
              maxLength={13}
              aria-required="false"
              style={{ padding: "10px", width: "100%", maxWidth: "300px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          {cart.length > 0 && (
            <div className="form-group">
              <label>Маҳсулотлар тафсилотлари:</label>
              {cart.map((item) => (
                <div key={item.id} className="cart-item-description">
                  <span>{item.name} (x{item.count})</span>
                  <textarea
                    value={orderDescriptions[item.id] || ""}
                    onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                    placeholder="Таъриф киритинг (масалан, қадоқлаш тури, махсус сўровлар)"
                    style={{ width: "100%", minHeight: "60px", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
                    aria-label={`Таъриф учун ${item.name}`}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setCarrierNumber("+998");
                setOrderDescriptions({});
                onClose();
              }}
              className="cancel-btn"
            >
              Бекор қилиш
            </button>
            <button type="submit" className="submit-btn" disabled={isConfirming}>
              {isConfirming ? "Тасдиқланмоқда..." : orderToEdit ? "Таҳрирни тасдиқлаш" : "Буюртмани тасдиқлаш"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// EditOrderModal component
const EditOrderModal = ({
  isOpen,
  onClose,
  order,
  products,
  token,
  setOrders,
  setCart,
  setSuccessMsg,
  setError,
  socket,
  categories,
  orderDescriptions,
  setOrderDescriptions,
}) => {
  const [newItem, setNewItem] = useState({ categoryId: "", productId: "", count: 1, description: "" });
  const [editingOrder, setEditingOrder] = useState(order);
  const [localError, setLocalError] = useState("");
  const [localIsSaving, setLocalIsSaving] = useState(false);

  useEffect(() => {
    if (order?.orderItems) {
      setEditingOrder({
        ...order,
        totalPrice: calculateTotalPrice(order.orderItems),
      });
      const initialDescriptions = order.orderItems.reduce((acc, item) => ({
        ...acc,
        [item.productId || item.product?.id]: item.description || "",
      }), {});
      setOrderDescriptions((prev) => ({ ...prev, ...initialDescriptions }));
    }
  }, [order, setOrderDescriptions]);

  useEffect(() => {
    if (localIsSaving) {
      const timer = setTimeout(() => setLocalIsSaving(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [localIsSaving]);

  const calculateTotalPrice = (orderItems) =>
    orderItems?.reduce((sum, item) => {
      const price = parseFloat(item.product?.price) || 0;
      return sum + price * (item.count || 0);
    }, 0) || 0;

  const formatPrice = (price) =>
    price ? Math.round(price).toLocaleString("uz-UZ") + " сўм" : "0 сўм";

  const handleRemoveItem = async (itemId) => {
    if (localIsSaving || !itemId) return;

    const currentItem = editingOrder.orderItems.find((item) => item.id === itemId);
    if (currentItem?.status === "READY") {
      const readyItems = editingOrder.orderItems.filter((item) => item.status === "READY");
      if (readyItems.length === 1) {
        setLocalError("Буюртмада фақат битта тайёр маҳсулот бор, унда бу маҳсулотни ўчириб бўлмайди.");
        return;
      }
    }

    try {
      setLocalIsSaving(true);
      setLocalError("");
      await axios.delete(`${API_ENDPOINTS.ORDERS}/orderItem/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await axios.get(`${API_ENDPOINTS.ORDERS}/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedOrder = response.data;
      const totalPrice = calculateTotalPrice(updatedOrder.orderItems);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === updatedOrder.id ? { ...updatedOrder, totalPrice } : o
        )
      );
      setEditingOrder({ ...updatedOrder, totalPrice });
      setCart(
        updatedOrder.orderItems.map((item) => ({
          id: item.productId || item.product?.id,
          name: item.product?.name || "Номаълум таом",
          price: parseFloat(item.product?.price) || 0,
          count: item.count || 0,
          status: item.status || "PENDING",
          description: item.description || "",
        }))
      );
      setOrderDescriptions((prev) => {
        const newDescriptions = { ...prev };
        delete newDescriptions[currentItem.productId || currentItem.product?.id];
        return newDescriptions;
      });
      setSuccessMsg("Маҳсулот муваффақиятли ўчирилди!");
    } catch (error) {
      const message = handleApiError(error, "Маҳсулотни ўчиришда хатолик.");
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
      setLocalError("Илтимос, маҳсулот танланг ва сонини тўғри киритинг.");
      return;
    }

    // Fetch the latest product data from the server to check isFinished
    try {
      const productResponse = await axios.get(`${API_ENDPOINTS.PRODUCTS}/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const product = productResponse.data;
      if (!product) {
        setLocalError("Танланган маҳсулот топилмади.");
        return;
      }
      if (product.isFinished) {
        setLocalError("Бу маҳсулот тугаган, қўшиш мумкин эмас.");
        return;
      }

      setLocalIsSaving(true);
      setLocalError("");
      const payload = {
        products: [{ productId: Number(productId), count: Number(count), description: description || "" }],
        carrierNumber: editingOrder.carrierNumber,
        userId: editingOrder.userId,
        status: editingOrder.status,
      };
      const response = await axios.put(`${API_ENDPOINTS.ORDERS}/${editingOrder.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedOrder = response.data;
      const totalPrice = calculateTotalPrice(updatedOrder.orderItems);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === updatedOrder.id ? { ...updatedOrder, totalPrice } : o
        )
      );
      setEditingOrder({ ...updatedOrder, totalPrice });
      setCart(
        updatedOrder.orderItems.map((item) => ({
          id: item.productId || item.product?.id,
          name: item.product?.name || "Номаълум таом",
          price: parseFloat(item.product?.price) || 0,
          count: item.count || 0,
          status: item.status || "PENDING",
          description: item.description || "",
        }))
      );
      setOrderDescriptions((prev) => ({
        ...prev,
        [productId]: description,
      }));
      setNewItem({ categoryId: "", productId: "", count: 1, description: "" });
      setSuccessMsg("Маҳсулот муваффақиятли қўшилди!");
    } catch (error) {
      const message = handleApiError(error, "Маҳсулот қўшишда хатолик.");
      setLocalError(message);
      setLocalIsSaving(false);
      setError(message);
    }
  };

  const filteredProducts = newItem.categoryId
    ? products.filter((product) => product.categoryId === parseInt(newItem.categoryId))
    : [];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="edit-modal-title">
      <div className="modal1" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="edit-modal-title">Буюртма №{order?.id} ни таҳрирлаш</h2>
          <button className="modal__close-btn" aria-label="Модални ёпиш" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal__content">
          {localError && <p className="error-message">{localError}</p>}
          {localIsSaving && <p className="saving-message">Сақланмоқда...</p>}
          <div className="modal__items">
            <h3>Жорий маҳсулотлар:</h3>
            {editingOrder?.orderItems?.length ? (
              <div className="modal__items-list">
                {editingOrder.orderItems.map((item) => (
                  <div className="modal__item" key={item.id || item.productId}>
                    <img
                      src={`${API_BASE_URL}${item.product?.image || "/placeholder-food.jpg"}`}
                      alt={item.product?.name || "Номаълум маҳсулот"}
                      className="modal__item-img"
                      onError={(e) => {
                        e.target.src = "/placeholder-food.jpg";
                      }}
                    />
                    <div className="modal__item-info">
                      <span className="modal__item-name">{item.product?.name || "Номаълум маҳсулот"}</span>
                      <span className="modal__item-details">
                        Сони: {item.count} | {formatPrice(item.product?.price || 0)} | Статус: {item.status}
                      </span>
                      <span className="modal__item-description" style={{ display: "block", marginTop: "5px", color: item.description ? "#333" : "#999" }}>
                        Таъриф: {item.description || "Таъриф йўқ"}
                      </span>
                    </div>
                    <button
                      className="modal__item-remove"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={localIsSaving || (item.status === "READY" && editingOrder.orderItems.filter((i) => i.status === "READY").length === 1)}
                      aria-label={`Очириш ${item.product?.name || "Номаълум маҳсулот"}`}
                    >
                      Ўчириш
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="modal__empty">Маҳсулотлар йўқ.</p>
            )}
          </div>
          <div className="modal__add-section">
            <h3 className="modal__add-title">Янги маҳсулот қўшиш:</h3>
            <div className="modal__add-form">
              <select
                className="modal__select"
                value={newItem.categoryId}
                onChange={(e) =>
                  setNewItem({ ...newItem, categoryId: e.target.value, productId: "", description: "" })
                }
                disabled={localIsSaving}
                aria-label="Категория танланг"
                style={{ padding: "10px", width: "100%", maxWidth: "200px", borderRadius: "4px", border: "1px solid #ccc" }}
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
                disabled={localIsSaving || !newItem.categoryId}
                aria-label="Маҳсулот танланг"
                style={{ padding: "10px", width: "100%", maxWidth: "200px", borderRadius: "4px", border: "1px solid #ccc" }}
              >
                <option value="">Маҳсулот танланг</option>
                {filteredProducts.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                    disabled={product.isFinished}
                  >
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
                disabled={localIsSaving}
                aria-label="Маҳсулот сони"
                style={{ padding: "10px", width: "100%", maxWidth: "100px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
              <textarea
                className="modal__input"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Таъриф киритинг (масалан, Қатиқ га, Йўғсиз)"
                disabled={localIsSaving}
                aria-label="Янги маҳсулот таърифи"
                style={{ width: "100%", minHeight: "60px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
              <button
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

// Main Dostavka component
export default function Dostavka() {
  const [orders, setOrders] = useState([]);
  const [taomlar, setTaomlar] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderDescriptions, setOrderDescriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFee, setServiceFee] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const determineOrderStatus = (orderItems) => {
    if (!orderItems || orderItems.length === 0) return "PENDING";

    const allReady = orderItems.every((item) => item.status === "READY");
    if (allReady) return "READY";

    const hasCooking = orderItems.some((item) => item.status === "COOKING");
    const hasPending = orderItems.some((item) => item.status === "PENDING");

    if (hasCooking && !hasPending) return "COOKING";
    return "PENDING";
  };

  const formatPrice = useCallback((price) => {
    const numPrice = typeof price === "number" ? price : parseFloat(price) || 0;
    return Math.round(numPrice).toLocaleString("uz-UZ") + " сўм";
  }, []);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString("uz-UZ", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return dateStr || "N/A";
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    onError: (error) => {
      console.error("Чоп этишда хатолик:", error);
      setError("Чоп этишда хатолик юз берди.");
    },
  });

  const handleOrderConfirm = async (orderData) => {
    if (isConfirming) return;
    setIsConfirming(true);

    if (!orderData?.orderItems?.length) {
      setError("Буюртмада камida битта маҳсулот бўлиши керак.");
      setShowModal(false);
      setIsConfirming(false);
      return;
    }

    try {
      // Fetch the latest product data from the server to check isFinished
      const productIds = orderData.orderItems.map((item) => item.id);
      const productResponses = await Promise.all(
        productIds.map((id) =>
          axios.get(`${API_ENDPOINTS.PRODUCTS}/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      const latestProducts = productResponses.map((res) => res.data);

      // Check isFinished status for each item in the cart
      const finishedItems = orderData.orderItems
        .map((item) => {
          const product = latestProducts.find((p) => p.id === item.id);
          return product?.isFinished ? item.name : null;
        })
        .filter(Boolean);

      if (finishedItems.length > 0) {
        setError(
          `Қуйидаги маҳсулотлар тугаган, буюртма бериб бўлмайди: ${finishedItems.join(", ")}`
        );
        setShowModal(false);
        setIsConfirming(false);
        return;
      }

      const products = orderData.orderItems
        .filter((item) => item?.id && item.count > 0)
        .map((item) => ({
          productId: Number(item.id),
          count: Number(item.count),
          description: item.description || "",
        }));

      if (!products.length) {
        setError("Буюртмада маҳсулотлар йўқ.");
        setShowModal(false);
        setIsConfirming(false);
        return;
      }

      const totalPrice = orderData.orderItems.reduce((acc, item) => {
        const product = latestProducts.find((p) => p.id === item.id);
        const price = Number(product?.price) || Number(item.price) || 0;
        return acc + price * item.count;
      }, 0);

      const currentUser = JSON.parse(localStorage.getItem("user")) || {};
      const userId = Number(currentUser.id);

      if (!userId) {
        setError("Фойдаланувчи ID топилмади. Илтимос, қайта киринг.");
        setShowModal(false);
        setIsConfirming(false);
        return;
      }

      const body = {
        products,
        totalPrice: Number(totalPrice),
        userId,
        carrierNumber: orderData.carrierNumber,
        serviceFee: Number(orderData.serviceFee) || 0,
      };

      let updatedOrder;
      if (orderData.orderId) {
        const response = await axios.put(`${API_ENDPOINTS.ORDERS}/${orderData.orderId}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedOrder = response.data;
        setSuccessMsg("Буюртма муваффақиятли таҳрирланди!");
      } else {
        const response = await axios.post(API_ENDPOINTS.ORDERS, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedOrder = response.data;
        setSuccessMsg("Доставка буюртмаси муваффақиятли яратилди!");
      }

      setOrders((prev) => {
        const existingOrderIndex = prev.findIndex((o) => o.id === updatedOrder.id);
        const totalPrice = updatedOrder.orderItems?.reduce((sum, item) => {
          const price = parseFloat(item.product?.price) || 0;
          const count = parseInt(item.count) || 0;
          return sum + price * count;
        }, 0) || 0;
        const status = determineOrderStatus(updatedOrder.orderItems);
        const updatedOrderWithPrice = { ...updatedOrder, totalPrice: Math.round(totalPrice * 100) / 100, status };

        if (existingOrderIndex >= 0) {
          return prev.map((o, index) =>
            index === existingOrderIndex ? updatedOrderWithPrice : o
          );
        } else {
          return [updatedOrderWithPrice, ...prev];
        }
      });

      setCart([]);
      setOrderDescriptions({});
      setServiceFee(0);
    } catch (err) {
      setError(`Хатолик: ${handleApiError(err, "Буюртма яратиш/таҳрирлашда хатолик юз берди.")}`);
    } finally {
      setIsConfirming(false);
      setShowModal(false);
      setOrderToEdit(null);
    }
  };

  const handleCloseAndPrint = async (order) => {
    if (isPrinting) return;
    setIsPrinting(true);

    if (!order?.id) {
      setError("Буюртма маълумотлари топилмади.");
      setIsPrinting(false);
      return;
    }

    try {
      setCurrentOrder({
        id: order.id,
        orderItems: order.orderItems || [],
        tableNumber: order.carrierNumber || "",
        totalPrice: order.totalPrice || 0,
        commission: order.serviceFee || 0,
        totalWithCommission: (order.totalPrice || 0) + (order.serviceFee || 0),
        createdAt: order.createdAt || new Date().toISOString(),
      });

      await axios.put(
        `${API_ENDPOINTS.ORDERS}/${order.id}`,
        { status: "ARCHIVE" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) => prev.filter((o) => o.id !== order.id));

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!receiptRef.current) {
        setError("Чоп этиш учун маълумотлар тайёр эмас.");
        setIsPrinting(false);
        return;
      }

      handlePrint();
      setSuccessMsg(`Буюртма #${order.id} тўланди ва чоп этилди!`);
      setCurrentOrder(null);
    } catch (error) {
      setError(`Чоп этиш ёки статусни ўзгартиришда хатолик юз берди: ${handleApiError(error, "Номаълум хатолик.")}`);
      setCurrentOrder(null);
    } finally {
      setIsPrinting(false);
    }
  };

  const debouncedHandleOrderConfirm = useDebounce(handleOrderConfirm, 500);
  const debouncedHandleCloseAndPrint = useDebounce(handleCloseAndPrint, 500);

  const handleDeleteOrder = async (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const readyItems = order.orderItems?.filter((item) => item.status === "READY") || [];
    if (readyItems.length === 1) {
      alert("Буюртмада фақат битта тайёр маҳсулот бор, унда буюртмани ўчириб бўлмайди.");
      return;
    }

    if (!window.confirm("Буюртмани ўчирмоқчимисиз?")) return;
    try {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, isDeleting: true } : o
        )
      );
      await axios.delete(`${API_ENDPOINTS.ORDERS}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSuccessMsg("Буюртма муваффақиятли ўчирилди!");
      }, 500);
    } catch (err) {
      setError(`Буюртмани ўчиришда хатолик юз берди: ${handleApiError(err, "Номаълум хатолик.")}`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, isDeleting: false } : o
        )
      );
    }
  };

  const addToCart = (taom) => {
    if (!taom?.id || !taom?.price || taom.isFinished) {
      if (taom.isFinished) {
        setError("Бу маҳсулот тугаган, қўшиб бўлмайди!");
      }
      return;
    }
    setCart((prev) => {
      const foundTaom = prev.find((item) => item.id === taom.id);
      if (foundTaom) {
        return prev.map((item) =>
          item.id === taom.id
            ? { ...item, count: item.count + 1, description: orderDescriptions[taom.id] || "" }
            : item
        );
      }
      return [...prev, { ...taom, count: 1, status: "PENDING", description: orderDescriptions[taom.id] || "" }];
    });
  };

  const removeFromCart = (taom) => {
    if (!taom?.id) return;
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === taom.id
            ? { ...item, count: item.count - 1, description: orderDescriptions[taom.id] || "" }
            : item
        )
        .filter((item) => item.count > 0)
    );
  };

  useEffect(() => {
    if (!token) {
      alert("Илтимос, тизимга киринг.");
      navigate("/login");
      return;
    }

    socket.connect();
    socket.on("connect", () => {
      console.log("Socket.IO ulandi:", socket.id);
      setSuccessMsg("WiFi серверга уланди!");
    });

    socket.on("reconnect", (attempt) => {
      console.log(`Socket.IO ${attempt} urinishdan so‘ng qayta ulandi`);
      setSuccessMsg("WiFi серверга қайта уланди!");
    });

    socket.on("connect_error", (err) => {
      console.error("WiFi ulanishida xatolik:", err.message);
      setError(`WiFi ulanishida xatolik: ${err.message}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket uzildi:", reason);
      setError(`WiFi ulanishi uzildi: ${reason}`);
    });

    socket.on("order_created", (newOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        const totalPrice = newOrder.orderItems?.reduce((sum, item) => {
          const price = parseFloat(item.product?.price) || 0;
          const count = parseInt(item.count) || 0;
          return sum + price * count;
        }, 0) || 0;
        const status = determineOrderStatus(newOrder.orderItems);
        playSound();
        return [
          { ...newOrder, totalPrice: Math.round(totalPrice * 100) / 100, status },
          ...prev,
        ];
      });
      setSuccessMsg(`Yangi buyurtma #${newOrder.id} yaratildi!`);
    });

    socket.on("order_updated", (updatedOrder) => {
      setOrders((prev) => {
        const existingOrder = prev.find((o) => o.id === updatedOrder.id);
        if (!existingOrder || updatedOrder.status === "ARCHIVE") return prev;
        const totalPrice = updatedOrder.orderItems?.reduce((sum, item) => {
          const price = parseFloat(item.product?.price) || 0;
          const count = parseInt(item.count) || 0;
          return sum + price * count;
        }, 0) || 0;
        const status = determineOrderStatus(updatedOrder.orderItems);
        playSound();
        return prev.map((o) =>
          o.id === updatedOrder.id
            ? { ...updatedOrder, totalPrice: Math.round(totalPrice * 100) / 100, status }
            : o
        );
      });
      setSuccessMsg(`Buyurtma #${updatedOrder.id} yangilandi!`);
    });

    socket.on("orderItemStatusUpdated", (updatedOrderItem) => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === updatedOrderItem.orderId) {
            const updatedItems = order.orderItems.map((item) =>
              item.id === updatedOrderItem.id
                ? { ...item, status: updatedOrderItem.status, description: item.description || "" }
                : item
            );
            const totalPrice = updatedItems.reduce((sum, item) => {
              const price = parseFloat(item.product?.price) || 0;
              const count = parseInt(item.count) || 0;
              return sum + price * count;
            }, 0);
            const status = determineOrderStatus(updatedItems);
            playSound();
            return {
              ...order,
              orderItems: updatedItems,
              totalPrice: Math.round(totalPrice * 100) / 100,
              status,
            };
          }
          return order;
        })
      );
      setSuccessMsg(
        `Buyurtma mahsuloti #${updatedOrderItem.id} statusi ${updatedOrderItem.status} ga o‘zgardi!`
      );
    });

    socket.on("order_deleted", (orderId) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSuccessMsg(`Buyurtma #${orderId} o‘chirildi!`);
    });

    const fetchOrders = async () => {
      const controller = new AbortController();
      try {
        const res = await axios.get(API_ENDPOINTS.ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          timeout: 10000,
        });
        const deliveryOrders = Array.isArray(res.data)
          ? res.data
            .filter((order) => ["PENDING", "COOKING", "READY"].includes(order.status))
            .map((order) => {
              const totalPrice = order.orderItems?.reduce((sum, item) => {
                const price = parseFloat(item.product?.price) || 0;
                const count = parseInt(item.count) || 0;
                return sum + price * count;
              }, 0) || 0;
              const status = determineOrderStatus(order.orderItems);
              return {
                ...order,
                totalPrice: Math.round(totalPrice * 100) / 100,
                status,
              };
            })
          : [];
        setOrders(deliveryOrders);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Buyurtmalarni yuklashda xatolik yuz berdi: ${handleApiError(err, "Номаълум хатолик.")}`);
        }
      }
      return controller;
    };

    const fetchTaomlar = async () => {
      const controller = new AbortController();
      try {
        const res = await axios.get(API_ENDPOINTS.PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          timeout: 10000,
        });
        setTaomlar(
          Array.isArray(res.data)
            ? res.data.map((product) => ({
              id: product.id,
              name: product.name,
              price: product.price,
              categoryId: product.categoryId,
              isFinished: product.isFinished || false,
            }))
            : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Mahsulotlarni yuklashda xatolik yuz berdi: ${handleApiError(err, "Номаълум хатолик.")}`);
        }
      }
      return controller;
    };

    const fetchCategories = async () => {
      const controller = new AbortController();
      try {
        const res = await axios.get(API_ENDPOINTS.CATEGORIES, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          timeout: 10000,
        });
        const fetchedCategories = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setCategories(fetchedCategories);
        if (fetchedCategories.length > 0) {
          setSelectedCategory(fetchedCategories[0].name);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Kategoriyalarni yuklashda xatolik yuz berdi: ${handleApiError(err, "Номаълум хатолик.")}`);
        }
      }
      return controller;
    };

    const fetchServiceFee = async () => {
      const controller = new AbortController();
      try {
        const res = await axios.get(API_ENDPOINTS.SERVICE_FEE, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          timeout: 10000,
        });
        setServiceFee(res.data?.percent || 0);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Xizmat haqini yuklashda xatolik yuz berdi: ${handleApiError(err, "Номаълум хатолик.")}`);
        }
      }
      return controller;
    };

    setLoading(true);
    const controllers = [];
    Promise.all([
      fetchOrders().then((controller) => controllers.push(controller)),
      fetchTaomlar().then((controller) => controllers.push(controller)),
      fetchCategories().then((controller) => controllers.push(controller)),
      fetchServiceFee().then((controller) => controllers.push(controller)),
    ])
      .then(() => setLoading(false))
      .catch((err) => {
        setLoading(false);
        setError(`Ma‘lumotlarni yuklashda xatolik yuz berdi: ${handleApiError(err, "Номаълум хатолик.")}`);
      });

    return () => {
      socket.off("connect");
      socket.off("reconnect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("order_created");
      socket.off("order_updated");
      socket.off("orderItemStatusUpdated");
      socket.off("order_deleted");
      socket.disconnect();
      controllers.forEach((controller) => controller.abort());
    };
  }, [token, navigate]);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error]);

  const filteredOrders = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders
      .filter((order) => {
        const orderId = order.id ? order.id.toString() : "";
        const phone = order.carrierNumber ? order.carrierNumber.toLowerCase() : "";
        const products = order.orderItems?.map((item) => item.product?.name?.toLowerCase() || "") || [];
        return orderId.includes(query) || phone.includes(query) || products.some((name) => name.includes(query));
      })
      .sort((a, b) => {
        const statusPriority = {
          READY: 1,
          COOKING: 2,
          PENDING: 3,
        };
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [orders, searchQuery]);

  const filteredTaomlar = React.useMemo(() => {
    return selectedCategory
      ? taomlar
          .filter(
            (taom) =>
              taom.categoryId &&
              taom.categoryId === categories.find((cat) => cat.name === selectedCategory)?.id
          )
          .sort((a, b) => a.id - b.id)
      : taomlar.sort((a, b) => a.id - b.id);
  }, [selectedCategory, taomlar, categories]);

  const clearCart = () => {
    setCart([]);
    setOrderDescriptions({});
  };

  const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.count, 0);
  const totalWithServiceFee = totalPrice + Number(serviceFee);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="spinner">Юкланмоқда...</div>
      </div>
    );
  }

  return (
    <section className="content-section">
      {(successMsg || error) && (
        <div className={successMsg ? "success-message" : "error-message"}>
          {successMsg || error}
          <button
            className="message-close"
            onClick={() => {
              setSuccessMsg(null);
              setError(null);
            }}
            aria-label="Хабарни ёпиш"
          >
            ×
          </button>
        </div>
      )}
      <div className="order-layout">
        <div className="tables-column">
          <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Truck size={32} /> Барча доставка буюртмалари
          </h3>
          <div className="search-container">
            <Search size={18} />
            <input
              type="text"
              placeholder="ID, телефон рақами ёки маҳсулот бўйича қидириш"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Буюртмаларни қидириш"
              style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          {filteredOrders.length === 0 ? (
            <p>Доставка буюртмалари йўқ</p>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) =>
                order.carrierNumber && (
                  <div
                    key={order.id}
                    className={`order-item ${order.status === "READY" ? "ready" : order.status === "COOKING" ? "cooking" : "pending"} ${order.isDeleting ? "deleting" : ""}`}
                  >
                    <div className="order-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" }}>
                        <span className="order-id">
                          <Hash size={18} /> ID: {order.id} (
                          {order.status === "PENDING" ? "КУТИЛМОҚДА" : order.status === "COOKING" ? "ТАЙЁРЛАНМОҚДА" : "ТАЙЁР"})
                        </span>
                        <div className="order-actions">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => {
                              setOrderToEdit(order);
                              setEditModal(true);
                            }}
                            aria-label={`Буюртма ${order.id} ни таҳрирлаш`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteOrder(order.id)}
                            aria-label={`Буюртма ${order.id} ни ўчириш`}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="order-details">
                      <div className="order-info">
                        <Phone size={18} />
                        <span>{order.carrierNumber}</span>
                      </div>
                      <div className="order-info">
                        <Package size={18} />
                        <ul style={{ color: "black" }}>
                          {order.orderItems?.map((item) => {
                            if (!item?.product) return null;
                            const itemPrice = parseFloat(item.product.price) || 0;
                            const itemCount = parseInt(item.count) || 0;
                            const itemTotal = itemPrice * itemCount;
                            return (
                              <li style={{ listStyle: "none" }} key={item.product.id} className={`order-item-status ${item.status.toLowerCase()}`}>
                                <div style={{ color: "#fff" }} className="item-details">
                                  {item.product.name} x {itemCount} ({formatPrice(itemTotal)})
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="order-info">
                        <DollarSign size={18} />
                        <strong>{formatPrice(order.totalPrice)}</strong>
                      </div>
                      <div className="order-info">
                        <Calendar size={18} />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      {order.status === "READY" && (
                        <button
                          className="action-btn print-pay-btn"
                          onClick={() => debouncedHandleCloseAndPrint(order)}
                          disabled={isPrinting}
                          aria-label={`Буюртма ${order.id} ни тўлаш ва чоп этиш`}
                        >
                          <Printer size={16} /> {isPrinting ? "Чоп этилмоқда..." : "Тўлаш ва чоп этиш"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="cart-column">
          <h3>Буюртма савати</h3>
          <table className="basket-table">
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
                    <td>{item.count}</td>
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
          <div className="cart-totals">
            <p>Жами: {formatPrice(totalPrice)}</p>
          </div>
          <div className="cart-actions">
            <button
              className="clear-cart-btn"
              onClick={clearCart}
              disabled={cart.length === 0}
              aria-label="Саватни тозалаш"
            >
              <Trash size={16} /> Саватни тозалаш
            </button>
            <button
              className="confirm-order-btn"
              disabled={cart.length === 0 || isConfirming}
              onClick={() => setShowModal(true)}
              aria-label="Буюртмани расмийлаштириш"
            >
              <ShoppingCart size={16} /> Буюртмани расмийлаштириш
            </button>
          </div>
        </div>

        <div className="products-column">
          <div className="category-buttons">
            {categories.length > 0 ? (
              categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.name ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category.name)}
                  aria-label={`Категория: ${category.name}`}
                >
                  {category.name}
                </button>
              ))
            ) : (
              <p>Категориялар топилмади</p>
            )}
          </div>
          <h3>Таомлар</h3>
          {filteredTaomlar.length === 0 ? (
            <p>Таомлар топилмади</p>
          ) : (
            <ul className="products-list">
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
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && !taom.isFinished && addToCart(taom)}
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
                      aria-label={`Очириш ${taom.name}`}
                      disabled={taom.isFinished}
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
                      aria-label={`Қўшиш ${taom.name}`}
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
      </div>

      {showModal && (
        <ModalBasket
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setOrderToEdit(null);
          }}
          onConfirm={debouncedHandleOrderConfirm}
          cart={cart}
          orderDescriptions={orderDescriptions}
          setOrderDescriptions={setOrderDescriptions}
          orderToEdit={orderToEdit}
          serviceFee={serviceFee}
          isConfirming={isConfirming}
        />
      )}

      {editModal && orderToEdit && (
        <EditOrderModal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          order={orderToEdit}
          products={taomlar}
          token={token}
          setOrders={setOrders}
          setCart={setCart}
          setSuccessMsg={setSuccessMsg}
          setError={setError}
          socket={socket}
          categories={categories}
          orderDescriptions={orderDescriptions}
          setOrderDescriptions={setOrderDescriptions}
        />
      )}

      {currentOrder && (
        <div style={{ display: "none" }}>
          <Receipt
            ref={receiptRef}
            order={{
              id: currentOrder.id,
              orderItems: currentOrder.orderItems,
              tableNumber: currentOrder.tableNumber,
              totalPrice: currentOrder.totalPrice,
              commission: currentOrder.commission,
              totalWithCommission: currentOrder.totalWithCommission,
              createdAt: currentOrder.createdAt,
            }}
          />
        </div>
      )}

      <style jsx>{`
        :root {
          --primary-color: #007bff;
          --success-color: #28a745;
          --danger-color: #dc3545;
          --neutral-light: #f8f9fa;
          --neutral-gray: #6c757d;
          --border-color: #ddd;
          --background-light: #fff;
          --text-dark: #333;
          --text-light: #666;
          --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          --border-radius: 8px;
          --transition: all 0.3s ease;
          --cooking-color: #fd7e14;
          --pending-color: rgb(165, 112, 112);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content,
        .modal1 {
          background: var(--background-light);
          padding: 20px;
          border-radius: var(--border-radius);
          max-width: min(90%, 500px);
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: var(--shadow);
        }

        .modal-header,
        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal__title {
          font-size: 1.5rem;
          font-weight: 500;
        }

        .modal-close,
        .modal__close-btn,
        .message-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--text-light);
          cursor: pointer;
          transition: var(--transition);
        }

        .modal-close:hover,
        .modal__close-btn:hover,
        .message-close:hover {
          color: var(--text-dark);
        }

        .add-place-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-group label {
          font-weight: 500;
        }

        .form-group input,
        .form-group select,
        .form-group textarea,
        .modal__select,
        .modal__input {
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color var(--transition);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus,
        .modal__select:focus,
        .modal__input:focus {
          border-color: var(--primary-color);
          outline: none;
        }

        .cart-item-description {
          margin-top: 10px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .cancel-btn,
        .submit-btn,
        .modal__add-btn,
        .modal__item-remove {
          padding: 10px 20px;
          border: none;
          border-radius: var(--border-radius);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
        }

        .cancel-btn {
          background-color: var(--danger-color);
          color: var(--background-light);
        }

        .cancel-btn:hover {
          background-color: #c82333;
        }

        .submit-btn,
        .modal__add-btn {
          background-color: var(--primary-color);
          color: var(--background-light);
        }

        .submit-btn:hover,
        .modal__add-btn:hover {
          background-color: #0056b3;
        }

        .submit-btn:disabled,
        .modal__add-btn:disabled,
        .print-pay-btn:disabled {
          background-color: var(--neutral-gray);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .modal__item-remove {
          background-color: var(--danger-color);
          color: var(--background-light);
        }

        .modal__item-remove:hover {
          background-color: #c82333;
        }

        .modal__content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal__items h3,
        .modal__add-section h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
        }

        .modal__items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .modal__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          transition: opacity 0.3s ease;
        }

        .modal__item-img {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
        }

        .modal__item-info {
          flex: 1;
        }

        .modal__item-name {
          font-weight: 500;
        }

        .modal__item-details {
          color: var(--text-light);
          font-size: 0.875rem;
        }

        .modal__empty {
          color: var(--text-light);
          text-align: center;
        }

        .modal__add-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .error-message,
        .success-message {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 20px;
          border-radius: var(--border-radius);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeInOut 3s ease-in-out;
        }

        .error-message {
          background-color: var(--danger-color);
          color: var(--background-light);
        }

        .success-message {
          background-color: var(--success-color);
          color: var(--background-light);
        }

        .saving-message {
          color: var(--primary-color);
          text-align: center;
        }

        .content-section {
          padding: 20px;
          margin-left: 30px;
        }

        .order-layout {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 768px) {
          .order-layout {
            grid-template-columns: 1fr;
          }
        }

        .tables-column,
        .cart-column,
        .products-column {
          padding: 20px;
          background-color: var(--background-light);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow);
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .search-container input {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color var(--transition);
        }

        .search-container input:focus {
          border-color: var(--primary-color);
          outline: none;
        }

        .orders-list {
          display: grid;
          gap: 15px;
        }

        .order-item {
          padding: 15px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background-color: var(--neutral-light);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .order-item.pending {
          background-color: var(--pending-color);
          color: var(--background-light);
        }

        .order-item.cooking {
          background-color: var(--cooking-color);
          color: var(--background-light);
        }

        .order-item.ready {
          background-color: var(--success-color);
          color: var(--background-light);
        }

        .order-item.deleting {
          opacity: 0;
          transform: translateY(-10px);
        }

        .order-item-status.pending {
          color: #856404;
        }

        .order-item-status.cooking {
          color: var(--cooking-color);
        }

        .order-item-status.ready {
          color: var(--success-color);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .order-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .action-btn {
          padding: 8px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background-color: var(--neutral-light);
          color: var(--text-dark);
          transition: var(--transition);
        }

        .edit-btn:hover {
          background-color: var(--primary-color);
          color: var(--background-light);
        }

        .delete-btn {
          background-color: var(--danger-color);
          color: var(--background-light);
        }

        .delete-btn:hover {
          background-color: #c82333;
        }

        .print-pay-btn {
          padding: 8px 16px;
          border-radius: var(--border-radius);
          background-color: #00a000;
          color: var(--background-light);
          display: flex;
          align-items: center;
          gap: 5px;
          border: none;
          cursor: pointer;
          transition: var(--transition);
        }

        .print-pay-btn:hover:not(:disabled) {
          background-color: #008000;
        }

        .order-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .order-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .order-items {
          list-style: none;
          padding: 0;
          margin: 0;
          flex: 1;
        }

        .order-item {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          padding: 5px 0;
        }

        .item-details {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
        }

        .basket-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .basket-table th,
        .basket-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .basket-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }

        .cart-totals {
          margin-bottom: 20px;
          font-size: 1rem;
        }

        .cart-totals p {
          margin: 5px 0;
        }

        .cart-actions {
          display: flex;
          gap: 10px;
          justify-content: space-between;
          margin-top: 20px;
        }

        .clear-cart-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background-color: var(--danger-color);
          color: var(--background-light);
          border: none;
          border-radius: var(--border-radius);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .clear-cart-btn:disabled {
          background-color: var(--neutral-gray);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .clear-cart-btn:hover:not(:disabled) {
          background-color: #c82333;
        }

        .confirm-order-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background-color: var(--success-color);
          color: var(--background-light);
          border: none;
          border-radius: var(--border-radius);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .confirm-order-btn:disabled {
          background-color: var(--neutral-gray);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .confirm-order-btn:hover:not(:disabled) {
          background-color: #218838;
        }

        .category-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .category-btn {
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--neutral-light);
          color: var(--text-dark);
          cursor: pointer;
          font-size: 0.875rem;
          transition: var(--transition);
        }

        .category-btn.active,
        .category-btn:hover {
          background-color: var(--primary-color);
          color: var(--background-light);
        }

        .products-list {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .product-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
        }

        .product-info {
          flex: 1;
          cursor: pointer;
        }

        .product-name {
          font-weight: 500;
        }

        .product-price {
          color: var(--text-light);
          margin-left: 5px;
        }

        .menu-card__controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .control-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--primary-color);
          color: var(--background-light);
          border: none;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
        }

        .control-btn:hover {
          background-color: #0056b3;
        }

        .control-btn:disabled {
          background-color: var(--neutral-gray);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .control-value {
          min-width: 20px;
          text-align: center;
          font-size: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--primary-color);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          10% {
            opacity: 1;
            transform: translateY(0);
          }
          90% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}