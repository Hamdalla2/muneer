import React, { createContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./style.css";
import { languages, translate } from "./Translate";
const Store = createContext();
const api = async (path, options = {}) => {
  const token = localStorage.getItem("muneer-token"),
    r = await fetch(`/.netlify/functions/${path}`, {
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    }),
    d = await r.json();
  if (!r.ok) throw new Error(d.message || "Request failed");
  return d;
};
function Header() {
  let { user, language, setLanguage } = React.useContext(Store),
    t = (x) => translate(x, language);
  return (
    <header>
      <Link className="brand" to="/">
        {t("Muneer Store")}
      </Link>
      <nav>
        {user ? (
          <>
            <span>
              {t("Hello")}, {user.name}
            </span>
            <Link to="/menu">{t("Menu")}</Link>
          </>
        ) : (
          <Link className="primary" to="/signin">
            {t("Sign in")}
          </Link>
        )}
        {user && (
          <select
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {Object.entries(languages).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        )}
      </nav>
    </header>
  );
}
function Products() {
  let { user, products, loadProducts, language } = React.useContext(Store),
    t = (text) => translate(text, language),
    admin = user?.role === "admin",
    nav = useNavigate(),
    [edit, setEdit] = useState(),
    [orderProduct, setOrderProduct] = useState(null),
    [quantity, setQuantity] = useState(1),
    [msg, setMsg] = useState("");
  useEffect(() => {
    loadProducts().catch((e) => setMsg(e.message));
  }, []);
  let order = (p) => {
    if (!user) return nav("/signin");
    setQuantity(1);
    setOrderProduct(p);
  };
  let placeOrder = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return;
    try {
      await api("orders", {
        method: "POST",
        body: JSON.stringify({ productId: orderProduct._id, quantity: Number(quantity) }),
      });
      setOrderProduct(null);
      nav("/orders");
    } catch (e) {
      setMsg(e.message);
    }
  };
  let save = async (e) => {
    e.preventDefault();
    let f = new FormData(e.currentTarget),
      images = edit.images || (edit.image ? [edit.image] : []);
    try {
      const files = f.getAll("images").filter((file) => file?.size);
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const signed = await api("upload-url", {
            method: "POST",
            body: JSON.stringify({ fileName: file.name, contentType: file.type }),
          });
          await fetch(signed.url, { method: "PUT", headers: { "content-type": file.type }, body: file });
          return signed.publicUrl;
        }),
      );
      images = [...images, ...uploaded];
      await api("products", {
        method: edit._id ? "PUT" : "POST",
        body: JSON.stringify({
          id: edit._id,
          name: f.get("name"),
          price: f.get("price"),
          bio: f.get("bio"),
          images,
        }),
      });
      setEdit(null);
      loadProducts();
    } catch (x) {
      setMsg(x.message);
    }
  };
  let remove = async (id) => {
    if (confirm("Delete this product?"))
      try {
        await api("products", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
        loadProducts();
      } catch (e) {
        setMsg(e.message);
      }
  };
  return (
    <main>
      <Header />
      <section className="hero">
        <b>{t("OUR COLLECTION")}</b>
        <h1>{t("Good things, simply delivered.")}</h1>
        <p>{t("Browse our carefully selected products.")}</p>
      </section>
      {msg && <p className="error">{msg}</p>}
      {admin && (
        <button className="primary" onClick={() => setEdit({})}>
          + {t("Add product")}
        </button>
      )}
      <section className="products">
        {products.map((p) => (
          <article key={p._id}>
            <div className="icon">
              {p.images?.[0] || p.image ? <img src={p.images?.[0] || p.image} alt={p.name} /> : "📦"}
            </div>
            <div>
              <h2>{p.name}</h2>
              <p>{p.bio}</p>
              {user && <strong>${Number(p.price).toFixed(2)}</strong>}
              <div className="buttons">
                <button className="primary" onClick={() => order(p)}>
                  {t("Order now")}
                </button>
                {admin && (
                  <>
                    <button onClick={() => setEdit(p)}>{t("Edit")}</button>
                    <button className="danger" onClick={() => remove(p._id)}>
                      {t("Delete")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
      {edit && (
        <div className="modal">
          <form onSubmit={save}>
            <h2>{t(edit._id ? "Update product" : "Add product")}</h2>
            <label>
              {t("Name")}
              <input required name="name" defaultValue={edit.name} />
            </label>
            <label>
              {t("Price")}
              <input
                required
                name="price"
                type="number"
                min="0"
                step=".01"
                defaultValue={edit.price}
              />
            </label>
            <label>
              {t("Info / bio")}
              <textarea required name="bio" defaultValue={edit.bio} />
            </label>
            <label>
              {t("Product image")}
              <input
                name="images"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
              />
            </label>
            <div className="buttons">
              <button type="button" onClick={() => setEdit(null)}>
                {t("Cancel")}
              </button>
              <button className="primary">{t("Save")}</button>
            </div>
          </form>
        </div>
      )}
      {orderProduct && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="order-quantity-title">
          <form onSubmit={placeOrder}>
            <h2 id="order-quantity-title">{t("Order quantity")}</h2>
            <p>{orderProduct.name}</p>
            <label>
              {t("Quantity")}
              <input type="number" min="1" step="1" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <div className="buttons">
              <button type="button" onClick={() => setOrderProduct(null)}>{t("Cancel")}</button>
              <button className="primary">{t("Place order")}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
function Signin() {
  let { setUser, language } = React.useContext(Store),
    t = (text) => translate(text, language),
    nav = useNavigate(),
    [signup, setSignup] = useState(false),
    [f, setF] = useState({}),
    [msg, setMsg] = useState(""),
    c = (e) => setF({ ...f, [e.target.name]: e.target.value });
  let submit = async (e) => {
    e.preventDefault();
    try {
      let d = await api("auth", {
        method: "POST",
        body: JSON.stringify({ action: signup ? "signup" : "signin", ...f }),
      });
      localStorage.setItem("muneer-token", d.token);
      setUser(d.user);
      nav("/");
    } catch (x) {
      setMsg(x.message);
    }
  };
  return (
    <div className="auth">
      <form onSubmit={submit}>
        <b>{t("WELCOME")}</b>
        <h1>{t(signup ? "Create account" : "Sign in")}</h1>
        {signup && (
          <>
            <label>
              {t("Name")}
              <input name="name" onChange={c} />
            </label>
            <label>
              {t("Phone")}
              <input name="phone" onChange={c} />
            </label>
          </>
        )}
        <label>
          {t("Username")}
          <input required name="username" onChange={c} />
        </label>
        <label>
          {t("Password")}
          <input required type="password" name="password" onChange={c} />
        </label>
        {msg && <p className="error">{msg}</p>}
        <button className="primary">{t(signup ? "Sign up" : "Sign in")}</button>
        <button
          className="link"
          type="button"
          onClick={() => setSignup(!signup)}
        >
          {t(signup ? "Already have an account? Sign in" : "New here? Sign up")}
        </button>
      </form>
    </div>
  );
}
function Orders() {
  let { user, language } = React.useContext(Store),
    t = (text) => translate(text, language),
    admin = user.role === "admin",
    [orders, setOrders] = useState([]),
    [msg, setMsg] = useState("");
  let load = () =>
    api("orders")
      .then((x) => setOrders(x.orders))
      .catch((e) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);
  let update = async (o, status = o.status, paid = o.paid) => {
    try {
      await api("orders", {
        method: "PUT",
        body: JSON.stringify({ id: o._id, status, paid }),
      });
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <main>
      <Header />
      <section className="title">
        <b>{t(admin ? "Admin" : "MY ACCOUNT")}</b>
        <h1>{t(admin ? "All orders" : "My orders")}</h1>
      </section>
      {msg && <p className="error">{msg}</p>}
      <section className="orders">
        {orders.map((o) => (
          <article className="order" key={o._id}>
            <div>
              <h2>
                {o.product}{" "}
                <em className={o.status.replaceAll(" ", "-")}>
                  {t(o.status[0].toUpperCase() + o.status.slice(1))}
                </em>
              </h2>
              <p>
                {o.quantity} × ${Number(o.price).toFixed(2)} · Total $
                {Number(o.total).toFixed(2)}
              </p>
              {admin && (
                <p>
                  {t("Customer:")} {o.buyerName || t("Unknown")} (
                  {o.phone || t("no phone")})
                </p>
              )}
              <small>{new Date(o.createdAt).toLocaleString()}</small>
            </div>
            <div className="buttons">
              {admin && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={o.paid}
                    onChange={(e) => update(o, o.status, e.target.checked)}
                  />{" "}
                  {t("Paid")}
                </label>
              )}
              {admin && o.status === "new" && (
                <>
                  <button
                    className="primary"
                    onClick={() => update(o, "started")}
                  >
                    {t("Start")}
                  </button>
                  <button
                    className="danger"
                    onClick={() => update(o, "rejected")}
                  >
                    {t("Reject")}
                  </button>
                </>
              )}
              {admin && o.status === "started" && (
                <button
                  className="primary"
                  onClick={() => update(o, "on the way")}
                >
                  {t("Finished")}
                </button>
              )}
              {!admin && o.status === "on the way" && (
                <button
                  className="primary"
                  onClick={() => update(o, "received")}
                >
                  {t("Received")}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
function Menu() {
  let { user, setUser, language } = React.useContext(Store),
    nav = useNavigate(),
    [show, setShow] = useState(false),
    [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [msg, setMsg] = useState(""),
    t = (x) => translate(x, language);
  let save = async (e) => {
    e.preventDefault();
    try {
      let d = await api("auth", {
        method: "POST",
        body: JSON.stringify({ action: "profile", name, phone }),
      });
      setUser(d.user);
      setShow(false);
    } catch (x) {
      setMsg(x.message);
    }
  };
  return (
    <main>
      <Header />
      <section className="title">
        <b>{t("Account")}</b>
        <h1>
          {t("Hello")}, {user.name}
        </h1>
      </section>
      <div className="menu">
        <Link to="/">{t("Products")}</Link>
        <Link to="/orders">{t("My Orders")}</Link>
        <button onClick={() => setShow(!show)}>{t("My Profile")}</button>
        <Link to="/password">{t("Change Password")}</Link>
        <button
          className="danger"
          onClick={() => {
            localStorage.removeItem("muneer-token");
            setUser(null);
            nav("/");
          }}
        >
          {t("Sign Out")}
        </button>
      </div>
      {show && (
        <form className="profile" onSubmit={save}>
          <h2>{t("My Profile")}</h2>
          <label>
            {t("Name")}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            {t("Phone")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          {msg && <p className="error">{msg}</p>}
          <button className="primary">{t("Save profile")}</button>
        </form>
      )}
    </main>
  );
}
function Password() {
  let { language } = React.useContext(Store),
    t = (text) => translate(text, language),
    nav = useNavigate(),
    [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [msg, setMsg] = useState("");
  let save = async (e) => {
    e.preventDefault();
    try {
      await api("auth", {
        method: "POST",
        body: JSON.stringify({ action: "password", currentPassword, password }),
      });
      setMsg("Password changed successfully.");
      setTimeout(() => nav("/menu"), 700);
    } catch (x) {
      setMsg(x.message);
    }
  };
  return (
    <div className="auth">
      <form onSubmit={save}>
        <Link to="/menu">← {t("Back to menu")}</Link>
        <h1>{t("Change Password")}</h1>
        <label>
          {t("Current password")}
          <input
            required
            type="password"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          {t("New password")}
          <input
            required
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {msg && <p>{msg}</p>}
        <button className="primary">{t("Update password")}</button>
      </form>
    </div>
  );
}
function App() {
  let [user, setUser] = useState(null),
    [products, setProducts] = useState([]),
    [language, setLanguage] = useState(
      () => localStorage.getItem("language") || "arabic",
    );
  let loadProducts = async () => setProducts((await api("products")).products);
  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.dir = language === "arabic" ? "rtl" : "ltr";
  }, [language]);
  useEffect(() => {
    const updateText = (text) => {
      const raw = text.__source ?? text.nodeValue;
      if (!text.__source) text.__source = raw;
      const lead = raw.match(/^\s*/)[0],
        tail = raw.match(/\s*$/)[0];
      text.nodeValue = lead + translate(raw.trim(), language) + tail;
    };
    const apply = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return updateText(node);
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode())) updateText(text);
    };
    apply(document.body);
    const observer = new MutationObserver((records) =>
      records.forEach((record) => record.addedNodes.forEach(apply)),
    );
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);
  useEffect(() => {
    if (localStorage.getItem("muneer-token"))
      api("auth")
        .then((x) => setUser(x.user))
        .catch(() => localStorage.removeItem("muneer-token"));
    loadProducts().catch(console.error);
  }, []);
  return (
    <Store.Provider
      value={{
        user,
        setUser,
        products,
        loadProducts,
        language,
        setLanguage,
        translate,
      }}
    >
      <Routes>
        <Route path="/" element={<Products />} />
        <Route path="/signin" element={<Signin />} />
        <Route
          path="/menu"
          element={user ? <Menu /> : <Navigate to="/signin" />}
        />
        <Route
          path="/orders"
          element={user ? <Orders /> : <Navigate to="/signin" />}
        />
        <Route
          path="/password"
          element={user ? <Password /> : <Navigate to="/signin" />}
        />
      </Routes>
    </Store.Provider>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
