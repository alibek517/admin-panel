import { useState, useEffect } from 'react';
import axios from 'axios';

const ProductSales = () => {
  const today = new Date().toISOString().split('T')[0]; 
  const [salesData, setSalesData] = useState({});
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesResponse = await axios.get('https://alikafecrm.uz/category');
        const categoriesData = categoriesResponse.data;
        const formattedCategories = categoriesData.map(category => ({
          id: category.id.toString(),
          name: category.name
        }));
        setCategories(formattedCategories);

        if (formattedCategories.length > 0) {
          setSelectedCategory(formattedCategories[0].id);
        }

        const ordersResponse = await axios.get('https://alikafecrm.uz/order');
        const ordersData = ordersResponse.data;
        setOrders(ordersData);

        updateSalesData(
          ordersData,
          searchQuery,
          formattedCategories.length > 0 ? formattedCategories[0].id : '',
          startDate,
          endDate
        );
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError('Failed to fetch data');
      }
    };

    fetchData();
  }, []);

  const updateSalesData = (ordersData, query, category, start, end) => {
    const productCounts = {};
    let totalCount = 0;

    ordersData.forEach((order) => {
      if (['COMPLETED', 'ARCHIVE'].includes(order.status)) {
        const orderDate = order.createdAt.split('T')[0];
        if (
          (!start || orderDate >= start) &&
          (!end || orderDate <= end)
        ) {
          order.orderItems.forEach((item) => {
            const productName = item.product.name;
            const productPrice = item.product.price || 0;
            const count = item.count;
            const productCategory = item.product.categoryId.toString();

            if (
              productName.toLowerCase().includes(query.toLowerCase()) &&
              productCategory === category
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

    console.log('Филтрланган махсулотлар:', productCounts);
    console.log('Умумий сотилган махсулотлар:', totalCount);

    setSalesData(productCounts);
    setTotalProducts(totalCount);
  };

  useEffect(() => {
    if (orders.length > 0 && selectedCategory) {
      updateSalesData(orders, searchQuery, selectedCategory, startDate, endDate);
    }
  }, [searchQuery, selectedCategory, startDate, endDate, orders]);

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
          disabled={categories.length === 0}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
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
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
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