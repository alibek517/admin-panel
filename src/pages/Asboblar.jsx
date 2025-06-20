import React, { useState, useEffect } from "react";
import "./styles/Asboblar.css";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Asboblar() {
  const [dailyStats, setDailyStats] = useState({
    orderCount: 0,
    totalAmount: 0,
    totalCommission: 0,
    averageCheck: 0,
  });
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0);
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState({
    ordersCount: 0,
    totalPrice: 0,
    totalCommission: 0,
    totalWithCommission: 0,
  });

  // Format price helper function
  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сўм';
  };


  // Calculate summary based on date range
  const calculateSummary = (orders, start, end) => {
    let filteredOrders = orders;
    
    if (start && end) {
      const startDateTime = new Date(start);
      const endDateTime = new Date(end);
      endDateTime.setHours(23, 59, 59, 999);
      
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDateTime && orderDate <= endDateTime;
      });
    }

    const ordersCount = filteredOrders.length;
    const totalPrice = filteredOrders.reduce((sum, order) => {
      if (order.totalAmount) {
        return sum + order.totalAmount;
      }
      return sum + order.orderItems.reduce(
        (itemSum, item) => itemSum + (item.product?.price || 0) * item.count,
        0
      );
    }, 0);
    
    const totalCommission = totalPrice * (commissionRate / 100);
    const totalWithCommission = totalPrice + totalCommission;

    return {
      ordersCount,
      totalPrice,
      totalCommission,
      totalWithCommission,
    };
  };

  const fetchData = async () => {
    try {
      const [ordersResponse, percentResponse] = await Promise.all([
        axios.get("https://alikafecrm.uz/order"),
        axios.get("https://alikafecrm.uz/percent/1"),
      ]);

      const orders = ordersResponse.data.map((order) => ({
        ...order,
        orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
      }));
      
      const fetchedCommissionRate = percentResponse.data?.percent || 0;
      setCommissionRate(fetchedCommissionRate);
      setOrders(orders);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const dailyOrders = orders.filter(
        (order) =>
          new Date(order.createdAt) >= today &&
          new Date(order.createdAt) <= todayEnd
      );

      const orderCount = dailyOrders.length;
      const totalAmount = dailyOrders.reduce((sum, order) => {
        if (order.totalAmount) {
          return sum + order.totalAmount;
        }
        return (
          sum +
          order.orderItems.reduce(
            (itemSum, item) =>
              itemSum + (item.product?.price || 0) * item.count,
            0
          )
        );
      }, 0);
      const totalCommission = totalAmount * (fetchedCommissionRate / 100);
      const averageCheck = orderCount > 0 ? totalAmount / orderCount : 0;

      setDailyStats({
        orderCount,
        totalAmount,
        totalCommission,
        averageCheck,
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 6);
      oneWeekAgo.setHours(0, 0, 0, 0);

      const weeklyData = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(oneWeekAgo);
        day.setDate(oneWeekAgo.getDate() + i);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayOrders = orders.filter(
          (order) =>
            new Date(order.createdAt) >= day &&
            new Date(order.createdAt) <= dayEnd
        );

        const dayTotalAmount = dayOrders.reduce((sum, order) => {
          if (order.totalAmount) {
            return sum + order.totalAmount;
          }
          return (
            sum +
            order.orderItems.reduce(
              (itemSum, item) =>
                itemSum + (item.product?.price || 0) * item.count,
              0
            )
          );
        }, 0);

        weeklyData.push({
          date: day.toLocaleDateString("uz-UZ", {
            day: "2-digit",
            month: "2-digit",
          }),
          orderCount: dayOrders.length,
          commission: dayTotalAmount * (fetchedCommissionRate / 100),
        });
      }

      setWeeklyStats(weeklyData);
      
      // Calculate initial summary
      const initialSummary = calculateSummary(orders, startDate, endDate);
      setSummary(initialSummary);
      
    } catch (error) {
      console.error("Хатолик юз берди:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update summary when dates change
  useEffect(() => {
    if (orders.length > 0) {
      const newSummary = calculateSummary(orders, startDate, endDate);
      setSummary(newSummary);
    }
  }, [startDate, endDate, orders, commissionRate]);

  const orderChartData = {
    labels: weeklyStats.map((stat) => stat.date),
    datasets: [
      {
        label: "Буюртмалар сони",
        data: weeklyStats.map((stat) => stat.orderCount),
        backgroundColor: "rgba(67, 97, 238, 0.2)",
        borderColor: "var(--color-primary)",
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const commissionChartData = {
    labels: weeklyStats.map((stat) => stat.date),
    datasets: [
      {
        label: "Комиссия (сўм)",
        data: weeklyStats.map((stat) => stat.commission),
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "#ff6384",
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: (context) => {
          const maxValue =
            context.chart.canvas.id === "orderChart"
              ? Math.max(...weeklyStats.map((stat) => stat.orderCount || 0)) *
                1.1
              : Math.max(...weeklyStats.map((stat) => stat.commission || 0)) *
                1.1;
          return maxValue > 0 ? maxValue : 10;
        },
        title: {
          display: true,
          text: (context) =>
            context.chart.canvas.id === "orderChart"
              ? "Буюртмалар сони"
              : "Комиссия (сўм)",
          color: "var(--color-text-primary)",
          font: {
            size: 14,
            family: "var(--font-family)",
          },
        },
        ticks: {
          color: "var(--color-text-secondary)",
          precision: (context) =>
            context.chart.canvas.id === "orderChart" ? 0 : 2,
        },
      },
      x: {
        title: {
          display: true,
          text: "Сана",
          color: "var(--color-text-primary)",
          font: {
            size: 14,
            family: "var(--font-family)",
          },
        },
        ticks: {
          color: "var(--color-text-secondary)",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "var(--color-text-primary)",
          font: {
            size: 12,
            family: "var(--font-family)",
          },
        },
      },
      tooltip: {
        backgroundColor: "var(--color-card-background)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "var(--color-border)",
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="container">
      <header
        style={{ marginTop: "-23px", paddingBottom: "-5px" }}
        className="header-asboblar"
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: "2.5rem",
            marginLeft: "-30px",
          }}
          className="header-title fade-in"
        >
          Статистика
        </h1>
        <h2
          style={{
            marginBottom: "0px",
            marginLeft: "-25px",
          }}
          className="header-subtitle fade-in"
        >
          <svg>
            <use xlinkHref="#stats-icon" />
          </svg>
          Статистика
        </h2>
      </header>
      
      <section className="orders-section">
        {/* Jami hisobot */}
        <div style={{
          marginBottom: "var(--space-4)",
          padding: "var(--space-4)",
          backgroundColor: "#f8f9fa",
          borderRadius: "var(--radius-md)",
          border: "1px solid #dee2e6"
        }}>
          <h3 style={{ marginBottom: "var(--space-3)", color: "#495057" }}>
            Жами ҳисобот 
            {startDate && endDate && (
              <span style={{ fontSize: "14px", fontWeight: "normal", color: "#6c757d" }}>
                ({startDate} дан {endDate} гача)
              </span>
            )}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "white", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
                {summary.ordersCount}
              </div>
              <div style={{ color: "#6c757d", fontSize: "14px" }}>Буюртмалар сони</div>
            </div>
            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "white", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#007bff" }}>
                {formatPrice(summary.totalPrice)}
              </div>
              <div style={{ color: "#6c757d", fontSize: "14px" }}>Умумий сотув</div>
            </div>
            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "white", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ffc107" }}>
                {formatPrice(summary.totalCommission)}
              </div>
              <div style={{ color: "#6c757d", fontSize: "14px" }}>Жами комиссия</div>
            </div>
            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "white", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#dc3545" }}>
                {formatPrice(summary.totalWithCommission)}
              </div>
              <div style={{ color: "#6c757d", fontSize: "14px" }}>Жами (комиссия билан)</div>
            </div>
          </div>
        </div>

        <div className="clear-orders-form" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "50px", alignItems: "center", justifyContent:"center" }}>
            <div style={{textAlign:"center"}}>
              <label>Бошланғич сана:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modal-input"
                style={{
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--color-neutral-300)`,
                  marginTop: "var(--space-1)",
                }}
              />
            </div>
            <div style={{textAlign:"center"}}>
              <label>Якуний сана:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
                style={{
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--color-neutral-300)`,
                  marginTop: "var(--space-1)",
                }}
              />
            </div>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
            Буюртмалар йўқ 
          </p>
        ) : null}
      </section>
      
      <section className="section daily-stats">
        <h3 className="section-title">
          <svg>
            <use xlinkHref="#calendar-icon" />
          </svg>
          Бугунги кун статистикаси
        </h3>
        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div className="stats-cards">
            <div className="stats-card card-hover fade-in">
              <p className="stats-card-title">Буюртмалар сони</p>
              <h4 className="stats-card-value">{dailyStats.orderCount}</h4>
              <span className="stats-card-unit">та</span>
            </div>
            <div className="stats-card card-hover fade-in">
              <div
                style={{
                  display: "flex",
                }}
              >
                <p style={{ marginLeft: "-10px" }} className="stats-card-title">
                  Умумий сумма
                </p>
                <p
                  style={{
                    fontSize: "9px",
                  }}
                  className="stats-card-title"
                >
                  ( Комиссиясиз )
                </p>
              </div>
              <h4 className="stats-card-value">
                {dailyStats.totalAmount.toLocaleString("uz-UZ")}
              </h4>
              <span className="stats-card-unit">сўм</span>
            </div>
            <div className="stats-card card-hover fade-in">
              <p className="stats-card-title">Комиссия</p>
              <h4 className="stats-card-value">
                {dailyStats.totalCommission.toLocaleString("uz-UZ")}
              </h4>
              <span className="stats-card-unit">сўм</span>
            </div>
            <div className="stats-card card-hover fade-in">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p className="stats-card-title">Ўртача буюртма миқдори</p>
                <p
                  style={{
                    fontSize: "10px",
                    marginTop: "-10px",
                  }}
                  className="stats-card-title"
                >
                  ( Комиссиясиз )
                </p>
              </div>
              <h4 className="stats-card-value">
                {Math.round(dailyStats.averageCheck).toLocaleString("uz-UZ")}
              </h4>
              <span className="stats-card-unit">сўм</span>
            </div>
          </div>
        )}
      </section>
      
      <section className="section chart-container">
        <h3 className="section-title">
          <svg>
            <use xlinkHref="#chart-icon" />
          </svg>
          Ҳафталик статистика
        </h3>
        {loading ? (
          <div className="spinner"></div>
        ) : weeklyStats.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
            Буюртмалар йўқ
          </p>
        ) : (
          <>
            <div
              className="chart"
              style={{ height: "300px", marginBottom: "var(--space-4)" }}
            >
              <h4>Буюртмалар сони</h4>
              <Line
                id="orderChart"
                data={orderChartData}
                options={chartOptions}
              />
            </div>
            <div className="chart" style={{ height: "300px" }}>
              <h4>Комиссия</h4>
              <Line
                id="commissionChart"
                data={commissionChartData}
                options={chartOptions}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}