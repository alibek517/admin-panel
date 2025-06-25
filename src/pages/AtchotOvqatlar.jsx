// src/components/ProductSales.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

const ProductSales = () => {
  const [salesData, setSalesData] = useState({});
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]); // Store orders to avoid repeated API calls

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await axios.get('https://alikafecrm.uz/order');
        const ordersData = response.data;
        setOrders(ordersData); // Store orders

        // Extract unique categories
        const categoryMap = new Map();
        ordersData.forEach((order) =>
          order.orderItems.forEach((item) => {
            const { categoryId } = item.product;
            let categoryName;
            switch (categoryId) {
              case 10:
                categoryName = 'Ичимликлар'; // Drinks
                break;
              case 18:
                categoryName = 'Салатлар'; // Salads
                break;
              case 20:
                categoryName = 'Асосий таомлар'; // Main Dishes
                break;
              case 27:
                categoryName = 'Десертлар'; // Desserts
                break;
              default:
                categoryName = `Категория ${categoryId}`;
            }
            categoryMap.set(categoryId, categoryName);
          })
        );
        setCategories(
          Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }))
        );

        // Process orders
        updateSalesData(ordersData, searchQuery, selectedCategory, startDate, endDate);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []); 

  const updateSalesData = (ordersData, query, category, start, end) => {
    const productCounts = {};
    let totalCount = 0;

    ordersData.forEach((order) => {
      if (['COMPLETED', 'ARCHIVE'].includes(order.status)) {
        // Date filter
        const orderDate = order.createdAt.split('T')[0];
        if (
          (!start || orderDate >= start) &&
          (!end || orderDate <= end)
        ) {
          order.orderItems.forEach((item) => {
            const productName = item.product.name;
            const productPrice = item.product.price || 0; // Get price
            const count = item.count;
            const productCategory = item.product.categoryId.toString();

            // Search and category filter
            if (
              productName.toLowerCase().includes(query.toLowerCase()) &&
              (category === 'all' || productCategory === category)
            ) {
              if (!productCounts[productName]) {
                productCounts[productName] = {
                  count: 0,
                  price: productPrice
                };
              }
              productCounts[productName].count += count;
              totalCount += count;
            }
          });
        }
      }
    });

    // Log for verification
    console.log('Филтрланган махсулотлар:', productCounts);
    console.log('Умумий сотилган махсулотлар:', totalCount);

    setSalesData(productCounts);
    setTotalProducts(totalCount);
  };

  useEffect(() => {
    // Re-process data when filters change (only if orders are loaded)
    if (orders.length > 0) {
      updateSalesData(orders, searchQuery, selectedCategory, startDate, endDate);
    }
  }, [searchQuery, selectedCategory, startDate, endDate, orders]);

  // Inline styles
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '2rem auto',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
    },
    title: {
      textAlign: 'center',
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: '1.5rem',
    },
    filterContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    input: {
      padding: '0.5rem',
      fontSize: '1rem',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      width: '100%',
    },
    select: {
      padding: '0.5rem',
      fontSize: '1rem',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      width: '100%',
    },
    dateContainer: {
      display: 'flex',
      gap: '1rem',
    },
    total: {
      backgroundColor: '#e6f3ff',
      padding: '1rem',
      borderRadius: '6px',
      marginBottom: '1.5rem',
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#1e40af',
      textAlign: 'center',
    },
    totalSpan: {
      color: '#2563eb',
    },
    subtitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#4b5563',
      marginBottom: '1rem',
    },
    productList: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '1rem',
    },
    productItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      transition: 'background 0.2s',
    },
    productItemHover: {
      backgroundColor: '#f3f4f6',
    },
    productName: {
      fontSize: '1.125rem',
      fontWeight: '500',
      color: '#1f2937',
    },
    productCount: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#16a34a',
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#444444',
    },
    error: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#dc2626',
    },
  };

  if (loading) {
    return <div style={styles.loading}>Юкланмоқда...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Отчет по блюдам</h1>
      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="Махсулот номи бўйича қидириш"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.input}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.select}
        >
          <option value="all">Барча категория</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id.toString()}>
              {category.name}
            </option>
          ))}
        </select>
        <div style={styles.dateContainer}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
            placeholder="Бошланиш санаси"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
            placeholder="Тугалланиш санаси"
          />
        </div>
      </div>
      <div style={styles.total}>
        Умумий сотилган махсулотлар: <span style={styles.totalSpan}>{totalProducts}</span>
      </div>
      <h3 style={styles.subtitle}>Махсулотлар бўйича кўрсаткичлар:</h3>
      <div style={styles.productList}>
        {Object.entries(salesData).map(([product, data]) => (
          <div
            key={product}
            style={styles.productItem}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = styles.productItemHover.backgroundColor)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = styles.productItem.backgroundColor)}
          >
            <span style={styles.productName}>
              {product} - ({data.price ? `${data.price.toLocaleString()} сўм` : 'Нарх кўрсатилмаган'})
            </span>
            <span style={styles.productCount}>{data.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductSales;