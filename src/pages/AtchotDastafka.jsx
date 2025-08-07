import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Search, Calendar } from 'lucide-react';

const DeliveryReport = () => {
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [report, setReport] = useState([]);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [searchInput, setSearchInput] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveryReport = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Токен топилмади");
        }
        const response = await axios.get('http://192.168.1.8:4356/order', {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const orders = response.data
          .filter(order => order.carrierNumber && order.carrierNumber !== 'null')
          .map(order => ({
            ...order,
            orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
          }));
        setReport(orders);
        applyFilter(orders, startDate, endDate, searchInput);
      } catch (error) {
        if (error.response) {
          setError(`APIдан маълумот олишда хато: ${error.response.status} - ${error.response.data?.message || 'Хато юз берди'}`);
        } else if (error.request) {
          setError("APIга уланишда хато: Интернет алоқасини текширинг");
        } else {
          setError(`Номаълум хато: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryReport();
  }, []);

  const calculateItemTotal = (item) => {
    const product = item.product || {};
    try {
      const price = parseInt(product.price || 0);
      const count = item.count || 0;
      return { total: price * count, count: count };
    } catch {
      return { total: 0, count: 0 };
    }
  };

  const calculateOrderTotal = (order) => {
    return (order.orderItems || []).reduce(
      (acc, item) => {
        const { total, count } = calculateItemTotal(item);
        return {
          total: acc.total + total,
          count: acc.count + count,
        };
      },
      { total: 0, count: 0 }
    );
  };

  const applyFilter = (orders, start, end, search) => {
    let filtered = [...orders];

    if (start && end) {
      const startDateTime = new Date(start);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(end);
      endDateTime.setHours(23, 59, 59, 999);

      filtered = filtered.filter(order => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= startDateTime && createdAt <= endDateTime;
      });
    }

    if (search) {
      filtered = filtered.filter(order =>
        order.id.toString().includes(search) ||
        (order.carrierNumber && order.carrierNumber.toLowerCase().includes(search.toLowerCase()))
      );
    }

    setFilteredOrders(filtered);
  };

  const handleFilter = () => {
    applyFilter(report, startDate, endDate, searchInput);
  };

  const handleClear = () => {
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setSearchInput('');
    setFilteredOrders(report);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm(`Буюртма ID: ${orderId} ўчирилсинми?`)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Токен топилмади");
      }
      await axios.delete(`http://192.168.1.8:4356/order/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const updatedOrders = report.filter(order => order.id !== orderId);
      setReport(updatedOrders);
      applyFilter(updatedOrders, startDate, endDate, searchInput);
      alert(`Буюртма ID: ${orderId} муваффақиятли ўчирилди`);
    } catch (error) {
      if (error.response) {
        setError(`Ўчиришда хато: ${error.response.status} - ${error.response.data?.message || 'Хато юз берди'}`);
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
      if (!token) {
        throw new Error("Токен топилмади");
      }
      for (const order of ordersToDelete) {
        await axios.delete(`http://192.168.1.8:4356/order/${order.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
      const updatedOrders = report.filter(order => {
        const createdAt = new Date(order.createdAt);
        return !(createdAt >= start && createdAt <= end);
      });
      setReport(updatedOrders);
      applyFilter(updatedOrders, startDate, endDate, searchInput);
      alert(`Сана оралиғидаги буюртмалар муваффақиятли ўчирилди`);
    } catch (error) {
      if (error.response) {
        setError(`Ўчиришда хато: ${error.response.status} - ${error.response.data?.message || 'Хато юз берди'}`);
      } else if (error.request) {
        setError("APIга уланишда хато: Интернет алоқасини текширинг");
      } else {
        setError(`Номаълум хато: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null') {
      return 'Заказ яакунланмаган';
    }
    try {
      return new Date(dateString).toLocaleString('uz-Cyrl-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\//g, '.');
    } catch {
      return 'Номаълум';
    }
  };

  const formatPrice = (price) => {
    try {
      const priceStr = price.toString();
      const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return `${formatted} сўм`;
    } catch {
      return '0 сўм';
    }
  };

  const totalAmount = filteredOrders.reduce((sum, order) => sum + calculateOrderTotal(order).total, 0);
  const totalItems = filteredOrders.reduce((sum, order) => sum + calculateOrderTotal(order).count, 0);

  const toggleOrderItems = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  return (
    <div className="app-container">
      <header>
        <h1 className="order-history__title">Етказиб бериш ҳисоботи</h1>
      </header>
      <div className="order-history">
        {loading ? (
          <div className="no-results">
            <p>Юкланмоқда...</p>
          </div>
        ) : error ? (
          <div className="no-results">
            <p>{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-results">
            <p>Буюртмалар топилмади</p>
          </div>
        ) : (
          <div>
            <div
              style={{
                marginBottom: "var(--space-4)",
                padding: "var(--space-4)",
                backgroundColor: "#f8f9fa",
                borderRadius: "var(--radius-md)",
                border: "1px solid #dee2e6",
              }}
            >
              <h3 style={{ marginBottom: "var(--space-3)", color: "#495057" }}>
                Жами ҳисобот
                {startDate && endDate && (
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "normal",
                      color: "#6c757d",
                    }}
                  >
                    ( {startDate.replace(/-/g, '.')} дан {endDate.replace(/-/g, '.')} гача )
                  </span>
                )}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "var(--space-3)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-3)",
                    backgroundColor: "white",
                    borderRadius: "var(--radius-md)",
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
                    padding: "var(--space-3)",
                    backgroundColor: "white",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#007bff",
                    }}
                  >
                    {totalItems} та
                  </div>
                  <div style={{ color: "#6c757d", fontSize: "14px" }}>
                    Умумий махсулотлар сони
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-3)",
                    backgroundColor: "white",
                    borderRadius: "var(--radius-md)",
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

            <div className="controls">
              <div className="search-container">
                <div className="search-input">
                  <Search className="icon" />
                  <input
                    type="text"
                    placeholder="ID ёки телефон рақами бўйича қидириш..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center" }} className="date-input">
                  <Calendar className="icon" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Бошланғич сана"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center" }} className="date-input">
                  <Calendar className="icon" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Тугаш сана"
                  />
                </div>
              </div>
              <div className="filter-buttons">
                <button onClick={handleFilter}>Қидириш</button>
                <button onClick={handleDeleteRange}>Ўчириш</button>
                <button className="latest" onClick={handleClear}>Тозалаш</button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Бошланғич сана</th>
                  <th>Якуний сана</th>
                  <th>Телефон рақами</th>
                  <th>Буюртма элементлари</th>
                  <th>Умумий нарх</th>
                  <th>Ҳаракат</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-results">
                      <p>Буюртмалар топилмади</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr>
                        <td>{order.id || 'Номаълум'}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{formatDate(order.endTime)}</td>
                        <td>{order.carrierNumber || 'Номаълум'}</td>
                        <td>
                          <Eye
                            className="food-icon"
                            onClick={() => toggleOrderItems(order.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>{formatPrice(calculateOrderTotal(order).total)}</td>
                        <td>
                          <button
                            className="delete-button"
                            onClick={() => handleDelete(order.id)}
                          >
                            Ўчириш
                          </button>
                        </td>
                      </tr>
                      {expandedOrders[order.id] && (
                        <tr>
                          <td colSpan="6" className="food-items">
                            {(order.orderItems || []).length > 0 ? (
                              order.orderItems.map((item, idx) => (
                                <div style={{width:'555px',display:'flex',alignItems:'center'}} key={idx}>
                                  <h3 style={{display:'inline'}}>{calculateItemTotal(item).count}</h3>-{item.product?.name || 'Номаълум'} - {formatPrice(calculateItemTotal(item).total)}
                                </div>
                              ))
                            ) : (
                              <div>Таомлар йўқ</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        :root {
          --primary: #2563eb;
          --primary-light: #dbeafe;
          --primary-dark: #1e40af;
          --accent: #f97316;
          --accent-light: #ffedd5;
          --success: #059669;
          --success-light: #d1fae5;
          --warning: #eab308;
          --warning-light: #fef9c3;
          --danger: #dc2626;
          --danger-light: #fee2e2;
          --info: #0891b2;
          --info-light: #cffafe;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
          --border-radius-sm: 6px;
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
          --border-radius-full: 9999px;
          --space-3: 12px;
          --space-4: 16px;
          --radius-md: 8px;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          margin: 0 auto;
          padding: 2rem;
        }

        header h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: var(--gray-900);
          letter-spacing: -0.025em;
        }

        .controls {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .search-container {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .search-input,
        .date-input {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-input input,
        .date-input input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-lg);
          font-size: 0.95rem;
          transition: var(--transition-base);
          color: var(--gray-800);
          background-color: white;
          box-shadow: var(--shadow-sm);
        }

        .search-input input:hover,
        .date-input input:hover {
          border-color: var(--gray-300);
        }

        .search-input input:focus,
        .date-input input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-light);
        }

        .search-input .icon,
        .date-input .icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          width: 1.25rem;
          height: 1.25rem;
          pointer-events: none;
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 0.5rem;
          background-color: white;
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-sm);
        }

        .filter-buttons button {
          padding: 0.75rem 1.25rem;
          border-radius: var(--border-radius-md);
          border: none;
          background-color: var(--gray-50);
          color: var(--gray-700);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: var(--transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .filter-buttons button:hover {
          background-color: var(--gray-100);
          color: var(--gray-900);
        }

        .filter-buttons button:nth-child(1) {
          background-color: var(--primary);
          color: white;
        }

        .filter-buttons button:nth-child(1):hover {
          background-color: var(--primary-dark);
        }

        .filter-buttons button:nth-child(2) {
          background-color: var(--gray-500);
          color: white;
        }

        .filter-buttons button:nth-child(2):hover {
          background-color: var(--gray-600);
        }

        .filter-buttons button:nth-child(3) {
          background-color: var(--danger);
          color: white;
        }

        .filter-buttons button:nth-child(3):hover {
          background-color: var(--danger-dark, #b02a37);
        }

        .filter-buttons button.latest {
          background-color: var(--accent-light);
          color: var(--accent);
          margin-left: auto;
        }

        .filter-buttons button.latest:hover {
          background-color: var(--accent);
          color: white;
        }

        .order-history {
          margin-left: 8px;
          width: 100%;
          background-color: white;
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          animation: slideUp 0.4s var(--transition-base);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          text-align: left;
        }

        th {
          background-color: var(--gray-50);
          color: var(--gray-600);
          font-weight: 600;
          padding: 1rem 1.5rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 10;
          transition: var(--transition-base);
          border-bottom: 1px solid var(--gray-200);
          white-space: nowrap;
        }

        th:first-child {
          padding-left: 1rem;
        }

        td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--gray-100);
          font-size: 0.95rem;
          color: var(--gray-700);
          vertical-align: middle;
        }

        td:first-child {
          padding-left: 1rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        td:last-child {
          padding-right: 1rem;
        }

        tr {
          transition: var(--transition-base);
        }

        tr:hover {
          background-color: var(--gray-50);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .food-icon {
          cursor: pointer;
          color: var(--gray-400);
          transition: var(--transition-base);
        }

        .food-icon:hover {
          color: var(--primary);
        }

        .food-items {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          width: 280px;
        }

        .food-items div {
          line-height: 1.4;
          color: var(--gray-600);
          font-size: 0.9375rem;
          width: 280px;
        }

        .delete-button {
          padding: 0.375rem 0.75rem;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: var(--border-radius-md);
          cursor: pointer;
          font-size: 0.875rem;
          transition: var(--transition-base);
        }

        .delete-button:hover {
          background: var(--danger-dark, #b02a37);
        }

        .no-results {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--gray-500);
        }

        .no-results p {
          font-size: 1.125rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 1024px) {
          .order-history {
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-md);
          }

          table {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          th, td {
            min-width: 120px;
            padding: 1rem;
          }

          th:first-child,
          td:first-child {
            padding-left: 1.5rem;
          }

          th:last-child,
          td:last-child {
            padding-right: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 1rem;
          }

          header h1 {
            font-size: 1.75rem;
          }

          .search-container {
            flex-direction: column;
          }

          .search-input,
          .date-input {
            min-width: 100%;
          }

          .filter-buttons {
            padding: 0.375rem;
            gap: 0.5rem;
            flex-direction: column;
          }

          .filter-buttons button {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            width: 100%;
          }

          .filter-buttons button.latest {
            margin-left: 0;
          }

          th, td {
            padding: 0.875rem;
            font-size: 0.875rem;
          }

          th:first-child,
          td:first-child {
            padding-left: 1rem;
          }

          th:last-child,
          td:last-child {
            padding-right: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryReport;