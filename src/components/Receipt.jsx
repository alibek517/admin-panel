import { X } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";

const Receipt = React.forwardRef(({ order }, ref) => {
  const restaurantName = useSelector(
    (state) => state.restaurant.restaurantName || "Unknown Restaurant"
  );

  // If order is not provided, render null
  if (!order) return null;

  const formatPrice = (price) => {
    return (
      price
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .trim() + " so'm"
    );
  };

  const formatPricee = (price) => {
    return (
      price
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .trim()
    );
  };

  const isDelivery = order.tableNumber?.startsWith("+") || order.tableNumber === "N/A";

  const waiterName = order.user?.name ?? "Admin";

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <style>{`
        body {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        .receipt {
          width: 90%; 
          background: white;
          padding: 15px;
          display: flex;
  flex-direction: column;
          
          justify-content: center;
        }
        .receipt h2 {
          text-align: center;
          margin-bottom: 3px;
          color: #333;
          font-size: 8px;
        }
        .receipt p {
          margin: 2px 0;
          font-size: 6px;
        }
        .items table {
          width: 100%;
          border-collapse: collapse;
          font-size: 6px;
          border: 1px solid #000;
        }
        .items table td, .items table th {
          border: 1px solid #000;
          padding: 1px;
          text-align: center;
        }
        .thank {
          text-align: center;
          margin-top: 5px;
          margin-bottom: 20px;
          font-weight: bold;
          font-size: 6px;
        }
      `}</style>
      <div style={{ padding: "1px 20px" }} className="receipt" ref={ref}>
        <h2 style={{ fontSize: "20px", textAlign: "center", fontWeight: "bold", color: "#000" }}>
          {restaurantName}
        </h2>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "#000" }}>
          <strong>Число:</strong>{" "}
          {new Date(order.createdAt || Date.now()).toLocaleString("uz-UZ", {
            timeZone: "Asia/Tashkent",
          })}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <p style={{ fontSize: "12px", fontWeight: "bold", color: "#000" }}>
            <strong>{isDelivery ? "Телефон" : "Стол"}:</strong>{" "}
            {order.tableNumber || "Бу стол йук"}
          </p>
          <p style={{ fontSize: "12px", fontWeight: "bold", color: "#000" }}>
            <strong>Официант:</strong> {waiterName}
          </p>
        </div>
        <div className="items">
          <table border={1}>
            <thead>
              <tr>
                <th style={{ width: "10%", fontSize: "9px", fontWeight: "bold", color: "#000" }}>№</th>
                <th style={{ width: "40%", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
                  Наименование
                </th>
                <th style={{ width: "10%", fontSize: "9px", fontWeight: "bold", color: "#000" }}>#</th>
                <th style={{ width: "20%", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
                  Цена
                </th>
                <th style={{ width: "30%", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontSize: "8px", fontWeight: "bold", color: "#000" }}>{index + 1}</td>
                  <td style={{ fontSize: "8px", fontWeight: "bold", color: "#000" }}>
                    {item.product?.name || "Топилмади"}
                  </td>
                  <td style={{ fontSize: "8px", fontWeight: "bold", color: "#000" }}>
                    <X size={6} />
                    {item.count}
                  </td>
                  <td style={{ fontSize: "8px", fontWeight: "bold", color: "#000" }}>
                    {formatPricee(item.product?.price || 0)}
                  </td>
                  <td style={{ fontSize: "8px", fontWeight: "bold", color: "#000" }}>
                    {formatPricee((item.product?.price || 0) * item.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "#000" }}>
          <strong>Услуга:</strong> {order.uslug || "0"}%
        </p>
        <p style={{ fontSize: "10px", marginTop: "5px", fontWeight: "bold", color: "#000" }}>
          Итого к оплате:{" "}
          <strong style={{ fontSize: "10px", marginBottom: "3px", fontWeight: "bold", color: "#000" }}>
            <b>{formatPrice(Math.floor(order.totalWithCommission) || 0)}</b>
          </strong>
        </p>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "end" }}>
          <p style={{ fontSize: "10px", fontWeight: "bold", color: "#000" }}>
            Тел: +998 99 737 17 10
          </p>
          <p style={{ fontSize: "10px", fontWeight: "bold", color: "#000" }}>
            Тел: +998 99 758 17 10
          </p>
        </div>
        <p
          style={{ fontSize: "10px", textAlign: "center", fontWeight: "bold", color: "#000" }}
          className="thank"
        >
          Раҳмат, биз сизни яна кутамиз!
        </p>
      </div>
    </div>
  );
});

export default Receipt;