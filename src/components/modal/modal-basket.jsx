import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import "../styles/modalBasket.css";

const ModalBasket = ({
  cart,
  tables,
  userId,
  onClose,
  onConfirm,
  selectedTableId,
}) => {
  const [isTableOrder, setIsTableOrder] = useState(true);
  const [tableId, setTableId] = useState(selectedTableId || "");
  const [carrierNumber, setCarrierNumber] = useState("");

  useEffect(() => {
    setTableId(selectedTableId || "");
  }, [selectedTableId]);

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " so'm";
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.count,
    0
  );

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
                  else setCarrierNumber("");
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
                    .filter((table) => table.status === "empty")
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
                />
              </label>
            </div>
          )}

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
                <td className="basket-table__total">
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
              (!isTableOrder && !carrierNumber)
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