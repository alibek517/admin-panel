import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useReactToPrint } from "react-to-print";
import {
  Pencil,
  X,
  Printer,
  Package2,
  CircleDot,
  ChefHat,
  Hamburger,
  UserCircle2,
  Menu,
  PrinterIcon,
  ArrowLeftRight,
  Trash,
} from "lucide-react";
import Receipt from "../components/Receipt.jsx";
import "./styles/Zakazlar.css";
import axios from "axios";
import { socket } from "../socket.js";

const API_BASE = "http://192.168.100.99:3000";
const API_ENDPOINTS = {
  orders: `${API_BASE}/order`,
  categories: `${API_BASE}/category`,
  products: `${API_BASE}/product`,
  tables: `${API_BASE}/tables`,
  percent: `${API_BASE}/percent/1`,
};

const STATUS_LABELS = {
  PENDING: "Янги",
  COOKING: "Тайёрланмоқда",
  READY: "Тайёр",
  COMPLETED: "Мижоз олдида",
  ARCHIVE: "Архиви буюртма",
};

const ROLE_LABELS = {
  CUSTOMER: "Администратор",
  CASHIER: "Официант",
  KITCHEN: "Ошпаз",
  BIGADMIN: "Бошлиқ",
};

const filters = [
  { label: "Барчаси", name: "All", icon: Package2 },
  { label: "Янги", name: "PENDING", icon: CircleDot },
  { label: "Тайёрланмоқда", name: "COOKING", icon: ChefHat },
  { label: "Тайёр", name: "READY", icon: Hamburger },
  { label: "Мижоз олдида", name: "COMPLETED", icon: UserCircle2 },
];

const getStatusClass = (status) => {
  const statusClasses = {
    PENDING: "status--pending",
    COOKING: "status--cooking",
    READY: "status--ready",
    COMPLETED: "status--completed",
    ARCHIVE: "status--archive",
  };
  return statusClasses[status] || "";
};

const createApiRequest = (token) => ({
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});

const handleApiError = (error, defaultMessage) => {
  console.error(defaultMessage, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
  });

  const statusMessages = {
    401: "Авторизация хатоси. Илтимос, қайта киринг.",
    403: "Рухсат йўқ. Администратор билан боғланинг.",
    404: "Маълумот топилмади.",
    422: "Нотўғри маълумот юборилди.",
    500: "Сервер хатоси. Кейинроқ уриниб кўринг.",
  };

  const message =
    error.response?.data?.message ||
    statusMessages[error.response?.status] ||
    defaultMessage;
  return message;
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

const statusMapToBackend = { Бўш: "empty", Банд: "busy" };
const statusMapToFrontend = { empty: "Бўш", busy: "Банд" };

