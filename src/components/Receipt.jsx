import { X } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";

const Receipt = React.forwardRef(({ order }, ref) => {
  const restaurantName = useSelector(
    (state) => state.restaurant.restaurantName
  );

  if (!order) return null;

  const formatPrice = (price) => {
    return (
      price
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .trim() + " so'm"
    );
  };

  // Determine if the order is for delivery based on tableNumber format
  const isDelivery = order.tableNumber?.startsWith("+") || order.tableNumber === "N/A";

  return (
    <div>
      <style>{`
        body {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        .receipt {
          max-width: 200px; 
          margin: auto;
          background: white;
          padding: 5px 6px;
          border-radius: 4px;
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
        .items table tr:last-child td {
          border-bottom: none;
        }
        .thank {
          text-align: center;
          margin-top: 5px;
          margin-bottom: 20px;
          font-weight: bold;
          font-size: 6px;
        }
      `}</style>
      <div className="receipt" ref={ref}>
        <h2 style={{ fontSize: "20px" }}>{restaurantName}</h2>
        <p style={{ fontSize: "12px" }}>
          <strong>Buyurtma raqami:</strong> {order.id}
        </p>
        <p style={{ fontSize: "12px" }}>
          <strong>{isDelivery ? "Telefon" : "Stol"}:</strong> {order.tableNumber || "N/A"}
        </p>
        <p style={{ fontSize: "12px" }}>
          <strong>Sana:</strong>{" "}
          {new Date(order.createdAt || Date.now()).toLocaleString("uz-UZ", {
            timeZone: "Asia/Tashkent",
          })}
        </p>
        <div className="items">
          <table>
            <thead>
              <tr>
                <th style={{ width: "10%", fontSize: "10px" }}>№</th>
                <th style={{ width: "40%", fontSize: "10px" }}>Taom</th>
                <th style={{ width: "20%", fontSize: "10px" }}>Soni</th>
                <th style={{ width: "30%", fontSize: "10px" }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontSize: "10px" }}>{index + 1}</td>
                  <td style={{ fontSize: "10px" }}>{item.product?.name || "Noma'lum taom"}</td>
                  <td style={{ fontSize: "10px" }}>
                    <X size={6} />
                    {item.count}
                  </td>
                  <td style={{ fontSize: "10px" }}>{formatPrice((item.product?.price || 0) * item.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "10px" }}>
          Umumiy tolov:{" "}
          <strong style={{ fontSize: "10px", marginBottom: "3px" }}>
            {formatPrice(order.totalWithCommission || 0)}
          </strong>
        </p>
        <p style={{ fontSize: "10px" }} className="thank">Rahmat, biz sizni yana kutamiz!</p>
        <p>.</p>
      </div>
    </div>
  );
});

export default Receipt;