
const products = [
  {
  id: 1,
  name: "Pixie the peach bunny",
  price: 25,
  image: "coniglio.jpg",
  description: "Peluche fatto a mano all'uncinetto.",
  status: "available",
  badge: "Fatto a mano"
},
  {
    id: 2,
    name: "",
    price: null,
    image: "",
    description: "",
    status: "available",
    badge: "La tua creazione"
  },
  {
    id: 3,
    name: "",
    price: null,
    image: "",
    description: "",
    status: "custom",
    badge: "Su richiesta"
  },
  {
    id: 4,
    name: "",
    price: null,
    image: "",
    description: "",
    status: "custom",
    badge: "Su richiesta"
  }
];

const $ = (selector) => document.querySelector(selector);

const grid = $("#product-grid");
const cartCount = $("#cart-count");
const cartItems = $("#cart-items");
const cartEmpty = $("#cart-empty");
const cartFooter = $("#cart-footer");
const cartTotal = $("#cart-total");
const drawer = $("#cart-drawer");
const overlay = $("#overlay");
const toast = $("#toast");

let cart = JSON.parse(localStorage.getItem("elisaCrochetCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("elisaCrochetFavorites") || "[]");
let currentFilter = "all";
let searchQuery = "";
let selectedRating = 5;
let toastTimer;

const money = (amount) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(amount);

function saveCart() {
  localStorage.setItem("elisaCrochetCart", JSON.stringify(cart));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function configuredProducts() {
  return products.filter(product =>
    product.name.trim() !== "" &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) > 0
  );
}

function renderProducts() {
  let list = products.filter(product => {
    const matchesFilter =
      currentFilter === "all" ||
      product.status === currentFilter;

    const searchable = [
      product.name,
      product.description,
      product.badge
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  const sort = $("#sort-select").value;

  if (sort === "price-asc") {
    list.sort((a, b) => {
      const priceA = a.price ?? Infinity;
      const priceB = b.price ?? Infinity;
      return priceA - priceB;
    });
  }

  if (sort === "price-desc") {
    list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  }

  if (sort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name, "it"));
  }

  $("#product-total").textContent =
    `${configuredProducts().length} ${configuredProducts().length === 1 ? "creazione" : "creazioni"} disponibili`;

  $("#empty-search").classList.toggle("hidden", list.length > 0);

  grid.innerHTML = list.map(product => {
    const ready = product.name.trim() !== "" &&
      Number.isFinite(Number(product.price)) &&
      Number(product.price) > 0;

    const name = ready ? product.name : "La tua creazione";
    const description = ready
      ? product.description
      : "Qui potrai inserire il nome e i dettagli del tuo peluche.";

    const image = product.image
      ? `<img src="${escapeHTML(product.image)}" alt="${escapeHTML(name)}" loading="lazy">`
      : `<div class="photo-placeholder">
           <span class="placeholder-heart">♡</span>
           <strong>La tua foto qui</strong>
           <small>Inserirai la tua creazione</small>
         </div>`;

    const price = ready
      ? `<span class="product-price">${money(Number(product.price))}</span>`
      : `<span class="product-price pending">Prezzo da inserire</span>`;

    const favorite = favorites.includes(product.id);

    return `
      <article class="product-card">
        <div class="product-image">
          <span class="product-badge">${escapeHTML(product.badge || "Handmade")}</span>
          ${image}
          <button class="favorite-button ${favorite ? "is-favorite" : ""}"
            data-favorite="${product.id}"
            aria-label="${favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}">
            ${favorite ? "♥" : "♡"}
          </button>
        </div>
        <div class="product-info">
          <h3 class="product-name">${escapeHTML(name)}</h3>
          <p class="product-description">${escapeHTML(description || "Un piccolo peluche fatto a mano con amore.")}</p>
          <div class="product-bottom">
            ${price}
            <button class="add-button" data-add="${product.id}" ${ready ? "" : "disabled"}>
              ${ready ? "Aggiungi ♡" : "Presto disponibile"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(item => item !== id);
    showToast("Rimosso dai preferiti ♡");
  } else {
    favorites.push(id);
    showToast("Aggiunto ai preferiti ♥");
  }

  localStorage.setItem("elisaCrochetFavorites", JSON.stringify(favorites));
  renderProducts();
}

function addToCart(id) {
  const product = products.find(item => item.id === id);
  if (!product || !product.name || !(Number(product.price) > 0)) return;

  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, quantity: 1 });
  }

  saveCart();
  renderCart();
  showToast("Aggiunto al carrello ♡");
}

function changeQuantity(id, amount) {
  const item = cart.find(product => product.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(product => product.id !== id);
  }

  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  cart = cart.filter(item => {
    const product = products.find(p => p.id === item.id);
    return product && product.name && Number(product.price) > 0;
  });

  saveCart();

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + Number(product.price) * item.quantity;
  }, 0);

  cartCount.textContent = totalQuantity;
  cartEmpty.classList.toggle("hidden", cart.length > 0);
  cartFooter.classList.toggle("hidden", cart.length === 0);
  cartItems.classList.toggle("hidden", cart.length === 0);
  cartTotal.textContent = money(total);

  cartItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    const image = product.image
      ? `<img src="${escapeHTML(product.image)}" alt="">`
      : "♡";

    return `
      <div class="cart-item">
        <div class="cart-thumb">${image}</div>
        <div>
          <h3 class="cart-item-name">${escapeHTML(product.name)}</h3>
          <div class="cart-item-price">${money(Number(product.price))}</div>
          <div class="quantity-controls">
            <button data-quantity="${item.id}" data-change="-1" aria-label="Diminuisci quantità">−</button>
            <span>${item.quantity}</span>
            <button data-quantity="${item.id}" data-change="1" aria-label="Aumenta quantità">+</button>
          </div>
        </div>
        <button class="remove-item" data-remove="${item.id}" aria-label="Rimuovi prodotto">✕</button>
      </div>
    `;
  }).join("");
}

function openCart() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.add("hidden");
  document.body.style.overflow = "";
}

$("#open-cart").addEventListener("click", openCart);
$("#close-cart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

$("#continue-shopping").addEventListener("click", () => {
  closeCart();
  $("#negozio").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});


grid.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  const favoriteButton = event.target.closest("[data-favorite]");

  // Aggiungi al carrello
  if (addButton && !addButton.disabled) {
    addToCart(Number(addButton.dataset.add));
    return;
  }

  // Aggiungi o rimuovi dai preferiti
  if (favoriteButton) {
    toggleFavorite(Number(favoriteButton.dataset.favorite));
    return;
  }

  // Apri la scheda cliccando sul prodotto
  const card = event.target.closest(".product-card");

  if (card) {
    const cardButton = card.querySelector("[data-add]");
    if (!cardButton) return;

    const productId = Number(cardButton.dataset.add);
    const product = products.find(p => Number(p.id) === productId);

    if (product && product.name && product.image) {
      openProductDetail(product);
    }
  }
});

cartItems.addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");

  if (quantityButton) {
    changeQuantity(
      Number(quantityButton.dataset.quantity),
      Number(quantityButton.dataset.change)
    );
  }

  if (removeButton) {
    removeFromCart(Number(removeButton.dataset.remove));
  }
});

document.querySelectorAll(".filter-pill").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach(pill =>
      pill.classList.remove("active")
    );

    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderProducts();
  });
});

$("#sort-select").addEventListener("change", renderProducts);

$("#search-toggle").addEventListener("click", () => {
  $("#search-bar").classList.toggle("hidden");
  if (!$("#search-bar").classList.contains("hidden")) {
    $("#search-input").focus();
  }
});

$("#close-search").addEventListener("click", () => {
  $("#search-bar").classList.add("hidden");
  $("#search-input").value = "";
  searchQuery = "";
  renderProducts();
});

$("#search-input").addEventListener("input", event => {
  searchQuery = event.target.value.trim().toLowerCase();
  renderProducts();
});

// RECENSIONI: vengono salvate solo nel browser che le inserisce.
let reviews = JSON.parse(localStorage.getItem("elisaCrochetReviews") || "[]");

function renderReviews() {
  const list = $("#review-list");

  if (reviews.length === 0) {
    list.innerHTML = `
      <div class="no-reviews">
        <span>♡</span>
        <strong>Le prime parole dolci arriveranno qui!</strong>
        <p>Quando qualcuno lascerà una recensione, la vedrai in questa sezione.</p>
      </div>
    `;
  } else {
    list.innerHTML = [...reviews].reverse().map(review => `
      <article class="review-card">
        <div class="review-top">
          <div class="review-avatar">${escapeHTML(review.name.charAt(0).toUpperCase())}</div>
          <div>
            <div class="review-author">${escapeHTML(review.name)}</div>
            <div class="review-date">${escapeHTML(review.date)}</div>
          </div>
          <div class="review-stars" aria-label="${review.rating} stelle">
            ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}
          </div>
        </div>
        <p class="review-text">${escapeHTML(review.message)}</p>
      </article>
    `).join("");
  }

  if (reviews.length > 0) {
    const average = reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
    $("#rating-summary-text").textContent =
      `${average.toFixed(1)} su 5 · ${reviews.length} ${reviews.length === 1 ? "recensione" : "recensioni"}`;
    $(".big-stars").textContent = "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average));
  } else {
    $("#rating-summary-text").textContent = "La tua opinione conta ♡";
    $(".big-stars").textContent = "★★★★★";
  }
}

$("#star-picker").addEventListener("click", event => {
  const button = event.target.closest("[data-rating]");
  if (!button) return;

  selectedRating = Number(button.dataset.rating);

  document.querySelectorAll("#star-picker button").forEach(star => {
    const active = Number(star.dataset.rating) <= selectedRating;
    star.classList.toggle("selected", active);
    star.setAttribute("aria-pressed", String(active));
  });
});

document.querySelectorAll("#star-picker button").forEach(star => {
  star.classList.toggle("selected", Number(star.dataset.rating) <= selectedRating);
});

$("#review-form").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("#review-name").value.trim();
  const message = $("#review-message").value.trim();

  if (!name || !message) {
    showToast("Completa tutti i campi ♡");
    return;
  }

  reviews.push({
    name,
    message,
    rating: selectedRating,
    date: new Date().toLocaleDateString("it-IT")
  });

  localStorage.setItem("elisaCrochetReviews", JSON.stringify(reviews));
  $("#review-form").reset();

  selectedRating = 5;
  document.querySelectorAll("#star-picker button").forEach(star => {
    star.classList.toggle("selected", Number(star.dataset.rating) <= 5);
  });

  renderReviews();
  showToast("Recensione salvata in questo browser ♡");
});

$("#checkout-button").addEventListener("click", () => {
  const lines = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    return `${product.name} x${item.quantity} — ${money(Number(product.price) * item.quantity)}`;
  });

  const total = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + Number(product.price) * item.quantity;
  }, 0);

  const message = [
    "Ciao Elisa! Vorrei richiedere questi peluche:",
    "",
    ...lines,
    "",
    `Totale prodotti: ${money(total)}`,
    "Vorrei sapere disponibilità e costo della spedizione. Grazie! ♡"
  ].join("\n");

  // Inserisci qui la tua email quando vorrai attivare le richieste.
  const email = "";

  if (!email) {
    showToast("Aggiungeremo il tuo contatto per gli ordini!");
    return;
  }

  window.location.href =
    `mailto:${email}?subject=${encodeURIComponent("Ordine elisa._crochet")}&body=${encodeURIComponent(message)}`;
});

$("#year").textContent = new Date().getFullYear();

$("#back-top").addEventListener("click", event => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});


/* =========================================
   SCHEDA PRODOTTO - ELISA CROCHET
========================================= */

function openProductDetail(product) {
  let overlay = document.getElementById("product-detail-overlay");

  // Crea la finestra solo la prima volta
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "product-detail-overlay";
    overlay.className = "product-detail-overlay";

    overlay.innerHTML = `
      <div class="product-detail" role="dialog"
           aria-modal="true" aria-label="Dettagli prodotto">

        <button class="product-detail-close"
                type="button" aria-label="Chiudi">&times;</button>

        <div class="product-detail-photo">
          <img id="detail-image" src="" alt="">
        </div>

        <div class="product-detail-info">
          <span class="product-detail-badge" id="detail-badge"></span>
          <h2 class="product-detail-title" id="detail-title"></h2>
          <p class="product-detail-price" id="detail-price"></p>
          <p class="product-detail-description" id="detail-description"></p>
          <p class="product-detail-availability" id="detail-availability"></p>

          <div class="product-detail-actions">
            <button class="primary-button" id="detail-add-button"
                    type="button">
              Aggiungi al carrello
            </button>
          </div>

          <p class="product-detail-hint">
            ✿ Fatto con cura, punto dopo punto
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Chiudi con la X o cliccando fuori dalla scheda
    overlay.addEventListener("click", event => {
      if (
        event.target === overlay ||
        event.target.closest(".product-detail-close")
      ) {
        closeProductDetail();
      }
    });

    // Aggiungi al carrello usando la funzione già esistente
    document.getElementById("detail-add-button")
      .addEventListener("click", () => {
        const id = Number(overlay.dataset.productId);

        const originalButton = [...document.querySelectorAll(
          "#product-grid [data-add]"
        )].find(button => Number(button.dataset.add) === id);

        if (originalButton && !originalButton.disabled) {
          originalButton.click();
          closeProductDetail();
        } else {
          showToast("Questo prodotto non è ancora acquistabile.");
        }
      });
  }

  // Inserisci i dati del prodotto
  const image = document.getElementById("detail-image");
  image.src = product.image;
  image.alt = product.name;

  document.getElementById("detail-title").textContent =
    product.name || "Creazione all'uncinetto";

  document.getElementById("detail-badge").textContent =
    product.badge || "Fatto a mano";

  document.getElementById("detail-price").textContent =
    product.price != null ? money(product.price) : "Prezzo su richiesta";

  document.getElementById("detail-description").textContent =
    product.description || "Una creazione artigianale realizzata con amore.";

  const availability = document.getElementById("detail-availability");

  if (product.status === "custom") {
    availability.textContent = "Realizzato su richiesta";
    availability.classList.add("custom");
  } else {
    availability.textContent = "Disponibile";
    availability.classList.remove("custom");
  }

  // Mostra il pulsante solo se il prodotto ha un prezzo
  const addButton = document.getElementById("detail-add-button");
  addButton.hidden = product.price == null;

  overlay.dataset.productId = product.id;
  overlay.classList.add("open");
  document.body.classList.add("product-detail-open");
}

function closeProductDetail() {
  const overlay = document.getElementById("product-detail-overlay");

  if (overlay) {
    overlay.classList.remove("open");
  }

  document.body.classList.remove("product-detail-open");
}

// Chiudi la scheda anche con il tasto indietro/Esc della tastiera
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProductDetail();
  }
});


renderProducts();
renderCart();
renderReviews();
