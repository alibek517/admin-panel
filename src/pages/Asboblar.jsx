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

  useEffect(() => {
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
      } catch (error) {
        console.error("Хатолик юз берди:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
          Асбоблар
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