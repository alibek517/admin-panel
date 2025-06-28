import React, { useEffect, useState, useCallback, useRef } from "react";
import "./styles/Dostavka.css";
import axios from "axios";
import { Truck, Hash, Phone, Package, DollarSign, Calendar, Printer, ShoppingCart, Search } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Receipt from "../components/Receipt.jsx";

// Reusable Modal Component for Order Confirmation
const ModalBasket = ({ isOpen, onClose, onConfirm, cart }) => {
  const [carrierNumber, setCarrierNumber] = useState("+998");
  const inputRef = useRef(null);

  // Ensure input always starts with +998
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.startsWith("+998")) {
      setCarrierNumber(value);
    } else {
      setCarrierNumber("+998" + value.replace(/^\+998/, ""));
    }
  };

  // Prevent deleting +998
  const handleKeyDown = (e) => {
    const cursorPosition = inputRef.current.selectionStart;
    if (e.key === "Backspace" && cursorPosition <= 4) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      orderItems: cart,
      carrierNumber: carrierNumber, // Always send as string, e.g., "+998" or "+998985236547"
    });
    setCarrierNumber("+998");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Доставка буюртмасини расмийлаштириш</h3>
          <button
            className="modal-close"
            onClick={() => {
              setCarrierNumber("+998");
              onClose();
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
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
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setCarrierNumber("+998");
                onClose();
              }}
              className="cancel-btn"
            >
              Бекор қилиш
            </button>
            <button type="submit" className="submit-btn">
              Буюртмани тасдиқлаш
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Dostavka() {
  const [orders, setOrders] = useState([]);
  const [taomlar, setTaomlar] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(""); // Default to empty, set to first category after fetch
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const receiptRef = useRef();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      alert("Илтимос, тизимга киринг.");
      window.location.href = "/login";
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchOrders = async () => {
      try {
        const res = await axios.get("https://alikafecrm.uz/order", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const deliveryOrders = Array.isArray(res.data)
          ? res.data
              .filter((order) => order.status === "READY")
              .map((order) => {
                const totalPrice = order.orderItems?.reduce((sum, item) => {
                  if (!item?.product) {
                    console.warn("Invalid item structure:", item);
                    return sum;
                  }
                  const price = parseFloat(item.product.price) || 0;
                  const count = parseInt(item.count) || 0;
                  return sum + price * count;
                }, 0) || 0;
                return {
                  ...order,
                  totalPrice: Math.round(totalPrice * 100) / 100,
                };
              })
          : [];
        setOrders(deliveryOrders);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching orders:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    };

    const fetchTaomlar = async () => {
      try {
        const res = await axios.get("https://alikafecrm.uz/product", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        setTaomlar(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching products:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await axios.get("https://alikafecrm.uz/category", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const fetchedCategories = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setCategories(fetchedCategories);
        // Set default category to the first one if available
        if (fetchedCategories.length > 0) {
          setSelectedCategory(fetchedCategories[0].name);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching categories:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    };

    Promise.all([fetchOrders(), fetchTaomlar(), fetchCategories()])
      .then(() => setLoading(false))
      .catch((err) => {
        console.error("Error in initial fetch:", err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const formatPrice = useCallback((price) => {
    const numPrice = typeof price === "number" ? price : parseFloat(price) || 0;
    return Math.round(numPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм";
  }, []);

  const formatDate = useCallback((dateStr) => {
    try {
      return new Date(dateStr).toLocaleString("uz-UZ", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateStr || "N/A";
    }
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handleCloseAndPrint = useCallback(async (order) => {
    if (!order?.id) {
      alert("Буюртма маълумотлари топилмади.");
      return;
    }
    try {
      setCurrentOrder({
        id: order.id,
        orderItems: order.orderItems || [],
        tableNumber: order.carrierNumber || "",
        totalPrice: order.totalPrice || 0,
        commission: 0,
        totalWithCommission: order.totalPrice || 0,
        createdAt: order.createdAt || new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!receiptRef.current) {
        console.error("Receipt ref is null");
        alert("Чоп этиш учун маълумотлар тайёр эмас.");
        return;
      }

      await axios.put(
        `https://alikafecrm.uz/order/${order.id}`,
        { status: "ARCHIVE" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      handlePrint();
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setCurrentOrder(null);
    } catch (error) {
      console.error("Close and print error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      alert("Чоп этиш ёки статусни ўзгартиришда хатолик юз берди.");
      setCurrentOrder(null);
    }
  }, [token, handlePrint]);

  const addToCart = (taom) => {
    if (!taom?.id || !taom?.price) return;
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
    if (!taom?.id) return;
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === taom.id ? { ...item, count: item.count - 1 } : item
        )
        .filter((item) => item.count > 0)
    );
  };

  const handleOrderConfirm = async (orderData) => {
    try {
      const products = orderData.orderItems
        .filter((item) => item?.id && item.count > 0)
        .map((item) => ({
          productId: Number(item.id),
          count: Number(item.count),
        }));

      if (!products.length) {
        alert("Буюртмада камида битта маҳсулот бўлиши керак.");
        setShowModal(false);
        return;
      }

      const totalPrice = orderData.orderItems.reduce((acc, item) => {
        const price = Number(item?.price) || 0;
        return acc + price * item.count;
      }, 0);

      const currentUser = JSON.parse(localStorage.getItem("user")) || {};
      const userId = Number(currentUser.id);

      if (!userId) {
        alert("Фойдаланувчи ID топилмади. Илтимос, қайта киринг.");
        setShowModal(false);
        return;
      }

      const body = {
        products,
        totalPrice: Number(totalPrice),
        userId,
        carrierNumber: orderData.carrierNumber, // Always include, e.g., "+998" or "+998985236547"
      };

      console.log("Order payload:", body);

      const response = await axios.post("https://alikafecrm.uz/order", body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API response:", {
        status: response.status,
        data: response.data,
      });

      if (response.status === 200 || response.status === 201) {
        setCart([]);
        setSuccessMsg("Доставка буюртмаси муваффақиятли яратилди!");

        const res = await axios.get("https://alikafecrm.uz/order", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const deliveryOrders = Array.isArray(res.data)
          ? res.data
              .filter((order) => order.status === "READY")
              .map((order) => {
                const totalPrice = order.orderItems?.reduce((sum, item) => {
                  if (!item?.product) return sum;
                  const price = parseFloat(item.product.price) || 0;
                  const count = parseInt(item.count) || 0;
                  return sum + price * count;
                }, 0) || 0;
                return {
                  ...order,
                  totalPrice: Math.round(totalPrice * 100) / 100,
                };
              })
          : [];
        setOrders(deliveryOrders);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (err) {
      console.error("Order creation error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      alert(
        `Хатолик: ${err.response?.data?.message || "Буюртма яратишда хатолик юз берди."}`
      );
    } finally {
      setShowModal(false);
    }
  };

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const orderId = order.id ? order.id.toString() : "";
    const phone = order.carrierNumber ? order.carrierNumber.toLowerCase() : "";
    return orderId.includes(query) || phone.includes(query);
  });

  const totalPrice = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.count,
    0
  );

  // Filter products by selected category
  const filteredTaomlar = taomlar.filter(
    (taom) =>
      taom.categoryId &&
      taom.categoryId === categories.find((cat) => cat.name === selectedCategory)?.id
  );

  return (
    <section style={{ marginLeft: "30px" }} className="dostavka-section">
      {successMsg && <div className="success-message">{successMsg}</div>}
      <div className="dostavka-header">
        <h2>
          <Truck size={32} className="header-icon" /> Доставка
        </h2>
      </div>

      <div className="dostavka-content">
        <div className="order-layout">
          <div className="orders-column">
            <h3>Тайёр доставка буюртмалари</h3>
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="ID ёки телефон рақами бўйича қидириш"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            {loading ? (
              <div className="dostavka-spinner">
                <div className="spinner-circle"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="no-orders">Тайёр доставка буюртмалари йўқ</p>
            ) : (
              <div className="orders-grid">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">
                        <Hash size={18} /> ID: {order.id}
                      </span>
                    </div>
                    <div className="order-details">
                      <div className="detail-item">
                        <Phone size={18} className="detail-icon" />
                        <span>{order.carrierNumber || "Рақам киритилмаган"}</span>
                      </div>
                      <div className="detail-item">
                        <Package size={18} className="detail-icon" />
                        <ul className="product-list">
                          {order.orderItems?.map((item) => {
                            if (!item?.product) return null;
                            const itemPrice = parseFloat(item.product.price) || 0;
                            const itemCount = parseInt(item.count) || 0;
                            const itemTotal = itemPrice * itemCount;
                            return (
                              <li key={item.id} className="product-item">
                                <div className="product-info">
                                  {item.product.name} x {itemCount} (
                                  {formatPrice(itemTotal)})
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="detail-item">
                        <DollarSign size={18} className="detail-icon" />
                        <strong style={{ fontSize: "22px" }}>
                          {formatPrice(order.totalPrice)}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <Calendar size={18} className="detail-icon" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="detail-item">
                        <button
                          className="order-card__print-btn"
                          onClick={() => handleCloseAndPrint(order)}
                        >
                          <Printer size={16} /> Тўлаш ва чоп этиш
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <td>{item.name || "Noma'lum"}</td>
                      <td>{item.count}</td>
                      <td>{formatPrice(item.price)}</td>
                      <td>{formatPrice(item.price * item.count)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">Саватда таомлар йўқ</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="basket-table__total-label">
                    Жами:
                  </td>
                  <td className="basket-table__total">{formatPrice(totalPrice)}</td>
                </tr>
              </tfoot>
            </table>
            <button
              className="confirm-order-btn"
              disabled={cart.length === 0}
              onClick={() => setShowModal(true)}
            >
              <ShoppingCart size={16} /> Буюртмани расмийлаштириш
            </button>
          </div>

          <div className="products-column">
            <div className="category-buttons">
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
        </div>
      </div>

      {showModal && (
        <ModalBasket
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleOrderConfirm}
          cart={cart}
        />
      )}

      <div style={{ display: "none" }}>
        <Receipt
          ref={receiptRef}
          order={
            currentOrder
              ? {
                  id: currentOrder.id,
                  orderItems: currentOrder.orderItems,
                  tableNumber: currentOrder.tableNumber,
                  totalPrice: currentOrder.totalPrice,
                  commission: currentOrder.commission,
                  totalWithCommission: currentOrder.totalWithCommission,
                  createdAt: currentOrder.createdAt,
                }
              : {
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
    </section>
  );
}