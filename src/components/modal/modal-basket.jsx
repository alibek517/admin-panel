import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "../styles/modalBasket.css";

const ModalBasket = ({
  cart,
  tables,
  userId,
  onClose,
  onConfirm,
  selectedTableId,
  isEditing,
}) => {
  const [carrierNumber, setCarrierNumber] = useState("+998");
  const [isTableOrder, setIsTableOrder] = useState(!!selectedTableId);
  const [tableId, setTableId] = useState(selectedTableId || "");
  const [orderDescriptions, setOrderDescriptions] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    setTableId(selectedTableId || "");
    const initialDescriptions = cart.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: "",
      }),
      {}
    );
    setOrderDescriptions(initialDescriptions);
  }, [selectedTableId, cart]);

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " so'm";
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.count,
    0
  );

  const handleDescriptionChange = (productId, value) => {
    setOrderDescriptions((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handleConfirm = () => {
    const phoneRegex = /^\+998\d{9}$/;
    if (!isTableOrder && !phoneRegex.test(carrierNumber)) {
      alert("Telefon raqami noto'g'ri formatda. Masalan: +998901234567");
      return;
    }

    const orderItems = cart.map((item) => ({
      productId: Number(item.id),
      count: Number(item.count),
      product: { price: Number(item.price), name: item.name },
      description: orderDescriptions[item.id] || "",
    }));

    onConfirm({
      isTableOrder,
      tableId: isTableOrder ? tableId : null,
      carrierNumber: isTableOrder ? null : carrierNumber,
      orderItems,
    });
  };

  return (
    <div className="overlay">
      <div className="basket-modal">
        <div className="modal__header">
          <h2 className="modal__title">Buyurtmani rasmiylashtirish</h2>
          <button className="modal__close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal__content">
          <div className="order-type">
            <label>
              Buyurtma turi:
              <select
                value={isTableOrder ? "table" : "delivery"}
                onChange={(e) => {
                  const isTable = e.target.value === "table";
                  setIsTableOrder(isTable);
                  if (!isTable) setTableId("");
                  else setCarrierNumber("+998");
                }}
                className="modal__select"
              >
                <option value="table">Stol uchun</option>
                <option value="delivery">Yetkazib berish</option>
              </select>
            </label>
          </div>

          {isTableOrder && (
            <div className="table-select">
              <label>
                Stol tanlang:
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="modal__select"
                >
                  <option value="">Stol tanlang</option>
                  {tables
                    .filter((table) => table.status === "empty" || table.id === selectedTableId)
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.number}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}

          {!isTableOrder && (
            <div className="carrier-number">
              <label>
                Telefon raqami:
                <input
                  type="text"
                  value={carrierNumber}
                  onChange={(e) => setCarrierNumber(e.target.value)}
                  className="modal__input"
                  placeholder="+998901234567"
                  ref={inputRef}
                />
              </label>
            </div>
          )}

          <div className="cart-items">
            <h3>Mahsulotlar tafsilotlari:</h3>
            {cart.length > 0 ? (
              cart.map((item) => (
                <div key={item.id} className="cart-item-description">
                  <span>
                    {item.name} (x{item.count})
                  </span>
                  <textarea
                    value={orderDescriptions[item.id] || ""}
                    onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
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
                    aria-label={`Ta'rif uchun ${item.name}`}
                  />
                </div>
              ))
            ) : (
              <p>Savatda mahsulotlar yo'q</p>
            )}
          </div>

          <table className="basket-table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Miqdor</th>
                <th>Narxi</th>
                <th>Summasi</th>
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
                  Jami:
                </td>
                <td className="basket-table__totall">
                  {formatPrice(totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="modal__footer">
          <button className="modal__cancel-btn" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className="modal__confirm-btn"
            onClick={handleConfirm}
            disabled={
              (isTableOrder && !tableId) ||
              (!isTableOrder && !carrierNumber) ||
              cart.length === 0
            }
          >
            Tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBasket;