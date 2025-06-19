import React, { useEffect, useState } from "react";
import "./styles/taomlar.css";
import axios from "axios";
import { Clock, ShoppingCart } from "lucide-react";
import ModalBasket from "../components/modal/modal-basket";

export default function Taomlar() {
  const [taomlar, setTaomlar] = useState([]);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("menu");
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);

  useEffect(() => {
    axios
      .get("https://alikafecrm.uz/tables", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setTables(res.data.data);
      })
      .catch((err) => console.error("Столларни юклашда хатолик:", err));
  }, []);

  const fetchTaomlar = () => {
    setLoading(true);
    axios
      .get("https://alikafecrm.uz/product", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setTaomlar(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Таомларни олишда хатолик:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTaomlar();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const time = setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
      return () => clearTimeout(time);
    }
  }, [successMsg]);

  const addToCart = (taom) => {
    setCart((prev) => {
      const foundTaom = prev.find((item) => item.id === taom.id);
      if (foundTaom) {
        return prev.map((item) =>
          item.id === taom.id ? { ...item, count: item.count + 1 } : item
        );
      } else {
        return [...prev, { ...taom, count: 1 }];
      }
    });
  };

  const removeFromCart = (taom) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.id === taom.id ? { ...item, count: item.count - 1 } : item
        )
        .filter((item) => item.count > 0);
    });
  };

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser?.id;

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " сўм";
  };

  const statusMapToFrontend = { empty: "Бўш", busy: "Банд" };

  const filteredTables = tables.filter((table) => table.status === "empty");

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.count,
    0
  );

  const handleOrderConfirm = (orderData) => {
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
      console.log(localStorage.getItem("token"));
      return;
    }

    const body = {
      products,
      tableId,
      totalPrice: Number(totalPrice),
      userId: Number(userId),
      carrierNumber,
    };

    console.log("Sending order:", body);

    if (orderData.isTableOrder && !tableId) {
      alert("Илтимос, стол танланг.");
      return;
    }

    if (!orderData.isTableOrder && !carrierNumber) {
      alert("Илтимос, телефон рақамини киритинг.");
      return;
    }

    axios
      .post("https://alikafecrm.uz/order", body, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        console.log("Order created:", res.data);
        setCart([]);
        setSelectedTableId(null);
        setSuccessMsg("Буюртма муваффақиятли юборилди!");

        if (orderData.isTableOrder && tableId) {
          axios
            .patch(
              `https://alikafecrm.uz/tables/${tableId}`,
              { status: "busy" },
              {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
              }
            )
            .then((res) => {
              setTables((prev) =>
                prev.map((table) =>
                  table.id === tableId ? { ...table, status: "busy" } : table
                )
              );
            })
            .catch((err) => {
              console.error("Стол ҳолатини янгилашда хатолик:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Хатолик:", err);
        let errorMessage = "Буюртма юборишда хатолик юз берди.";
        if (err.response) {
          console.log("Status:", err.response.status);
          console.log("Data:", err.response.data);
          errorMessage = err.response.data.message || errorMessage;
        }
        alert(`Хатолик: ${errorMessage}`);
      })
      .finally(() => {
        setShowModal(false);
      });
  };

  return (
    <section className="content-section">
      <div className="section-header">
        <h2>Меню</h2>
        <div className="tab-controls">
          <button
            className={view === "menu" ? "tab-button active" : "tab-button"}
            onClick={() => setView("menu")}
          >
            Таомлар менюси
          </button>
          <button
            className={view === "order" ? "tab-button active" : "tab-button"}
            onClick={() => setView("order")}
          >
            Заказ яратиш
          </button>
        </div>
      </div>

      {view === "menu" && (
        <div className="menu-grid">
          {loading ? (
            <div className="spinner" />
          ) : (
            taomlar.map((taom) => (
              <div key={taom.id} className="menu-card">
                <div className="menu-image">
                  <img
                    src={`https://alikafecrm.uz${taom.image}`}
                    alt={taom.name}
                  />
                </div>
                <div className="menu-details">
                  <h3>{taom.name}</h3>
                  <span className="category">{taom.category?.name}</span>
                  <div className="menu-meta">
                    <span className="prep-time">
                      <Clock size={16} />
                      {taom.date ? `${taom.date} мин` : "Вақти йўқ"}
                    </span>
                    <span className="price">{formatPrice(taom.price)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === "order" && (
        <div className="order-layout">
          <div className="tables-column">
            <h3>Столлар (Бўш)</h3>
            <ul className="tables-list">
              {filteredTables.length === 0 ? (
                <p>Бўш столлар йўқ</p>
              ) : (
                filteredTables.map((table) => (
                  <li
                    key={table.id}
                    className={`table-item ${
                      selectedTableId === table.id ? "selected" : ""
                    } ${table.status === "busy" ? "band" : "bosh"}`}
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    <span>{table.name} - {table.number}</span>
                    <span className="table-status">
                      {statusMapToFrontend[table.status] || table.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="cart-column">
            <h3>Буюртма савати</h3>
            {selectedTableId ? (
              <p className="selected-table">
                Танланган стол:{" "}
                {tables.find((t) => t.id === selectedTableId)?.name} -{" "}
                {tables.find((t) => t.id === selectedTableId)?.number}
              </p>
            ) : (
              <p>Илтимос, стол танланг ёки етказиб беришни танланг.</p>
            )}
            {cart.length === 0 ? (
              <p>Ҳозирча буюртма йўқ</p>
            ) : (
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
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.count}</td>
                      <td>{formatPrice(item.price)}</td>
                      <td>{formatPrice(item.price * item.count)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="basket-table__total-label">
                      Жами:
                    </td>
                    <td className="basket-table__total">
                      {formatPrice(totalPrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
            <button
              className="confirm-order-btn"
              disabled={cart.length === 0}
              onClick={() => setShowModal(true)}
            >
              Буюртмани расмийлаштириш
            </button>
          </div>

          <div className="products-column">
            <h3>Таомлар</h3>
            <ul className="products-list">
              {loading ? (
                <div className="spinner" />
              ) : (
                taomlar.map((taom) => (
                  <li key={taom.id} className="product-item">
                    <div className="product-info">
                      <span className="product-name">{taom.name} </span>
                      <span className="product-price">
                        {formatPrice(taom.price)}
                      </span>
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
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {showModal && (
        <ModalBasket
          cart={cart}
          tables={tables}
          userId={userId}
          onClose={() => setShowModal(false)}
          onConfirm={handleOrderConfirm}
          selectedTableId={selectedTableId}
        />
      )}
      {successMsg && <div className="success-message">{successMsg}</div>}
    </section>
  );
}