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
  const formatPricee = (price) => {
    return (
      price
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .trim()
    );
  };

  const isDelivery = order.tableNumber?.startsWith("+") || order.tableNumber === "N/A";

  return (
    <div>
      <style>{`
        /* Receipt.css */
.receipt {
  max-width: 200px;
  margin: auto;
  background: white;
  padding: 8px;
  border-radius: 4px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.receipt h2 {
  text-align: center;
  margin-bottom: 8px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.receipt p {
  margin: 4px 0;
  font-size: 10px;
  color: #333;
}

.items table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  border: 1px solid #333;
}

.items th,
.items td {
  border: 1px solid #333;
  padding: 4px;
  text-align: center;
}

.items tr:last-child td {
  border-bottom: none;
}

.thank {
  text-align: center;
  margin-top: 8px;
  margin-bottom: 16px;
  font-weight: bold;
  font-size: 10px;
  color: #333;
}
  @media print {
  .receipt {
    max-width: 100%;
    padding: 0;
    margin: 0;
    background: none;
    color: #000;
  }
  .receipt h2,
  .receipt p,
  .thank {
    color: #000 !important;
  }
  .items table,
  .items th,
  .items td {
    border: 1px solid #000;
  }
}.items tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
  .items th:nth-child(1),
.items td:nth-child(1) {
  width: 10%;
}
.items th:nth-child(2),
.items td:nth-child(2) {
  width: 40%;
}
.items th:nth-child(3),
.items td:nth-child(3) {
  width: 20%;
}
.items th:nth-child(4),
.items td:nth-child(4) {
  width: 15%;
}
.items th:nth-child(5),
.items td:nth-child(5) {
  width: 15%;
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
                <th style={{ width: "10%", fontSize: "9px" }}>№</th>
                <th style={{ width: "40%", fontSize: "9px" }}>Taom</th>
                <th style={{ width: "30%", fontSize: "9px" }}>Jami</th>
                <th style={{ width: "20%", fontSize: "9px" }}>Summasi</th>
                <th style={{ width: "30%", fontSize: "9px" }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontSize: "8px" }}>{index + 1}</td>
                  <td style={{ fontSize: "8px" }}>{item.product?.name || "Noma'lum taom"}</td>
                  <td style={{ fontSize: "8px" }}>
                    <X size={6} />
                    {item.count}
                  </td>
                  <td style={{ fontSize: "8px" }}>{formatPricee((item.product?.price || 0))}</td>
                  <td style={{ fontSize: "8px" }}>{formatPricee((item.product?.price || 0) * item.count)}</td>
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
      </div>
    </div>
  );
});

export default Receipt;