export default function Zakazlar() {
  const [state, setState] = useState({
    activeFilter: "All",
    orders: [],
    categoryList: [],
    products: [],
    tables: [],
    loading: true,
    currentOrder: null,
    showEditModal: false,
    editingOrder: null,
    newItem: { productId: "", count: 1 },
    error: "",
    showInitialDeleteConfirmModal: false,
    showDeleteConfirmModal: false,
    orderToDelete: null,
    isConnected: socket.connected,
    isSaving: false,
    expandedOrderIds: {},
    showChangeTableModal: false,
    selectedOrderId: null,
    selectedTableId: null,
    commissionPercent: 0,
  });
  const [cachedData, setCachedData] = useState({
    tables: [],
    products: [],
    categories: [],
    percent: 0,
  });
  const receiptRef = useRef();
  const token = localStorage.getItem("token");
  const processedEvents = useRef(new Set());

  const formatPrice = useCallback((price) => {
    return price
      ? price
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
          .replace(/\.00$/, "")
          .trim() + " сўм"
      : "0 сўм";
  }, []);

  const calculateTotalPrice = useCallback((orderItems) => {
    return orderItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.product?.price || 0) * (item.count || 0),
      0
    );
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handlePrintOnly = useCallback(
    async (order) => {
      if (!order?.id) {
        alert("Буюртма маълумотлари топилмади.");
        return;
      }
      try {
        setState((prev) => ({ ...prev, currentOrder: deepClone(order) }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!receiptRef.current) {
          console.error("Receipt ref is null");
          alert("Чоп этиш учун маълумотлар тайёр эмас.");
          return;
        }
        handlePrint();
        setState((prev) => ({ ...prev, currentOrder: null }));
      } catch (error) {
        console.error("Print only error:", error);
        alert("Чоп этишда хатолик юз берди.");
        setState((prev) => ({ ...prev, currentOrder: null }));
      }
    },
    [handlePrint]
  );

  const fetchAllData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [ordersRes, categoriesRes, productsRes, tablesRes, percentRes] =
        await Promise.all([
          axios.get(API_ENDPOINTS.orders, createApiRequest(token)),
          axios.get(API_ENDPOINTS.categories, createApiRequest(token)),
          axios.get(API_ENDPOINTS.products, createApiRequest(token)),
          axios.get(API_ENDPOINTS.tables, createApiRequest(token)),
          axios.get(API_ENDPOINTS.percent, createApiRequest(token)),
        ]);

      const sanitizedOrders = ordersRes.data.map((order) =>
        deepClone({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
        })
      );

      const sanitizedTables = tablesRes.data.data.map((table) => ({
        ...table,
        status: statusMapToFrontend[table.status] || table.status,
      }));

      const commissionPercent = parseFloat(percentRes.data.percent) || 0;

      setState((prev) => ({
        ...prev,
        orders: sanitizedOrders,
        categoryList: categoriesRes.data,
        products: productsRes.data,
        tables: sanitizedTables,
        commissionPercent,
        loading: false,
      }));
    } catch (error) {
      const message = handleApiError(
        error,
        "Маълумотларни юклашда хатолик юз берди."
      );
      alert(message);
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [token]);

  const updateTableStatus = useCallback(
    async (tableId, status) => {
      if (!tableId) return;
      console.log(`Updating table ${tableId} to status: ${status}`);
      try {
        const backendStatus = statusMapToBackend[status] || status;
        await axios.patch(
          `${API_ENDPOINTS.tables}/${tableId}`,
          { status: backendStatus },
          createApiRequest(token)
        );
        setState((prev) => ({
          ...prev,
          tables: prev.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  status: statusMapToFrontend[backendStatus] || status,
                }
              : table
          ),
        }));
        console.log(
          `Table ${tableId} status updated successfully to ${status}`
        );
      } catch (error) {
        const message = handleApiError(
          error,
          "Стол ҳолатини янгилашда хатолик."
        );
        console.error(`Failed to update table ${tableId}:`, message);
        alert(message);
      }
    },
    [token]
  );

  const archiveOrder = useCallback(
    async (orderId) => {
      try {
        const response = await axios.put(
          `${API_ENDPOINTS.orders}/${orderId}`,
          { status: "ARCHIVE" },
          createApiRequest(token)
        );
        if (socket.connected) {
          socket.emit("orderUpdated", response.data);
        } else {
          console.warn("Socket not connected, orderUpdated event not emitted");
        }
        return response.data.status === "ARCHIVE";
      } catch (error) {
        const message = handleApiError(
          error,
          "Буюртмани архиви буюртма қилишда хатолик."
        );
        alert(message);
        throw new Error(`Archive failed`);
      }
    },
    [token]
  );

  const handleCloseAndPrint = useCallback(
    async (order) => {
      if (!order?.id) {
        alert("Буюртма маълумотлари топилмади.");
        return;
      }
      try {
        setState((prev) => ({ ...prev, currentOrder: deepClone(order) }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!receiptRef.current) {
          console.error("Receipt ref is null");
          alert("Чоп этиш учун маълумотлар тайёр эмас.");
          return;
        }
        await archiveOrder(order.id);
        if (order.tableId) {
          await updateTableStatus(order.tableId, "Бўш");
        }
        handlePrint();
        setState((prev) => ({
          ...prev,
          orders: prev.orders.filter((o) => o.id !== order.id),
          currentOrder: null,
        }));
      } catch (error) {
        console.error("Close and print error:", error);
        alert("Чоп этишда хатолик юз берди.");
        setState((prev) => ({
          ...prev,
          orders: prev.orders.filter((o) => o.id !== order.id),
          currentOrder: null,
        }));
      }
    },
    [archiveOrder, handlePrint, updateTableStatus]
  );

  const handleDeleteOrder = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      showInitialDeleteConfirmModal: true,
      orderToDelete: id,
    }));
  }, []);

  const confirmInitialDelete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showInitialDeleteConfirmModal: false,
      showDeleteConfirmModal: true,
    }));
  }, []);

  const cancelInitialDelete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showInitialDeleteConfirmModal: false,
      orderToDelete: null,
    }));
  }, []);

  const confirmDeleteOrder = useCallback(async () => {
    const id = state.orderToDelete;
    const order = state.orders.find((o) => o.id === id);
    const tableId = order?.tableId;
    try {
      await axios.delete(
        `${API_ENDPOINTS.orders}/${id}`,
        createApiRequest(token)
      );
      if (socket.connected) {
        socket.emit("orderDeleted", { id });
      } else {
        console.warn("Socket not connected, orderDeleted event not emitted");
      }
      const updatedOrders = state.orders.filter((o) => o.id !== id);
      setState((prev) => ({ ...prev, orders: updatedOrders }));
      if (tableId) {
        const hasOtherOrders = updatedOrders.some(
          (o) => o.tableId === tableId && o.status !== "ARCHIVE"
        );
        if (!hasOtherOrders) {
          await updateTableStatus(tableId, "Бўш");
        }
      }
      alert("Буюртма муваффақиятли ўчирилди!");
    } catch (error) {
      const message = handleApiError(error, "Буюртмани ўчиришда хатолик.");
      alert(message);
      if (error.response?.status === 404) {
        const updatedOrders = state.orders.filter((o) => o.id !== id);
        setState((prev) => ({ ...prev, orders: updatedOrders }));
        if (tableId) {
          const hasOtherOrders = updatedOrders.some(
            (o) => o.tableId === tableId && o.id !== id
          );
          if (!hasOtherOrders) {
            await updateTableStatus(tableId, "Бўш");
          }
        }
      }
    } finally {
      setState((prev) => ({
        ...prev,
        showDeleteConfirmModal: false,
        orderToDelete: null,
      }));
    }
  }, [state.orders, state.orderToDelete, token, updateTableStatus]);

  const cancelDeleteOrder = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showDeleteConfirmModal: false,
      orderToDelete: null,
    }));
  }, []);

  const handleEditOrder = useCallback(
    (order) => {
      setState((prev) => ({
        ...prev,
        orders: [...prev.orders],
        editingOrder: deepClone({
          ...order,
          orderItems: [...order.orderItems],
        }),
        showEditModal: true,
        newItem: { productId: "", count: 1 },
        error: "",
      }));
    },
    [state.orders]
  );

  const handleChangeTable = useCallback((orderId) => {
    setState((prev) => ({
      ...prev,
      showChangeTableModal: true,
      selectedOrderId: orderId,
      selectedTableId: null,
    }));
  }, []);

  const closeChangeTableModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showChangeTableModal: false,
      selectedOrderId: null,
      selectedTableId: null,
    }));
  }, []);

  const handleSaveTableChange = useCallback(async () => {
    if (!state.selectedOrderId || !state.selectedTableId) {
      alert("Илтимос, стол танланг.");
      return;
    }
    try {
      setState((prev) => ({ ...prev, isSaving: true, error: "" }));
      console.log(
        `Changing table for order ${state.selectedOrderId} to table ${state.selectedTableId}`
      );
      const order = state.orders.find((o) => o.id === state.selectedOrderId);
      const oldTableId = order?.tableId;
      const payload = {
        tableId: state.selectedTableId,
        status: order.status,
      };
      const response = await axios.put(
        `${API_ENDPOINTS.orders}/${state.selectedOrderId}`,
        payload,
        createApiRequest(token)
      );
      const updatedOrder = response.data;
      if (socket.connected) {
        socket.emit("orderUpdated", updatedOrder);
      } else {
        console.warn("Socket not connected, orderUpdated event not emitted");
      }
      await updateTableStatus(state.selectedTableId, "Банд");
      if (oldTableId && oldTableId !== state.selectedTableId) {
        const hasOtherOrdersOnOldTable = state.orders.some(
          (o) =>
            o.tableId === oldTableId &&
            o.id !== state.selectedOrderId &&
            o.status !== "ARCHIVE"
        );
        if (!hasOtherOrdersOnOldTable) {
          await updateTableStatus(oldTableId, "Бўш");
        }
      }
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === state.selectedOrderId
            ? {
                ...o,
                tableId: state.selectedTableId,
                table: prev.tables.find((t) => t.id === state.selectedTableId),
              }
            : o
        ),
        showChangeTableModal: false,
        selectedOrderId: null,
        selectedTableId: null,
        isSaving: false,
      }));
      alert("Стол муваффақиятли ўзгартирилди!");
    } catch (error) {
      const message = handleApiError(error, "Столни ўзгартиришда хатолик.");
      console.error(
        `Failed to change table for order ${state.selectedOrderId}:`,
        message
      );
      setState((prev) => ({ ...prev, error: message, isSaving: false }));
      alert(message);
    }
  }, [
    state.selectedOrderId,
    state.selectedTableId,
    state.orders,
    state.tables,
    token,
    updateTableStatus,
  ]);

  const handleRemoveItem = useCallback(
    async (itemId) => {
      if (state.isSaving || !state.editingOrder) return;
      try {
        setState((prev) => ({ ...prev, isSaving: true, error: "" }));
        await axios.delete(
          `${API_ENDPOINTS.orders}/orderItem/${itemId}`,
          createApiRequest(token)
        );
        const response = await axios.get(
          `${API_ENDPOINTS.orders}/${state.editingOrder.id}`,
          createApiRequest(token)
        );
        const updatedOrder = response.data;
        const totalPrice = calculateTotalPrice(updatedOrder.orderItems);
        if (socket.connected) {
          socket.emit("orderUpdated", updatedOrder);
        } else {
          console.warn("Socket not connected, orderUpdated event not emitted");
        }
        setState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === updatedOrder.id ? { ...updatedOrder, totalPrice } : o
          ),
          editingOrder: {
            ...updatedOrder,
            orderItems: updatedOrder.orderItems,
            totalPrice,
          },
          isSaving: false,
        }));
        alert("Таом ўчирилди!");
      } catch (error) {
        const message = handleApiError(error, "Таомни ўчиришда хатолик.");
        setState((prev) => ({ ...prev, error: message, isSaving: false }));
        alert(message);
      }
    },
    [
      state.editingOrder,
      state.isSaving,
      state.orders,
      calculateTotalPrice,
      token,
    ]
  );

  const closeEditModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showEditModal: false,
      editingOrder: null,
      newItem: { productId: "", count: 1 },
      error: "",
      isSaving: false,
    }));
  }, []);

  const handleAddItem = useCallback(async () => {
    if (state.isSaving || !state.editingOrder) return;
    const { productId, count } = state.newItem;
    if (!productId || count <= 0) {
      alert("Илтимос, таом танланг ва сонини тўғри киритинг.");
      return;
    }
    const product = state.products.find((p) => p.id === parseInt(productId));
    if (!product) {
      alert("Танланган таом топилмади.");
      return;
    }
    try {
      setState((prev) => ({ ...prev, isSaving: true, error: "" }));
      const payload = {
        products: [{ productId: Number(productId), count: Number(count) }],
        tableId: state.editingOrder.tableId,
        userId: state.editingOrder.userId,
        status: state.editingOrder.status,
      };
      const response = await axios.put(
        `${API_ENDPOINTS.orders}/${state.editingOrder.id}`,
        payload,
        createApiRequest(token)
      );
      const updatedOrder = response.data;
      const totalPrice = calculateTotalPrice(updatedOrder.orderItems);
      if (socket.connected) {
        socket.emit("orderUpdated", updatedOrder);
      } else {
        console.warn("Socket not connected, orderUpdated event not emitted");
      }
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === updatedOrder.id ? { ...updatedOrder, totalPrice } : o
        ),
        editingOrder: {
          ...updatedOrder,
          orderItems: updatedOrder.orderItems,
          totalPrice,
        },
        newItem: { productId: "", count: 1 },
        isSaving: false,
      }));
      alert("Таом қўшилди!");
    } catch (error) {
      const message = handleApiError(error, "Таом қўшишда хатолик.");
      setState((prev) => ({ ...prev, error: message, isSaving: false }));
      alert(message);
    }
  }, [
    state.newItem,
    state.products,
    state.editingOrder,
    state.isSaving,
    state.orders,
    calculateTotalPrice,
    token,
  ]);

  const toggleExpandOrder = useCallback((orderId) => {
    console.log("Toggling order:", orderId);
    setState((prev) => ({
      ...prev,
      expandedOrderIds: {
        ...prev.expandedOrderIds,
        [orderId]: !prev.expandedOrderIds[orderId],
      },
    }));
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected");
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    const handleOrderCreated = (newOrder) => {
      try {
        console.log("Received orderCreated event:", newOrder);
        if (!newOrder || !newOrder.id) {
          console.error("Invalid order data received:", newOrder);
          return;
        }
        const eventKey = `orderCreated:${newOrder.id}:${
          newOrder.createdAt || Date.now()
        }`;
        if (processedEvents.current.has(eventKey)) {
          console.log(`Duplicate orderCreated event ignored: ${eventKey}`);
          return;
        }
        processedEvents.current.add(eventKey);
        setState((prev) => {
          if (prev.orders.find((order) => order.id === newOrder.id)) {
            console.log(
              `Order ${newOrder.id} already exists, ignoring creation`
            );
            return prev;
          }
          const sanitizedOrder = {
            ...newOrder,
            orderItems: Array.isArray(newOrder.orderItems)
              ? [...newOrder.orderItems]
              : [],
            table: newOrder.table || { name: "Йўқ", number: "Йўқ" },
            createdAt: newOrder.createdAt || new Date().toISOString(),
          };
          return {
            ...prev,
            orders: [sanitizedOrder, ...prev.orders],
          };
        });
      } catch (error) {
        console.error("Error in handleOrderCreated:", error);
      }
    };

    const handleOrderUpdated = (updatedOrder) => {
      try {
        console.log("Received orderUpdated event:", updatedOrder);
        if (!updatedOrder || !updatedOrder.id) {
          console.error("Invalid order data received:", updatedOrder);
          return;
        }
        const eventKey = `orderUpdated:${updatedOrder.id}:${
          updatedOrder.updatedAt || Date.now()
        }`;
        if (processedEvents.current.has(eventKey)) {
          console.log(`Duplicate orderUpdated event ignored: ${eventKey}`);
          return;
        }
        processedEvents.current.add(eventKey);
        setState((prev) => {
          const orderExists = prev.orders.some(
            (order) => order.id === updatedOrder.id
          );
          if (!orderExists) {
            console.warn(
              `Order ${updatedOrder.id} not found in local state, ignoring update`
            );
            return prev;
          }
          const updatedOrders = prev.orders.map((order) =>
            order.id === updatedOrder.id
              ? {
                  ...order,
                  ...updatedOrder,
                  orderItems: Array.isArray(updatedOrder.orderItems)
                    ? [...updatedOrder.orderItems]
                    : order.orderItems,
                  table: updatedOrder.table || order.table,
                }
              : order
          );
          return {
            ...prev,
            orders: updatedOrders,
          };
        });
      } catch (error) {
        console.error("Error in handleOrderUpdated:", error);
      }
    };

    const handleOrderDeleted = (data) => {
      try {
        console.log("Received orderDeleted event:", data);
        const id = data?.id;
        if (!id) {
          console.error("Invalid order ID received:", data);
          return;
        }
        const eventKey = `orderDeleted:${id}:${Date.now()}`;
        if (processedEvents.current.has(eventKey)) {
          console.log(`Duplicate orderDeleted event ignored: ${eventKey}`);
          return;
        }
        processedEvents.current.add(eventKey);
        setState((prev) => ({
          ...prev,
          orders: prev.orders.filter((order) => order.id !== id),
        }));
      } catch (error) {
        console.error("Error in handleOrderDeleted:", error);
      }
    };

    const handleOrderItemStatusUpdated = (updatedItem) => {
      try {
        console.log("Received orderItemStatusUpdated event:", updatedItem);
        if (!updatedItem || !updatedItem.id) {
          console.error("Invalid item data received:", updatedItem);
          return;
        }
        const eventKey = `orderItemStatusUpdated:${updatedItem.id}:${
          updatedItem.status
        }:${Date.now()}`;
        if (processedEvents.current.has(eventKey)) {
          console.log(
            `Duplicate orderItemStatusUpdated event ignored: ${eventKey}`
          );
          return;
        }
        processedEvents.current.add(eventKey);
        setState((prev) => {
          const updatedOrders = prev.orders.map((order) => {
            if (order.orderItems.some((item) => item.id === updatedItem.id)) {
              return {
                ...order,
                orderItems: order.orderItems.map((item) =>
                  item.id === updatedItem.id
                    ? { ...item, ...updatedItem }
                    : item
                ),
              };
            }
            return order;
          });
          return {
            ...prev,
            orders: updatedOrders,
          };
        });
      } catch (error) {
        console.error("Error in handleOrderItemStatusUpdated:", error);
      }
    };

    socket.onAny((event, ...args) => {
      console.log(`Received socket event: ${event}`, args);
    });

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderUpdated);
    socket.on("orderDeleted", handleOrderDeleted);
    socket.on("orderItemStatusUpdated", handleOrderItemStatusUpdated);

    fetchAllData();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderUpdated);
      socket.off("orderDeleted", handleOrderDeleted);
      socket.off("orderItemStatusUpdated", handleOrderItemStatusUpdated);
      socket.offAny();
    };
  }, [fetchAllData]);

  const filteredOrders = useMemo(() => {
    return state.orders
      .filter((order) => order.status !== "ARCHIVE")
      .filter(
        (order) =>
          state.activeFilter === "All" || order.status === state.activeFilter
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.orders, state.activeFilter]);

  const availableTables = useMemo(() => {
    return state.tables.filter((table) => table.status === "Бўш");
  }, [state.tables]);

  const getFilterCount = useCallback(
    (filterName) => {
      if (filterName === "All") {
        return state.orders.filter((o) => o.status !== "ARCHIVE").length;
      }
      return state.orders.filter((o) => o.status === filterName).length;
    },
    [state.orders]
  );

  return (
    <div className="orders-wrapper">
      <div
        style={{
          margin: "0",
          marginTop: "-20px",
        }}
        className={`connection-status ${
          state.isConnected ? "connected" : "disconnected"
        }`}
      >
        <span
          className={`status-dot ${
            state.isConnected ? "connected" : "disconnected"
          }`}
        ></span>
        <span className="status-text">
          {state.isConnected ? "Реал вақтда уланиш фаол" : "Офлайн режими"}
        </span>
      </div>
      <h3 className="orders-title">Буюртмалар</h3>

      <div className="orders-container">
        {state.loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Маълумотлар юкланмоқда...</p>
          </div>
        ) : (
          <>
            <div className="order-filters">
              {filters.map((filter) => {
                const IconComponent = filter.icon;
                return (
                  <button
                    style={{ marginBottom: "0px" }}
                    key={filter.name}
                    className={`filter-button ${
                      state.activeFilter === filter.name ? "active" : ""
                    }`}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        activeFilter: filter.name,
                      }))
                    }
                  >
                    <IconComponent size={16} className="icon" />
                    <span>{filter.label}</span>
                    <span className="filter-badge">
                      {getFilterCount(filter.name)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="order-list">
              {filteredOrders.length === 0 ? (
                <div className="no-orders">
                  <p>Ушбу тоифада буюртмалар йўқ.</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const calculatedTotal = calculateTotalPrice(order.orderItems);
                  const commission =
                    calculatedTotal * (state.commissionPercent / 100);
                  const totalWithCommission = calculatedTotal + commission;
                  const isExpanded = state.expandedOrderIds[order.id] || false;

                  return (
                    <div
                      className={`order-card ${isExpanded ? "expanded" : ""}`}
                      key={`order-${order.id}`}
                    >
                      <div className="order-card__header">
                        <div className="order-card__info">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "26px",
                              marginBottom: "-5px",
                              fontWeight: "400",
                              fontFamily: "unset",
                            }}
                          >
                            <strong>
                              {order.table?.number
                                ? order.table?.name
                                : "Доставка"}{" "}
                              -{" "}
                            </strong>
                            <strong>
                              {order.table?.number ||
                                order.carrierNumber ||
                                "Йўқ"}
                            </strong>
                            {order.user && (
                              <span
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "normal",
                                  color: "#555",
                                  marginLeft: "10px",
                                }}
                              >
                                ({order.user.name || "Номаълум"} -{" "}
                                {ROLE_LABELS[order.user.role] ||
                                  order.user.role ||
                                  "Номаълум"}
                                )
                              </span>
                            )}
                          </div>
                          <span className="order-card__table">
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "unset",
                              }}
                              className="order-card__id"
                            >
                              Буюртма №{order.id}
                            </span>
                          </span>
                        </div>
                        <div className="order-card__actions">
                          <button
                            className="order-card__change-table-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeTable(order.id);
                            }}
                            title="Столни ўзгартириш"
                          >
                            <ArrowLeftRight size={20} />
                          </button>
                          <button
                            className="order-card__edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOrder(order);
                            }}
                            title="Таҳрирлаш"
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            className="order-card__delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
                            title="Ўчириш"
                          >
                            <Trash size={20} />
                          </button>
                          <button
                            className={`order-card__toggle-btn ${
                              isExpanded ? "expanded" : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpandOrder(order.id);
                            }}
                            title={isExpanded ? "Ёпиш" : "Очиш"}
                            style={{
                              border: "none",
                              cursor: "pointer",
                              padding: "5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Menu size={20} />
                          </button>
                        </div>
                      </div>

                      {!isExpanded && (
                        <div className="order-card__collapsed">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                            className="order-card__time"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "20px",
                              }}
                            >
                              <div>
                                <p className="order-card__time-label">
                                  Буюртма вақти:
                                </p>
                                <p className="order-card__time-value">
                                  {new Date(order.createdAt).toLocaleString(
                                    "uz-UZ",
                                    {
                                      timeZone: "Asia/Tashkent",
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                              <div>
                                <h4 style={{ marginBottom: "0px" }}>
                                  Умумий нархи:{" "}
                                </h4>
                                <strong
                                  style={{
                                    fontSize: "20px",
                                    color: "#000",
                                    marginLeft: "0px",
                                  }}
                                >
                                  {formatPrice(totalWithCommission)}
                                </strong>
                              </div>
                            </div>
                            {order.status === "COMPLETED" && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "end",
                                  gap: "10px",
                                }}
                              >
                                <button
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                  }}
                                  className="order-card__print-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintOnly(order);
                                  }}
                                  title="Фақат чоп этиш"
                                >
                                  <PrinterIcon />
                                </button>
                                <button
                                  style={{
                                    marginTop: "5px",
                                    marginBottom: "0px",
                                  }}
                                  className="order-card__print-btn"
                                  onClick={() => handleCloseAndPrint(order)}
                                >
                                  Тўлаш ва чоп этиш <Printer size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div
                            className={`order-card__status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="order-card__details">
                          <div className="order-card__items">
                            <ol
                              style={{
                                listStyleType: "decimal",
                                paddingLeft: "20px",
                              }}
                            >
                              {(order.orderItems || []).map((item, index) => (
                                <li
                                  className="order-item"
                                  key={`${item.id}-${item.status}`}
                                >
                                  <div className="order-item__info">
                                    <p className="order-item__name">
                                      <strong>
                                        {index + 1}
                                        {") "}
                                      </strong>
                                      {item.product?.name || "Номаълум таом"}
                                    </p>
                                    <p className="order-item__price">
                                      {formatPrice(item.product?.price || 0)} (x
                                      {item.count})
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>

                          <div className="order-card__body">
                            <div
                              style={{ marginLeft: "-20px" }}
                              className="order-card__stats"
                            >
                              <p
                                style={{
                                  fontSize: "16px",
                                  marginBottom: "-10px",
                                  marginTop: "-15px",
                                }}
                              >
                                Таомлар сони:{" "}
                                <strong>
                                  {order.orderItems?.reduce(
                                    (sum, item) => sum + item.count,
                                    0
                                  ) || 0}
                                </strong>
                              </p>
                              <p
                                style={{
                                  fontSize: "22px",
                                  marginTop: "0px",
                                  marginBottom: "-10px",
                                }}
                                className="order-card__total"
                              >
                                Жами (комиссия билан):{" "}
                                <strong style={{ color: "#000" }}>
                                  {formatPrice(totalWithCommission)}
                                </strong>
                              </p>
                            </div>
                            <div
                              style={{
                                marginBottom: "15px",
                                marginLeft: "-20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                              className="order-card__time"
                            >
                              <div>
                                <p className="order-card__time-label">
                                  Буюртма вақти:
                                </p>
                                <p className="order-card__time-value">
                                  {new Date(order.createdAt).toLocaleString(
                                    "uz-UZ",
                                    {
                                      timeZone: "Asia/Tashkent",
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                              {order.status === "COMPLETED" && (
                                <button
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    marginBottom: "0px",
                                  }}
                                  className="order-card__print-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintOnly(order);
                                  }}
                                  title="Фақат чоп этиш"
                                >
                                  <PrinterIcon />
                                </button>
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "40px",
                            }}
                          >
                            {order.status === "COMPLETED" && (
                              <button
                                style={{
                                  marginTop: "-10px",
                                  marginBottom: "0px",
                                }}
                                className="order-card__print-btn"
                                onClick={() => handleCloseAndPrint(order)}
                              >
                                Тўлаш ва чоп этиш <Printer size={20} />
                              </button>
                            )}

                            <div
                              style={{ marginTop: "-30px" }}
                              className={`order-card__status ${getStatusClass(
                                order.status
                              )}`}
                            >
                              {STATUS_LABELS[order.status] || order.status}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {state.showEditModal && state.editingOrder && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal1" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                Буюртма №{state.editingOrder.id} ни таҳрирлаш
              </h2>
              <button className="modal__close-btn" onClick={closeEditModal}>
                <X color="#000" size={24} />
              </button>
            </div>

            <div className="modal__content">
              {state.error && <p className="error-message">{state.error}</p>}
              {state.isSaving && (
                <p className="saving-message">Сақланмоқда...</p>
              )}
              <div className="modal__items">
                <h3>Жорий таомлар:</h3>
                {state.editingOrder.orderItems.length ? (
                  <div className="modal__items-list">
                    {state.editingOrder.orderItems.map((item) => (
                      <div
                        className="modal__item"
                        key={item.id || item.productId}
                      >
                        <div className="modal__item-info">
                          <span className="modal__item-name">
                            {item.product?.name || "Номаълум таом"}
                          </span>
                          <span className="modal__item-details">
                            Сони: {item.count} |{" "}
                            {formatPrice(item.product?.price || 0)}
                          </span>
                        </div>
                        <button
                          className="modal__item-remove"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={state.isSaving}
                        >
                          Ўчириш
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="modal__empty">Таомлар йўқ.</p>
                )}
              </div>

              <div className="modal__add-section">
                <h3 className="modal__add-title">Янги таом қўшиш:</h3>
                <div className="modal__add-form">
                  <select
                    className="modal__select"
                    value={state.newItem.productId}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        newItem: { ...prev.newItem, productId: e.target.value },
                      }))
                    }
                    style={{ color: "#000" }}
                    disabled={state.isSaving}
                  >
                    <option value="">Таом танланг</option>
                    {state.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({formatPrice(product.price)})
                      </option>
                    ))}
                  </select>
                  <input
                    className="modal__input"
                    type="number"
                    min="1"
                    value={state.newItem.count}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        newItem: {
                          ...prev.newItem,
                          count: parseInt(e.target.value) || 1,
                        },
                      }))
                    }
                    placeholder="Сони"
                    style={{ color: "#000" }}
                    disabled={state.isSaving}
                  />
                  <button
                    style={{
                      color: "#fff",
                      border: "none",
                      padding: "10px 20px",
                      cursor: state.isSaving ? "not-allowed" : "pointer",
                      backgroundColor: state.isSaving ? "#6c757d" : "#007bff",
                    }}
                    className="modal__add-btn"
                    onClick={handleAddItem}
                    disabled={state.isSaving}
                  >
                    Қўшиш
                  </button>
                </div>
              </div>

              <div className="modal__footer">
                <div className="modal__total">
                  Жами (комиссия билан):{" "}
                  {formatPrice(
                    calculateTotalPrice(state.editingOrder.orderItems) +
                      calculateTotalPrice(state.editingOrder.orderItems) *
                        (state.commissionPercent / 100)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.showChangeTableModal && (
        <div className="modal-overlay" onClick={closeChangeTableModal}>
          <div className="modal1" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                Буюртма №{state.selectedOrderId} учун столни ўзгартириш
              </h2>
              <button
                className="modal__close-btn"
                onClick={closeChangeTableModal}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal__content">
              {state.error && <p className="error-message">{state.error}</p>}
              {state.isSaving && (
                <p className="saving-message">Сақланмоқда...</p>
              )}
              <div className="modal__add-section">
                <h3 className="modal__add-title">Бўш столлар:</h3>
                {availableTables.length ? (
                  <select
                    className="modal__select"
                    value={state.selectedTableId || ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        selectedTableId: parseInt(e.target.value),
                      }))
                    }
                    style={{ color: "#000" }}
                    disabled={state.isSaving}
                  >
                    <option value="">Стол танланг</option>
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} - {table.number}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="modal__empty">Бўш столлар йўқ.</p>
                )}
              </div>
            </div>
            <div className="modal__footer">
              <button
                className="modal__cancel-btn"
                onClick={handleSaveTableChange}
                style={{
                  backgroundColor: "#10B981",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: state.isSaving ? "not-allowed" : "pointer",
                }}
                disabled={state.isSaving}
              >
                Сақлаш
              </button>
              <button
                className="modal__cancel-btn"
                onClick={closeChangeTableModal}
                style={{
                  backgroundColor: "#EF4044",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Бекор қилиш
              </button>
            </div>
          </div>
        </div>
      )}

      {state.showInitialDeleteConfirmModal && (
        <div className="modal-overlay" onClick={cancelInitialDelete}>
          <div className="modal1" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Огоҳлантириш</h2>
              <button
                className="modal__close-btn"
                onClick={cancelInitialDelete}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal__content">
              <p>Ушбу буюртмани ўчиришни хоҳлайсизми?</p>
            </div>
            <div className="modal__footer">
              <button
                className="modal__cancel-btn"
                onClick={confirmInitialDelete}
                style={{
                  backgroundColor: "#EF4044",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Ҳа
              </button>
              <button
                className="modal__cancel-btn"
                onClick={cancelInitialDelete}
                style={{
                  backgroundColor: "#10B981",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Йўқ
              </button>
            </div>
          </div>
        </div>
      )}

      {state.showDeleteConfirmModal && (
        <div className="modal-overlay" onClick={cancelDeleteOrder}>
          <div
            className="modal1"
            style={{ backgroundColor: "rgb(172, 172, 172)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2 className="modal__title">Буюртмани ўчириш</h2>
              <button className="modal__close-btn" onClick={cancelDeleteOrder}>
                <X size={24} />
              </button>
            </div>
            <div className="modal__content">
              <p>
                Ростдан ҳам ушбу буюртмани ўчирмоқчимисиз? Бу амални ортга
                қайтариб бўлмайди!
              </p>
            </div>
            <div className="modal__footer">
              <button
                className="modal__cancel-btn"
                onClick={confirmDeleteOrder}
                style={{
                  backgroundColor: "#EF4044",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Ҳа
              </button>
              <button
                className="modal__cancel-btn"
                onClick={cancelDeleteOrder}
                style={{
                  backgroundColor: "#10B981",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Йўқ
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "none" }}>
        <Receipt
          ref={receiptRef}
          order={
            state.currentOrder
              ? deepClone({
                  id: state.currentOrder.id || null,
                  orderItems: state.currentOrder.orderItems || [],
                  tableNumber:
                    state.currentOrder.table?.number ||
                    state.currentOrder.carrierNumber ||
                    "",
                  totalPrice: calculateTotalPrice(
                    state.currentOrder.orderItems
                  ),
                  commission:
                    calculateTotalPrice(state.currentOrder.orderItems) *
                    (state.commissionPercent / 100),
                  totalWithCommission:
                    calculateTotalPrice(state.currentOrder.orderItems) +
                    calculateTotalPrice(state.currentOrder.orderItems) *
                      (state.commissionPercent / 100),
                  createdAt: state.currentOrder.createdAt || null,
                })
              : {
                  id: null,
                  orderItems: [],
                  tableNumber: "",
                  totalPrice: 0,
                  commission: 0,
                  totalWithCommission: 0,
                  createdAt: null,
                }
          }
        />
      </div>
    </div>
  );
}
