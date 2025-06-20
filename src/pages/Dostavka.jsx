import React, { useEffect, useState, useCallback, useRef } from "react";
import "./styles/Dostavka.css";
import axios from "axios";
import { Truck, Hash, Phone, Package, DollarSign, Calendar, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Receipt from "../components/Receipt.jsx";

export default function Dostavka() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const receiptRef = useRef();

  useEffect(() => {
    setLoading(true);
    axios
      .get("https://alikafecrm.uz/order", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      })
      .then((res) => {
        console.log("API response:", res.data);
        
        const deliveryOrders = res.data
          .filter((order) => order.carrierNumber && order.status === "READY")
          .map((order) => {
            console.log("Processing order:", order.id, order.orderItems);
            
            const totalPrice = order.orderItems.reduce((sum, item) => {
              if (!item || !item.product) {
                console.warn("Invalid item structure:", item);
                return sum;
              }
              
              const price = parseFloat(item.product.price) || 0;
              const count = parseInt(item.count) || 0;
              const itemTotal = price * count;
              
              console.log(`Item: ${item.product.name}, Price: ${price}, Count: ${count}, Item Total: ${itemTotal}`);
              
              return sum + itemTotal;
            }, 0);
            
            console.log(`Order ${order.id} - Total Price: ${totalPrice} (Sum of all items: ${order.orderItems.map(item => {
              const price = parseFloat(item.product?.price) || 0;
              const count = parseInt(item.count) || 0;  
              return `${price} * ${count} = ${price * count}`;
            }).join(' + ')})`);
            
            return {
              ...order,
              totalPrice: Math.round(totalPrice * 100) / 100,
            };
          });
          
        console.log("Processed delivery orders:", deliveryOrders);
        setOrders(deliveryOrders);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Буюртмаларни олишда хатолик:", err);
        setLoading(false);
      });
  }, []);

  const formatPrice = useCallback((price) => {
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    const priceStr = Math.round(numPrice).toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " сўм";
  }, []);

  const formatDate = useCallback((dateStr) => {
    try {
      return new Date(dateStr).toLocaleString("uz-UZ", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateStr;
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
        orderItems: order.orderItems,
        tableNumber: order.carrierNumber || "",
        totalPrice: order.totalPrice,
        commission: 0, // Assuming no commission for delivery orders, adjust if needed
        totalWithCommission: order.totalPrice,
        createdAt: order.createdAt,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!receiptRef.current) {
        console.error("Receipt ref is null");
        alert("Чоп этиш учун маълумотлар тайёр эмас.");
        return;
      }

      // Update order status to ARCHIVE
      await axios.put(
        `https://alikafecrm.uz/order/${order.id}`,
        { status: "ARCHIVE" },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        }
      );

      handlePrint();
      setOrders(orders.filter((o) => o.id !== order.id));
      setCurrentOrder(null);
    } catch (error) {
      console.error("Close and print error:", error);
      alert("Чоп этиш ёки статусни ўзгартиришда хатолик юз берди.");
      setCurrentOrder(null);
    }
  }, [handlePrint, orders]);

  return (
    <section style={{marginLeft: "30px"}} className="dostavka-section">
      <div className="dostavka-header">
        <h2>
          <Truck size={32} className="header-icon" /> Доставка
        </h2>
      </div>

      <div className="dostavka-content">
        <h3>Тайёр доставка буюртмалари</h3>
        {loading ? (
          <div className="dostavka-spinner">
            <div className="spinner-circle"></div>
          </div>
        ) : orders.length === 0 ? (
          <p className="no-orders">Тайёр доставка буюртмалари йўқ</p>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-id">
                    <Hash size={18} /> ID: {order.id}
                  </span>
                </div>
                <div className="order-details">
                  <div className="detail-item">
                    <Phone size={18} className="detail-icon" />
                    <span>{order.carrierNumber}</span>
                  </div>
                  <div className="detail-item">
                    <Package size={18} className="detail-icon" />
                    <ul className="product-list">
                      {order.orderItems.map((item) => {
                        if (!item || !item.product) return null;
                        
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
                    <strong style={{fontSize: "22px"}}>{formatPrice(order.totalPrice)}</strong>
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
