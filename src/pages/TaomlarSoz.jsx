import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus, Edit, Trash, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import "./styles/TaomlarSoz.css";

export default function TaomlarSoz() {
  const [menu, setMenu] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newCategory, setNewCategory] = useState("Ҳаммаси");
  const [dishes, setDishes] = useState({
    id: null,
    name: "",
    cookingTime: "",
    price: "",
    image: null,
    categoryId: null,
    assignedToId: null,
    createdAt: null,
    category: null,
  });
  const [categoryList, setCategoryList] = useState([]);
  const [kitchenStaff, setKitchenStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Rasm faylini JPG formatiga aylantirish funksiyasi
  const convertToJPG = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Rasmning o'lchamini sozlash (maksimal 800px)
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Oq fon qo'shish (JPG uchun zarur)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Rasmni chizish
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPG formatida blob yaratish
        canvas.toBlob((blob) => {
          // Fayl nomini JPG ga o'zgartirish
          const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
          const jpgFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(jpgFile);
        }, 'image/jpeg', 0.85); // 85% sifat
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const fetchMenu = () => {
    setLoading(true);
    axios
      .get("https://alikafecrm.uz/product", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setMenu(res.data))
      .catch((err) => console.error("Менюни юклашда хатолик:", err))
      .finally(() => setLoading(false));
  };

  const fetchCategories = () => {
    setLoading(true);
    axios
      .get("https://alikafecrm.uz/category", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCategoryList(res.data))
      .catch((err) => console.error("Категория олишда хатолик:", err))
      .finally(() => setLoading(false));
  };

  const fetchKitchenStaff = () => {
    setLoading(true);
    axios
      .get("https://alikafecrm.uz/user?role=KITCHEN", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setKitchenStaff(res.data))
      .catch((err) => console.error("Ошпазларни олишда хатолик:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenu();
    fetchCategories();
    fetchKitchenStaff();
  }, []);

  const resetDish = () => {
    setDishes({
      id: null,
      name: "",
      cookingTime: "",
      price: "",
      image: null,
      categoryId: null,
      assignedToId: null,
      createdAt: null,
      category: null,
    });
  };

  const handleAddDish = () => {
    console.log("handleAddDish boshlandi");
    console.log("dishes:", dishes);
    
    // Validatsiya
    if (!dishes.name || !dishes.name.trim()) {
      alert("Илтимос, таом номини киритинг.");
      return;
    }
    
    if (!dishes.price || isNaN(parseInt(dishes.price)) || parseInt(dishes.price) <= 0) {
      alert("Илтимос, тўғри нархни киритинг.");
      return;
    }

    const formData = new FormData();
    formData.append("name", dishes.name.trim());
    formData.append("price", parseInt(dishes.price));
    
    if (dishes.cookingTime && dishes.cookingTime.trim()) {
      formData.append("cookingTime", dishes.cookingTime.trim());
    }
    
    if (dishes.categoryId) {
      formData.append("categoryId", dishes.categoryId);
    }
    
    if (dishes.assignedToId) {
      formData.append("assignedToId", dishes.assignedToId);
    }
    
    if (dishes.image && typeof dishes.image !== "string") {
      formData.append("image", dishes.image);
    }

    console.log("FormData tayyor:");
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    const request = editing
      ? axios.put(`https://alikafecrm.uz/product/${dishes.id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        })
      : axios.post("https://alikafecrm.uz/product", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });

    console.log("So'rov yuborilmoqda...");
    request
      .then((response) => {
        console.log("Muvaffaqiyatli javob:", response.data);
        fetchMenu();
        setShowModal(false);
        setEditing(false);
        resetDish();
        alert("Таом муваффақиятли қўшилди!");
      })
      .catch((err) => {
        console.error(`${editing ? "Таҳрирлашда" : "Қўшишда"} хатолик:`, err);
        console.error("Xatolik ma'lumotlari:", err.response?.data);
        console.error("Status:", err.response?.status);
        
        let errorMessage = "Номаълум хатолик";
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        alert(`Хатолик: ${errorMessage}`);
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("Таомни ўчиришни хоҳлайсизми?")) {
      axios
        .delete(`https://alikafecrm.uz/product/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then(() => fetchMenu())
        .catch((err) => {
          alert("Бу таом ўчириб бўлмайди. Балки у заказга боғланган.");
          console.error("Ўчиришда хатолик:", err);
        });
    }
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm("Категорияни ўчиришни хоўлайсизми?")) {
      axios
        .delete(`https://alikafecrm.uz/category/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then(() => {
          fetchCategories();
          setNewCategory("Ҳаммаси");
        })
        .catch((err) => {
          alert("Категорияни ўчириб бўлмади. Балки у таомга боғланган.");
          console.error("Категория ўчиришда хатолик:", err);
        });
    }
  };

  const handleEdit = (dish) => {
    setDishes({
      id: dish.id,
      name: dish.name,
      cookingTime: dish.cookingTime || "",
      price: dish.price,
      image: dish.image,
      categoryId: dish.categoryId ?? null,
      assignedToId: dish.assignedToId ?? null,
      createdAt: dish.createdAt ?? null,
      category: dish.category ?? null,
    });
    setEditing(true);
    setShowModal(true);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -150, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 150, behavior: "smooth" });
    }
  };

  const filteredMenu =
    newCategory === "Ҳаммаси"
      ? menu
      : menu.filter((item) => item.category?.name === newCategory);

  const formatPrice = (price) => {
    const priceStr = price.toString();
    const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " сўм";
  };

  const uniqueCategories = [
    "Ҳаммаси",
    ...categoryList
      .map((cat) => cat.name)
      .filter((name) => name !== "Ҳаммаси"),
  ];

  return (
    <div className="container">
      <header
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-white)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          left: 0,
          right: 0,
          marginTop: "var(--spacing-10)",
        }}
      >
        <div className="header-container">
          <h1 className="header-title">Таомлар созламаси</h1>
        </div>
      </header>
      <section>
        <div className="category-tabs-container">
          <button
            style={{
              marginBottom: "20px",
              marginRight: "10px",
            }}
            className="scroll-arrow left"
            onClick={scrollLeft}
          >
            <ChevronLeft size={30} />
          </button>
          <nav className="category-tabs" ref={scrollRef}>
            {uniqueCategories.map((cat) => {
              const realCat = categoryList.find((c) => c.name === cat);
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center" }}>
                  <button
                    className={`category-tab ${
                      newCategory === cat ? "active" : ""
                    }`}
                    onClick={() => setNewCategory(cat)}
                  >
                    {cat}
                  </button>
                  {cat !== "Ҳаммаси" && (
                    <button
                      className="food-card-button delete"
                      onClick={() => handleDeleteCategory(realCat?.id)}
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </nav>
          <button
            style={{
              marginBottom: "20px",
              marginLeft: "10px",
            }}
            className="scroll-arrow right"
            onClick={scrollRight}
          >
            <ChevronRight size={30} />
          </button>
        </div>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div className="food-grid">
            {/* "+ Таом қўшиш" tugmasi doimo ko'rinadi */}
            <article
              className="add-food-card"
              onClick={() => {
                resetDish();
                setShowModal(true);
                setEditing(false);
              }}
            >
              <div className="add-food-icon">
                <Plus size={32} />
              </div>
              <h3 className="add-food-text">Таом қўшиш</h3>
            </article>
            
            {/* Agar filtrlangan menu bo'sh bo'lsa, xabar ko'rsatiladi */}
            {filteredMenu.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                <div className="empty-state-icon">
                  <Plus size={48} />
                </div>
                <h2 className="empty-state-title">Бу категорияда таомлар топилмади</h2>
                <p className="empty-state-text">
                  Янги таом қўшиш учун "Таом қўшиш" тугмасини босинг.
                </p>
              </div>
            ) : (
              // Mavjud taomlarni ko'rsatish
              filteredMenu.map((i) => (
                <article key={i.id} className="food-card">
                  <div className="food-card-image-container">
                    <img
                      className="food-card-image"
                      src={`https://alikafecrm.uz${i.image}`}
                      alt={i.name}
                    />
                  </div>
                  <div className="food-card-content">
                    <h3 className="food-card-title">{i.name}</h3>
                    <div className="food-card-meta">
                      <div className="food-card-time">
                        <Clock size={16} className="food-card-time-icon" />
                        <span>{i.cookingTime ? `${i.cookingTime} мин` : "Вақти йўқ"}</span>
                      </div>
                    </div>
                    <div className="food-card-price">{formatPrice(i.price)}</div>
                    <div className="food-card-actions">
                      <button
                        className="food-card-button edit"
                        onClick={() => handleEdit(i)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="food-card-button delete"
                        onClick={() => handleDelete(i.id)}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {showModal && (
          <div
            className={`modal-backdrop ${showModal ? "active" : ""}`}
            onClick={() => {
              setShowModal(false);
              setEditing(false);
              resetDish();
            }}
          >
            <div style={{ overflow: "scroll", height: '100vh', backgroundColor: '#fff' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {editing ? "Таомни таҳрирлаш" : "Янги таом қўшиш"}
                </h2>
              </div>
              <div className="modal-body1">
                {editing && typeof dishes.image === "string" && (
                  <img
                    src={`https://alikafecrm.uz${dishes.image}`}
                    alt="Жорий"
                    style={{
                      width: "100px",
                      marginBottom: "var(--spacing-3)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                )}
                <div className="form-group">
                  <label className="form-label">Таом номи</label>
                  <input
                    type="text"
                    placeholder="Таом номи"
                    className="form-control"
                    value={dishes.name || ""}
                    onChange={(e) =>
                      setDishes({ ...dishes, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Нархи</label>
                  <input
                    type="number"
                    placeholder="Нархи"
                    className="form-control"
                    value={dishes.price || ""}
                    onChange={(e) =>
                      setDishes({ ...dishes, price: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Тайёрланиш вақти (мин)</label>
                  <input
                    type="number"
                    placeholder="Тайёрланиш вақти (мин)"
                    className="form-control"
                    value={dishes.cookingTime || ""}
                    onChange={(e) =>
                      setDishes({ ...dishes, cookingTime: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Расм (автоматик JPG га айлантирилади)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          console.log("Asl fayl:", file.name, file.type);
                          const jpgFile = await convertToJPG(file);
                          console.log("JPG ga aylantirildi:", jpgFile.name, jpgFile.type);
                          setDishes({ ...dishes, image: jpgFile });
                        } catch (error) {
                          console.error("Rasm konvertatsiya qilishda xatolik:", error);
                          alert("Rasmni qayta ishlashda xatolik yuz berdi.");
                        }
                      }
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Har qanday rasm formati JPG ga aylantiriladi va o'lchami optimallashtiriladi
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Категория</label>
                  <select
                    className="form-control"
                    value={dishes.categoryId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDishes({
                        ...dishes,
                        categoryId: val === "" ? null : parseInt(val),
                      });
                    }}
                  >
                    <option value="">Категория танланг</option>
                    {categoryList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ошпаз</label>
                  <select
                    className="form-control"
                    value={dishes.assignedToId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDishes({
                        ...dishes,
                        assignedToId: val === "" ? null : parseInt(val),
                      });
                    }}
                  >
                    <option value="">Ошпаз танланг (авто-танлов)</option>
                    {kitchenStaff
                      .filter((user) => user.role === "KITCHEN" && user.name !== "." && user.username !== ".")
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.username})
                        </option>
                      ))}
                  </select>
                </div>
                <div
                  className="form-group"
                  style={{
                    display: "flex",
                    gap: "var(--spacing-3)",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Янги категория номи</label>
                    <input
                      type="text"
                      placeholder="Янги категория номи"
                      className="form-control"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      if (!newCategory.trim()) {
                        alert("Категория номини киритинг.");
                        return;
                      }
                      axios
                        .post(
                          "https://alikafecrm.uz/category",
                          { name: newCategory.trim() },
                          {
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                          }
                        )
                        .then((res) => {
                          const added = res.data;
                          setCategoryList((prev) => [...prev, added]);
                          setDishes((prev) => ({
                            ...prev,
                            categoryId: added.id,
                          }));
                          setNewCategory("Ҳаммаси");
                        })
                        .catch((err) => {
                          console.error("Категория қўшишда хатолик:", err);
                          alert("Категория қўшилмади.");
                        });
                    }}
                  >
                    Қўшиш
                  </button>
                </div>
              </div>
              <div>
                <button className="btn btn-success" onClick={handleAddDish}>
                  {editing ? "Сақлаш" : "Қўшиш"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(false);
                    resetDish();
                  }}
                >
                  Бекор қилиш
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}