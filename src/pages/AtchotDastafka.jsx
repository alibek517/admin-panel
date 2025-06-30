import { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

const DeliveryReport = () => {
  // Function to get today's date in yyyy-mm-dd format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns yyyy-mm-dd
  };

  const [report, setReport] = useState([]);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate()); // Set default to today
  const [endDate, setEndDate] = useState(getTodayDate()); // Set default to today
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    const fetchDeliveryReport = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get('https://alikafecrm.uz/order', {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const orders = response.data.filter(
          order => order.carrierNumber && order.carrierNumber !== 'null'
        );
        setReport(orders);
        // Apply initial filter for today's date
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filtered = orders.filter(order => {
          const createdAt = new Date(order.createdAt);
          return createdAt >= start && createdAt <= end;
        });
        setFilteredOrders(filtered);
      } catch (error) {
        if (error.response) {
          setError(`APIдан маълумот олишда хато: ${error.response.status}`);
        } else if (error.request) {
          setError("APIга уланишда хато: Интернет алоқасини текширинг");
        } else {
          setError(`Номаълум хато: ${error.message}`);
        }
      }
    };

    fetchDeliveryReport();
  }, []);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      setFilteredOrders(report);
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = report.filter(order => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    setFilteredOrders(filtered);
  };

  const handleClear = () => {
    setStartDate(getTodayDate()); // Reset to today
    setEndDate(getTodayDate()); // Reset to today
    setFilteredOrders(report);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm(`Буюртма ID: ${orderId} ўчирилсинми?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://alikafecrm.uz/order/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const updatedOrders = report.filter(order => order.id !== orderId);
      setReport(updatedOrders);
      setFilteredOrders(updatedOrders.filter(
        order => order.carrierNumber && order.carrierNumber !== 'null'
      ));
      alert(`Буюртма ID: ${orderId} муваффақиятли ўчирилди`);
    } catch (error) {
      if (error.response) {
        setError(`Ўчиришда хато: ${error.response.status}`);
      } else if (error.request) {
        setError("APIга уланишда хато: Интернет алоқасини текширинг");
      } else {
        setError(`Номаълум хато: ${error.message}`);
      }
    }
  };

  const handleDeleteRange = async () => {
    if (!startDate || !endDate) {
      setError("Илтимос, бошланғич ва тугаш санасини танланг");
      return;
    }

    if (!window.confirm(`Танланган сана оралиғидаги (${startDate} 00:00 дан ${endDate} 23:59 гача) барча буюртмалар ўчирилсинми?`)) return;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const ordersToDelete = report.filter(order => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    try {
      const token = localStorage.getItem("token");
      for (const order of ordersToDelete) {
        await axios.delete(`https://alikafecrm.uz/order/${order.id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      }
      const updatedOrders = report.filter(order => {
        const createdAt = new Date(order.createdAt);
        return !(createdAt >= start && createdAt <= end);
      });
      setReport(updatedOrders);
      setFilteredOrders(updatedOrders.filter(
        order => order.carrierNumber && order.carrierNumber !== 'null'
      ));
      alert(`Сана оралиғидаги буюртмалар муваффақиятли ўчирилди`);
    } catch (error) {
      if (error.response) {
        setError(`Ўчиришда хато: ${error.response.status}`);
      } else if (error.request) {
        setError("APIга уланишда хато: Интернет алоқасини текширинг");
      } else {
        setError(`Номаълум хато: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('uz-Cyrl-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\//g, '.');
    } catch {
      return dateString || 'Номаълум';
    }
  };

  const calculateItemTotal = (item) => {
    const product = item.product || {};
    try {
      return parseInt(product.price || 0) * (item.count || 0);
    } catch {
      return 0;
    }
  };

  const calculateOrderTotal = (order) => {
    return (order.orderItems || []).reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${formatted} сўм`;
  };

  const totalAmount = filteredOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);

  const toggleOrderItems = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  return (
    <div className="report-container">
      <div
        style={{
          marginBottom: "20px",
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        <h3 style={{ marginBottom: "12px", color: "#495057" }}>
          Жамий ҳисобот
          {startDate && endDate && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: "normal",
                color: "#6c757d",
              }}
            >
              ({startDate.replace(/-/g, '.')} дан {endDate.replace(/-/g, '.')} гача)
            </span>
          )}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              backgroundColor: "white",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#28a745",
              }}
            >
              {filteredOrders.length}
            </div>
            <div style={{ color: "#6c757d", fontSize: "14px" }}>
              Буюртмалар сони
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              backgroundColor: "white",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#007bff",
              }}
            >
              {formatPrice(totalAmount)}
            </div>
            <div style={{ color: "#6c757d", fontSize: "14px" }}>
              Умумий сумма
            </div>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Бошланғич сана"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Тугаш сана"
        />
        <button onClick={handleFilter}>Қидириш</button>
        <button onClick={handleClear}>Тозалаш</button>
        <button onClick={handleDeleteRange}>Ўчириш</button>
      </div>

      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <p className="no-orders">Буюртмалар топилмади</p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="order-card">
                <p><strong>Буюртма ID:</strong> {order.id || 'Номаълум'}</p>
                <p><strong>Яратилган сана:</strong> {formatDate(order.createdAt)}</p>
                <p><strong>Телефон рақами:</strong> {order.carrierNumber || 'Номаълум'}</p>
                <p>
                  <strong>Буюртма элементлари:</strong>
                  <button
                    onClick={() => toggleOrderItems(order.id)}
                    style={{
                      marginLeft: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      verticalAlign: 'middle'
                    }}
                  >
                    {expandedOrders[order.id] ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </p>
                {expandedOrders[order.id] && (
                  <ul>
                    {(order.orderItems || []).map((item, idx) => (
                      <li key={idx}>
                        {item.product?.name || 'Номаълум'} - {formatPrice(calculateItemTotal(item))}
                      </li>
                    ))}
                  </ul>
                )}
                <p><strong>Умумий нарх:</strong> {formatPrice(calculateOrderTotal(order))}</p>
                <button className="delete-button" onClick={() => handleDelete(order.id)}>
                  Ўчириш
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .report-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .filter-section {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-section input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          flex: 1;
          min-width: 150px;
        }

        .filter-section button {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
        }

        .filter-section button:hover {
          background: #0056b3;
        }

        .filter-section button:nth-child(4) {
          background: #6c757d;
        }

        .filter-section button:nth-child(4):hover {
          background: #5a6268;
        }

        .filter-section button:nth-child(5) {
          background: #dc3545;
        }

        .filter-section button:nth-child(5):hover {
          background: #b02a37;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .order-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          transition: transform 0.2s;
        }

        .order-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
        }

        .order-card p {
          margin: 5px 0;
          font-size: 16px;
        }

        .order-card ul {
          margin: 10px 0 0 20px;
          padding: 0;
          list-style: none;
        }

        .order-card li {
          font-size: 15px;
          padding: 5px 0;
        }

        .delete-button {
          padding: 8px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 10px;
          transition: background 0.3s;
        }

        .delete-button:hover {
          background: #b02a37;
        }

        .error {
          color: #dc3545;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          margin: 20px 0;
        }

        .no-orders {
          text-align: center;
          color: #6c757d;
          font-size: 16px;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
};

export default DeliveryReport;