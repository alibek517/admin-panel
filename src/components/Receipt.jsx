import { X } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import "./styles/Receipt.css"

const Receipt = React.forwardRef(({ order }, ref) => {
  const restaurantName = useSelector(
    (state) => state.restaurant.restaurantName || "Otabek kafe"
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
  const waiterName = order.user?.name?.length > 14 ? order.user.name.slice(0, 14) + "..." : order.user?.name ?? "Admin";
  const tableOrPhone = order.tableNumber?.length > 13 ? order.tableNumber.slice(0, 20) : order.tableNumber || "Бу стол йук";

  const formatDateTime = (date) => {
    const d = new Date(date || Date.now());
    const pad = (num) => String(num).padStart(2, '0');
    return {
      date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  };

  // Group orderItems by product name and sum their counts
  const groupedItems = order.orderItems?.filter(item => item.product).reduce((acc, item) => {
    const productName = item.product.name || "Топилмади";
    const existingItem = acc.find(grouped => grouped.productName === productName);
    if (existingItem) {
      existingItem.count += item.count;
      existingItem.totalPrice = existingItem.count * (item.product.price || 0);
    } else {
      acc.push({
        productName,
        count: item.count,
        price: item.product.price || 0,
        totalPrice: (item.product.price || 0) * item.count
      });
    }
    return acc;
  }, []) || [];

  return (
    <div className="asdfg">
      <div ref={ref} className="ashrt">
        <div className="aqwerty">
          <h2 className="kiuyfd">
            {restaurantName}
          </h2>
        </div>

        <div className="kjhgdrxs">
          <p className="ujhgfty">
            Число: {formatDateTime(order.createdAt).date} <pre style={{display:"contents"}}>  </pre> От: {formatDateTime(order.createdAt).time} <pre style={{display:"contents"}}>  </pre> До: {formatDateTime(order.endTime || Date.now()).time}
          </p>
        </div>

        <div className="jhgkiug">
          <p className="knjhjghfcgvbnju">
            <div><strong>{isDelivery ? "Телефон" : "Стол"}:</strong> <strong>{tableOrPhone}</strong></div><div> <strong>Официант:</strong> <strong>{waiterName}</strong></div>
          </p>
        </div>

        <div className="hytvrtfgyu">
          <table>
            <thead>
              <tr>
                <th className="jkhg">№</th>
                <th className="jkhghhuu">Наименование</th>
                <th className="jkiuygfy6tde">#</th>
                <th className="ufrd5dy">Цена</th>
                <th className="ihd56d7d">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.map((item, index) => (
                <tr key={index} className="table-row">
                  <td className="jkhg">{index + 1}</td>
                  <td className="jkhghhu">{item.productName}</td>
                  <td className="jkiuygfy6tde">{item.count}</td>
                  <td className="ufrd5dy">{formatPricee(item.price)}</td>
                  <td className="ihd56d7d">{formatPricee(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="jykfdi5diy">
          <p className="gftiyctycty">
            <strong>Услуга: {order.uslug || "0"}%</strong> 
          </p>
          <div className="kgjyjvyuxc">
            <span>Итого к оплате:</span>
            <strong>
              {formatPrice(Math.floor(order.totalWithCommission) || 0)}
            </strong>
          </div>
        </div>

        <div className="sdfghjgf">
          <p style={{color:'#000'}}>Тел: +998 99 737 17 10</p>
          <p style={{color:'#000'}}>Тел: +998 99 758 17 10</p>
        </div>

        <div className="uytre">
          <p>Раҳмат, биз сизни яна кутамиз!</p>
        </div>
      </div>
    </div>
  );
});

export default Receipt;