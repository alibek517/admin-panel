import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { Plus, Edit, Trash, Phone, Loader2 } from "lucide-react";
import { setRestaurantName } from "../store/actions/restaurantSlice";
import "./styles/Sozlamalar.css";

const roleOptions = [
  { id: 1, value: "KITCHEN", label: "Ошпаз" },
  { id: 2, value: "CASHIER", label: "Официант" },
  { id: 3, value: "CUSTOMER", label: "Админ" },
  { id: 4, value: "BIGADMIN", label: "Директор" },
];

export default function Sozlamalar() {
  const dispatch = useDispatch();
  const restaurantName = useSelector(
    (state) => state.restaurant.restaurantName
  );
  const [tempRestaurantName, setTempRestaurantName] = useState(restaurantName);
  const [staff, setStaff] = useState([]);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    surname: "",
    username: "",
    phone: "",
    password: "",
    role: "KITCHEN",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commissionPercent, setCommissionPercent] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://192.168.100.99:3000/user", {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        });
        const users = response.data.map((user) => ({
          id: user.id,
          role: user.role || "KITCHEN",
          name: user.name || "",
          surname: user.surname || "",
          phone: user.phone || "",
          username: user.username || "",
          password: "",
        }));
        setStaff(users);

        try {
          const restaurantResponse = await axios.get("http://192.168.100.99:3000/", {
            headers: {
              "Content-Type": "application/json",
              ...(localStorage.getItem("token") && {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              }),
            },
          });
          dispatch(
            setRestaurantName(restaurantResponse.data.name || "Отабек кафе")
          );
          setTempRestaurantName(restaurantResponse.data.name || "Отабек кафе");
        } catch (err) {
          dispatch(setRestaurantName("Отабек кафе"));
          setTempRestaurantName("Отабек кафе");
        }

        try {
          const commissionResponse = await axios.get(
            "http://192.168.100.99:3000/percent",
            {
              headers: {
                "Content-Type": "application/json",
                ...(localStorage.getItem("token") && {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                }),
              },
            }
          );
          if (commissionResponse.data.length > 0) {
            setCommissionPercent(commissionResponse.data[0].percent);
            console.log(
              `Commission loaded from: http://192.168.100.99:3000/percent`
            );
          } else {
            setCommissionPercent(0);
            console.warn("No commission data found, using default 0");
          }
        } catch (err) {
          setCommissionPercent(0);
          console.error(
            "Failed to load commission:",
            err.response?.status,
            err.response?.data
          );
        }
      } catch (err) {
        setError("Маълумотларни юклашда хатолик юз берди.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch]);

  const handleRestaurantNameSave = async () => {
    if (!tempRestaurantName.trim()) {
      alert("Чойхона номи бўш бўлиши мумкин эмас.");
      return;
    }
    try {
      await axios.put(
        "http://192.168.100.99:3000",
        { name: tempRestaurantName },
        {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        }
      );
      dispatch(setRestaurantName(tempRestaurantName));
      alert("Номи сақланди.");
    } catch (err) {
      dispatch(setRestaurantName(tempRestaurantName));
      alert("Номи маҳаллий равишда сақланди.");
    }
  };

  const handleStaffSave = async () => {
    if (editingStaff.password && editingStaff.password.length < 8) {
      alert("Парол камида 8 та белгидан иборат бўлиши керак.");
      return;
    }

    try {
      const staffData = {
        username: editingStaff.username,
        password: editingStaff.password,
        phone: editingStaff.phone,
        role: editingStaff.role,
      };
      await axios.put(
        `http://192.168.100.99:3000/user/${editingStaff.id}`,
        staffData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        }
      );
      setStaff((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id ? { ...editingStaff, ...staffData } : s
        )
      );
      setEditingStaff(null);
    } catch (err) {
      alert("Ходим маълумотларини сақлашда хатолик юз берди.");
    }
  };

  const handleAddStaff = async () => {
    if (
      !newStaff.name ||
      !newStaff.phone ||
      !newStaff.username ||
      !newStaff.password
    ) {
      alert("Барча мажбурий майдонларни тўлдиринг.");
      return;
    }

    if (newStaff.password.length < 8) {
      alert("Парол камида 8 та белгидан иборат бўлиши керак.");
      return;
    }

    try {
      const staffData = {
        name: newStaff.name,
        surname: newStaff.surname,
        username: newStaff.username,
        phone: newStaff.phone,
        password: newStaff.password,
        role: newStaff.role,
      };
      const response = await axios.post(
        "http://192.168.100.99:3000/user",
        staffData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        }
      );
      setStaff([...staff, { id: response.data.id, ...staffData }]);
      setNewStaff({
        name: "",
        surname: "",
        username: "",
        phone: "",
        password: "",
        role: "KITCHEN",
      });
      setShowAddModal(false);
    } catch (err) {
      alert("Ходим қўшишда хатолик юз берди.");
    }
  };

  const handleSaveCommission = async () => {
    try {
      const commissionData = { percent: commissionPercent };
      const response = await axios.patch(
        "http://192.168.100.99:3000/percent/1",
        commissionData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("token") && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
        }
      );
      if (response.status === 200) {
        alert("Комиссия фоизи сақланди.");
      } else {
        throw new Error("Unexpected response status");
      }
    } catch (err) {
      alert("Комиссия фоизини сақлашда хатолик юз берди.");
      console.error(
        "Save commission error:",
        err.response?.status,
        err.response?.data
      );
    }
  };

  const handleCommissionChange = (newValue) => {
    if (newValue >= 0 && newValue <= 100) {
      setCommissionPercent(newValue);
    }
  };

  const formatPrice = useCallback((price) => {
    return (
      price
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .replace(/\.00$/, "")
        .trim() + " сўм"
    );
  }, []);

  const totalAmount = 100000 + 100000 * (commissionPercent / 100);

  return (
    <div className="container">
      <header className="app-header">
        <h1 style={{ color: "#ffffff", marginLeft: "25px" }} className="app-title">
          Созламалар
        </h1>
      </header>
      <section
        style={{
          marginBottom: "-25px",
          marginTop: "-5px",
        }}
        className="restaurant-name-section"
      >
        <label
          style={{
            marginTop: "5px",
            marginBottom: "0px",
            color: "#000",
          }}
          className="section-title"
        >
          Чойхона номи
        </label>
        <div className="form-group">
          <input
            style={{
              width: "300px",
            }}
            type="text"
            className="form-control"
            placeholder="Чойхона номини киритинг"
            value={tempRestaurantName}
            onChange={(e) => setTempRestaurantName(e.target.value)}
          />
          <button
            style={{
              marginTop: "10px",
            }}
            className="btn btn-success"
            onClick={handleRestaurantNameSave}
          >
            Сақлаш
          </button>
        </div>
      </section>
      <section className="add-employee-section">
        <h2
          style={{ color: "#000", marginBottom: "0px" }}
          className="section-title"
        >
          Ходимлар
        </h2>
        {loading ? (
          <div className="spinner">
            <Loader2 className="animate-spin" />
          </div>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <>
            <button
              className="btn btn-primary btn-with-icon"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              Ходим қўшиш
            </button>
            <div className="employees-grid">
              {staff.map((person) => (
                <div
                  key={person.id}
                  className="employee-card"
                  data-position={
                    person.role === 'KITCHEN'
                      ? 'Oshpaz'
                      : person.role === 'CASHIER'
                      ? 'Ofitsiant'
                      : person.role === 'CUSTOMER'
                      ? 'Menejer'
                      : 'Direktor'
                  }
                >
                  <div className="employee-position">
                    {person.role === 'KITCHEN'
                      ? 'Oshpaz'
                      : person.role === 'CASHIER'
                      ? 'Ofitsiant'
                      : person.role === 'CUSTOMER'
                      ? 'Admin'
                      : 'Direktor'}
                  </div>
                  <h3 className="employee-name">
                    {person.name} {person.surname}
                  </h3>
                  <div className="employee-contact">
                    <Phone size={16} className="employee-contact-icon" />
                    <span>{person.phone}</span>
                  </div>
                  <div className="employee-actions">
                    <button
                      className="btn btn-primary employee-action-btn btn-with-icon"
                      onClick={() => setEditingStaff(person)}
                    >
                      <Edit size={16} />
                      Таҳрирлаш
                    </button>
                    <button
                      className="btn btn-danger employee-action-btn btn-with-icon"
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          `"${person.name} ${person.surname}" (${
                            person.role === "KITCHEN"
                              ? "Oshpaz"
                              : person.role === "CASHIER"
                              ? "Ofitsiant"
                              : person.role === "CUSTOMER"
                              ? "Admin"
                              : "Direktor"
                          }) haqiqatdan o'chirilsinmi?`
                        );
                        if (confirmDelete) {
                          axios
                            .delete(`http://192.168.100.99:3000/user/${person.id}`, {
                              headers: {
                                "Content-Type": "application/json",
                                ...(localStorage.getItem("token") && {
                                  Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                  )}`,
                                }),
                              },
                            })
                            .then(() => {
                              setStaff(staff.filter((s) => s.id !== person.id));
                            })
                            .catch((err) => {
                              alert("Ходимни ўчиришда хатолик юз берди.");
                            });
                        }
                      }}
                    >
                      <Trash size={16} />
                      Ўчириш
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section style={{ marginTop: "-25px" }} className="commission-section">
        <label
          style={{ color: "#000", marginBottom: "5px" }}
          className="section-title"
        >
          Комиссия фоизи
        </label>
        <div className="form-group">
          <input
            style={{ width: "200px", height: "50px", fontSize: "20px" }}
            type="number"
            className="form-control"
            onChange={(e) => handleCommissionChange(Number(e.target.value))}
            min="0"
            max="100"
            step="0.1"
            placeholder="Комиссия фоизини киритинг"
          />
          
          <div className="commission-info">
            <p>Намуна буюртма суммаси: {formatPrice((100000).toFixed(2))}</p>
            <p>
              Комиссия ({commissionPercent}%):{" "}
              {formatPrice((100000 * (commissionPercent / 100)).toFixed(2))}
            </p>
            <p className="font-bold">
              Жами сумма: {formatPrice(totalAmount.toFixed(2))}
            </p>
          </div>
          <button
            style={{ marginTop: "10px" }}
            className="btn btn-success"
            onClick={handleSaveCommission}
          >
            Сақлаш
          </button>
        </div>
      </section>
      
      {/* Updated Add Staff Modal - Full Height with Scroll */}
      {showAddModal && (
        <div
          className={`modal-backdrop ${showAddModal ? "active" : ""}`}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="modal-fullscreen fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{
              height: '100vh',
              width: '100%',
              maxWidth: '500px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '0',
              overflow: 'hidden'
            }}
          >
            <div 
              className="modal-header"
              style={{
                padding: '20px',
                borderBottom: '1px solid #e5e5e5',
                flexShrink: 0,
                backgroundColor: '#f8f9fa'
              }}
            >
              <h3 className="modal-title" style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Ходим қўшиш
              </h3>
            </div>
            
            <div 
              className="modal-body-scrollable"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Лавозим
                  </label>
                  <select
                    className="form-control"
                    value={newStaff.role}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, role: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Исм
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Исм"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Фамилия
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Фамилия"
                    value={newStaff.surname}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, surname: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Логин
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Логин"
                    value={newStaff.username}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, username: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Телефон
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+998 XX XXX XX XX"
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Парол
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Парол"
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div 
              className="modal-footer"
              style={{
                padding: '20px',
                borderTop: '1px solid #e5e5e5',
                flexShrink: 0,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                backgroundColor: '#f8f9fa'
              }}
            >
              <button 
                className="btn btn-success" 
                onClick={handleAddStaff}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Қўшиш
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Бекор қилиш
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Staff Modal */}
      {editingStaff && (
        <div
          className={`modal-backdrop ${editingStaff ? "active" : ""}`}
          onClick={() => setEditingStaff(null)}
        >
          <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ходимни таҳрирлаш</h3>
            </div>
            <div className="modal-body1">
              <div className="form-group">
                <label className="form-label">Лавозим</label>
                <select
                  className="form-control"
                  value={editingStaff.role}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value })
                  }
                >
                  {roleOptions.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Логин</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Логин"
                  value={editingStaff.username}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      username: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Янги парол (агар керак бўлса)
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Янги парол (агар керак бўлса)"
                  value={editingStaff.password}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      password: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+998 XX XXX XX XX"
                  value={editingStaff.phone}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-success" onClick={handleStaffSave}>
                Сақлаш
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setEditingStaff(null)}
              >
                Бекор қилиш
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}