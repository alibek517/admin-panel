import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus, Edit, Trash, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import "./styles/TaomlarSoz.css";

export default function TaomlarSoz() {
  const [menu, setMenu] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newCategory, setNewCategory] = useState("");
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
  const [swapMode, setSwapMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const scrollRef = useRef(null);

  const convertToJPG = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
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

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const jpgFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(jpgFile);
          },
          "image/jpeg",
          0.85
        );
      };

      img.onerror = () => reject(new Error("Rasm yuklashda xatolik"));
      img.src = URL.createObjectURL(file);
    });
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("JWT token not found in localStorage");
      }

      const res = await axios.get("https://alikafecrm.uz/product", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(res.data)) {
        throw new Error("Expected an array from API, received: " + JSON.stringify(res.data));
      }

      const sortedMenu = res.data
        .map((item) => ({
          ...item,
          id: Number(item.id) || 0,
          categoryId: item.categoryId ? Number(item.categoryId) : null,
          index: item.index || "0",
        }))
        .sort((a, b) => Number(a.id) - Number(b.id));

      setMenu(sortedMenu);
    } catch (err) {
      console.error("Менюни юклашда хатолик:", err);
      alert(`Менюни юклашда хатолик: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get("https://alikafecrm.uz/category", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const categories = res.data.map((cat) => ({
        ...cat,
        id: Number(cat.id),
      }));
      setCategoryList(categories);
      if (categories.length > 0 && !newCategory) {
        setNewCategory(categories[0].name);
      }
    } catch (err) {
      console.error("Категория олишда хатолик:", err);
      alert("Категорияларни юклашда хатолик юз берди!");
    } finally {
      setLoading(false);
    }
  };

  const fetchKitchenStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get("https://alikafecrm.uz/user?role=KITCHEN", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setKitchenStaff(
        res.data.map((user) => ({
          ...user,
          id: Number(user.id),
        }))
      );
    } catch (err) {
      console.error("Ошпазларни олишда хатолик:", err);
      alert("Ошпазларни юклашда хатолик юз берди!");
    } finally {
      setLoading(false);
    }
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

  const handleAddDish = async () => {
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
      formData.append("categoryId", Number(dishes.categoryId));
    }

    if (dishes.assignedToId) {
      formData.append("assignedToId", Number(dishes.assignedToId));
    }

    if (dishes.image && typeof dishes.image !== "string") {
      formData.append("image", dishes.image);
    }

    try {
      const request = editing
        ? axios.put(`https://alikafecrm.uz/product/${Number(dishes.id)}`, formData, {
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

      await request;
      await fetchMenu();
      setShowModal(false);
      setEditing(false);
      resetDish();
      alert("Таом муваффақиятли қўшилди!");
    } catch (err) {
      console.error(`${editing ? "Таҳрирлашда" : "Қўшишда"} хатолик:`, err);
      alert(`Хатолик: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Таомни ўчиришни хоҳлайсизми?")) {
      try {
        await axios.delete(`https://alikafecrm.uz/product/${Number(id)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        await fetchMenu();
      } catch (err) {
        console.error("Ўчиришда хатолик:", err);
        alert("Бу таом ўчириб бўлмайди. Балки у заказга боғланган.");
      }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Категорияни ўчиришни хоҳлайсизми?")) {
      try {
        await axios.delete(`https://alikafecrm.uz/category/${Number(id)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        await fetchCategories();
        setNewCategory(categoryList[0]?.name || "");
      } catch (err) {
        console.error("Категория ўчиришда хатолик:", err);
        alert("Категорияни ўчириб бўлмади. Балки у таомга боғланган.");
      }
    }
  };

  const handleEdit = (dish) => {
    setDishes({
      id: Number(dish.id),
      name: dish.name,
      cookingTime: dish.cookingTime || "",
      price: dish.price,
      image: dish.image,
      categoryId: Number(dish.categoryId) ?? null,
      assignedToId: Number(dish.assignedToId) ?? null,
      createdAt: dish.createdAt ?? null,
      category: dish.category ?? null,
    });
    setEditing(true);
    setShowModal(true);
  };

  const handleSelectItem = (id) => {
    if (!swapMode) return;
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else if (selectedItems.length < 2) {
      setSelectedItems([...selectedItems, id]);
    } else {
      alert("Faqat ikkita taomni tanlash mumkin!");
    }
  };

  const handleSwapIds = async () => {
    if (selectedItems.length !== 2) {
      alert("Iltimos, almashish uchun roppa-rosa ikkita taomni tanlang!");
      return;
    }

    const [id1, id2] = selectedItems;

    try {
      await axios.post(
        "https://alikafecrm.uz/product/swap-ids",
        { id1: Number(id1), id2: Number(id2) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      await fetchMenu();
      setSelectedItems([]);
      setSwapMode(false);
      console.log("IDs swapped successfully");
    } catch (err) {
      console.error("ID'larni almashtirishda xatolik:", err);
      alert(`ID'larni almashtirishda xatolik: ${err.response?.data?.message || err.message}`);
      await fetchMenu();
    }
  };

  const FoodCard = ({ item }) => {
    return (
      <article
  className={`  ${selectedItems.includes(item.id) ? "selectedd" : ""}`}
  onClick={() => handleSelectItem(item.id) }
  style={{display: "flex", cursor: "pointer", justifyContent:"space-between", alignItems: "center",marginTop: "20px", padding: "10px", borderRadius: "var(--radius-md)"}}
  
>
  <img
    className="food-card-image"
    src={`https://alikafecrm.uz${item.image}`}
    alt={item.name}
  />
  <div className="food-card-content">
    <h3 className="food-card-title">{item.name}</h3>
    <div className="food-card-meta">
      <div className="food-card-time">
        <Clock size={16} className="food-card-time-icon" />
        <span>{item.cookingTime ? `${item.cookingTime} мин` : "Вақти йўқ"}</span>
      </div>
    </div>
  </div>
  <div style={{marginRight:'350px'}} className="food-card-price">{formatPrice(item.price)}</div>
  <div className="food-card-actions">
    <button
      className="food-card-button edit"
      onClick={(e) => {
        e.stopPropagation();
        handleEdit(item);
      }}
    >
      <Edit color="#fff" size={16} />
    </button>
    <button
      className="food-card-button delete"
      onClick={(e) => {
        e.stopPropagation();
        handleDelete(item.id);
      }}
    >
      <Trash color="#fff" size={16} />
    </button>
  </div>
</article>
    );
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

  const filteredMenu = newCategory
    ? menu.filter((item) => item.category?.name === newCategory)
    : [...menu];
  const sortedMenu = filteredMenu.sort((a, b) => Number(a.id) - Number(b.id));

  const formatPrice = (price) => {
    const priceStr = price.toString();
    return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сўм";
  };

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
          {swapMode && selectedItems.length === 2 && (
            <button
              className="btn btn-swap"
              onClick={handleSwapIds}
            >
              Tanlanganlarni almashtirish
            </button>
          )}
          <button
            className="btn btn-toggle-swap"
            onClick={() => {
              setSwapMode(!swapMode);
              setSelectedItems([]);
            }}
          >
            {swapMode ? "X" : "Joy o'zgartirish rejimini yoqish"}
          </button>
        </div>
      </header>
      <section>
        <div className="category-tabs-container">
          <button
            style={{ marginBottom: "20px", marginRight: "10px" }}
            className="scroll-arrow left"
            onClick={scrollLeft}
          >
            <ChevronLeft size={30} />
          </button>
          <nav className="category-tabs" ref={scrollRef}>
            {categoryList.map((cat) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center" }}>
                <button
                  className={`category-tab ${
                    newCategory === cat.name ? "active" : ""
                  }`}
                  onClick={() => setNewCategory(cat.name)}
                >
                  {cat.name}
                </button>
                <button
                  className="food-card-button delete"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash color="#fff" size={16} />
                </button>
              </div>
            ))}
          </nav>
          <button
            style={{ marginBottom: "20px", marginLeft: "10px" }}
            className="scroll-arrow right"
            onClick={scrollRight}
          >
            <ChevronRight size={30} />
          </button>
        </div>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div>
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

            {sortedMenu.length === 0 ? (
              <div
                className="empty-state"
                style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}
              >
                <div className="empty-state-icon">
                  <Plus size={48} />
                </div>
                <h2 className="empty-state-title">Бу категорияда таомлар топилмади</h2>
                <p className="empty-state-text">
                  Янги таом қўшиш учун "Таом қўшиш" тугмасини босинг.
                </p>
              </div>
            ) : (
              sortedMenu.map((item) => (
                <FoodCard key={item.id} item={item} />
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
            <div
              style={{ overflow: "scroll", height: "100vh", backgroundColor: "#fff" }}
              onClick={(e) => e.stopPropagation()}
            >
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
                  <label className="form-label">Расм:</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          const jpgFile = await convertToJPG(file);
                          setDishes({ ...dishes, image: jpgFile });
                        } catch (error) {
                          console.error("Rasm konvertatsiya qilishda xatolik:", error);
                          alert("Rasmni qayta ishlashda xatolik yuz berdi.");
                        }
                      }
                    }}
                  />
                  <small style={{ color: "#666", fontSize: "12px" }}>
                    Har qanday rasm formati JPG ga aylantiriladi va o'lchami optimallashtiriladi
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Категория</label>
                  <select
                    className="form-control"
                    value={dishes.categoryId || ""}
                    onChange={(e) =>
                      setDishes({
                        ...dishes,
                        categoryId: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
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
                    onChange={(e) =>
                      setDishes({
                        ...dishes,
                        assignedToId: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">Ошпаз танланг (авто-танлов)</option>
                    {kitchenStaff
                      .filter(
                        (user) =>
                          user.role === "KITCHEN" &&
                          user.name !== "." &&
                          user.username !== "."
                      )
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
                    onClick={async () => {
                      if (!newCategory.trim()) {
                        alert("Категория номини киритинг.");
                        return;
                      }
                      try {
                        const res = await axios.post(
                          "https://alikafecrm.uz/category",
                          { name: newCategory.trim() },
                          {
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                          }
                        );
                        const newCat = { ...res.data, id: Number(res.data.id) };
                        setCategoryList((prev) => [...prev, newCat]);
                        setDishes((prev) => ({
                          ...prev,
                          categoryId: newCat.id,
                        }));
                        setNewCategory(newCat.name);
                      } catch (err) {
                        console.error("Категория қўшишда хатолик:", err);
                        alert("Категория қўшилмади.");
                      }
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