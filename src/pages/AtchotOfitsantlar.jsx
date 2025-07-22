import React, { useState, useEffect } from 'react';
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '32px',
    color: '#1f2937'
  },
  filterSection: {
    backgroundColor: '#f9fafb',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    alignItems: 'end'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  dateInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff'
  },
  dateInputFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
  },
  searchButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    height: 'fit-content'
  },
  searchButtonHover: {
    backgroundColor: '#2563eb'
  },
  dateRange: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '64px 0'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '32px',
    height: '32px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '8px',
    color: '#6b7280'
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
    color: '#dc2626'
  },
  ordersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  userCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s'
  },
  userCardHover: {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  userName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  userStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statItem: {
    color: '#6b7280'
  },
  statLabel: {
    fontWeight: '500'
  },
  totalAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#059669'
  },
  noData: {
    textAlign: 'center',
    padding: '96px 0',
    color: '#6b7280',
    fontSize: '18px'
  }
};


const AtchotOfitsantlar = () => {
  const today = new Date().toISOString().split('T')[0];

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [dateRangeText, setDateRangeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isDateInRange = (dateStr, startStr, endStr) => {
    const date = new Date(dateStr);
    const start = new Date(startStr);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999); 
    return date >= start && date <= end;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('http://192.168.100.99:3000/order');
        if (!response.ok) {
          throw new Error('Ma\'lumotlarni yuklashda xatolik');
        }
        const fetchedOrders = await response.json();
        
        setOrders(fetchedOrders);
        const todayOrders = fetchedOrders.filter((order) =>
          isDateInRange(order.createdAt, today, today)
        );
        setFilteredOrders(todayOrders);

        if (fetchedOrders.length > 0) {
          setDateRangeText(`Буюртмалар: ${formatDate(today)}`);
        } else {
          setError('Буюртмалар топилмади.');
        }

        setLoading(false);
      } catch (err) {
        setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const calculateOrderTotal = (order) => {
    const orderItems = order.orderItems || [];
    
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      console.warn(`Order ${order.id || 'unknown'} has no valid order items. Returning 0.`);
      return 0;
    }
    
    const totalSum = orderItems.reduce((sum, item) => {
      const count = Number(item.count) || 0;
      const price = item.product ? Number(item.product.price) || 0 : 0;
      
      if (count <= 0 || price <= 0) {
        console.warn(`Invalid item data in order ${order.id || 'unknown'}: count=${count}, price=${price}. Skipping.`);
        return sum;
      }
      
      return sum + (count * price);
    }, 0);
    
    return totalSum;
  };

  const groupOrdersByUser = (orders) => {
    return orders.reduce((acc, order) => {
      if (!order.user) {
        console.warn(`Order ${order.id || 'unknown'} has no user data. Skipping.`);
        return acc;
      }
      
      const user = order.user;
      const userName = user.name || 'Номаълум';
      const userSurname = user.surname || '';
      const userRole = user.role || 'Номаълум';
      
      const transformedRole = userRole === 'CUSTOMER' ? 'админ' : userRole === 'CASHIER' ? 'официант' : userRole;
      const key = user.id ? `${user.id}_${transformedRole}` : `${userName}_${userSurname}_${transformedRole}`;
      
      if (!acc[key]) {
        acc[key] = {
          name: userName,
          surname: userSurname,
          role: transformedRole,
          totalAmount: 0,
          orderCount: 0,
        };
      }
      
      const total = calculateOrderTotal(order);
      acc[key].totalAmount += total;
      acc[key].orderCount += 1;
      
      return acc;
    }, {});
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      setError('Илтимос, бошланғич ва якуний санани танланг.');
      return;
    }

    const filtered = orders.filter((order) => {
      return isDateInRange(order.createdAt, startDate, endDate);
    });

    if (filtered.length === 0) {
      setError('Танланган сана оралиғида буюртмалар топилмади.');
    } else {
      setError(null);
    }

    setFilteredOrders(filtered);
    setDateRangeText(`Буюртмалар: ${formatDate(startDate)} дан ${formatDate(endDate)} гача`);
  };

  const groupedOrders = groupOrdersByUser(filteredOrders);

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .date-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .search-button:hover {
          background-color: #2563eb;
        }
        .user-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      
      <div style={styles.container}>
        <h1 style={styles.header}>
          Официантлар Ҳисоботи
        </h1>

        <div style={styles.filterSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Дан
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.dateInput}
              className="date-input"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Гача
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.dateInput}
              className="date-input"
            />
          </div>
          <button
            onClick={handleSearch}
            style={styles.searchButton}
            className="search-button"
          >
            Қидириш
          </button>
        </div>

        {dateRangeText && (
          <p style={styles.dateRange}>
            {dateRangeText}
          </p>
        )}

        {loading && (
          <div style={styles.loading}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Юкланмоқда...</p>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.ordersContainer}>
          {Object.values(groupedOrders).map((data) => (
            <div
              key={`${data.name}_${data.surname}_${data.role}`}
              style={styles.userCard}
              className="user-card"
            >
              <h2 style={styles.userName}>
                {data.name} {data.surname} ({data.role})
              </h2>
              <div style={styles.userStats}>
                <p style={styles.statItem}>
                  <span style={styles.statLabel}>Буюртмалар сони:</span> {data.orderCount}
                </p>
                <p style={styles.statItem}>
                  <span style={styles.statLabel}>Умумий сумма:</span>{' '}
                  <span style={styles.totalAmount}>
                    {data.totalAmount.toLocaleString()} UZS
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(groupedOrders).length === 0 && !loading && !error && (
          <div style={styles.noData}>
            Ма'lumотлар топилмади
          </div>
        )}
      </div>
    </>
  );
};

export default AtchotOfitsantlar;