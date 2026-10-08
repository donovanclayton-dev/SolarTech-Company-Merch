const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

const ICONS = {
  Hats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13a9 9 0 0 1 18 0"/><path d="M2 13h20l-1.2 3H3.2z"/><path d="M12 4v3"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 6l2 3 2-1v11h8V8l2 1 2-3-4-3-2 2H10z"/></svg>`,
};

let groups = [];
let activeCategory = "All";
let activeVariant = null;

const colorCache = new Map();

function sampleImageColor(url) {
  if (colorCache.has(url)) return Promise.resolve(colorCache.get(url));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // Sample pixels all around the photo's border (not just the corners) and
        // pick the most common color among them -- the background, since it
        // dominates the perimeter even where a strap or sleeve pokes close to an edge.
        const size = 64;
        const inset = 3; // step a few px in from the raw edge to dodge compression/anti-aliasing noise
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const quantize = (v) => Math.round(v / 16) * 16;
        const buckets = new Map();
        const addPixel = (x, y) => {
          const i = (y * size + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const key = `${quantize(r)},${quantize(g)},${quantize(b)}`;
          const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
          bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
          buckets.set(key, bucket);
        };

        for (let x = 0; x < size; x++) {
          addPixel(x, inset);
          addPixel(x, size - 1 - inset);
        }
        for (let y = 0; y < size; y++) {
          addPixel(inset, y);
          addPixel(size - 1 - inset, y);
        }

        let winner = null;
        for (const bucket of buckets.values()) {
          if (!winner || bucket.count > winner.count) winner = bucket;
        }

        const color = `rgb(${Math.round(winner.r / winner.count)}, ${Math.round(winner.g / winner.count)}, ${Math.round(winner.b / winner.count)})`;
        colorCache.set(url, color);
        resolve(color);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const gridEl = document.getElementById("grid");
const pillsEl = document.getElementById("pills");
const searchEl = document.getElementById("search");
const msgEl = document.getElementById("msg");
const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modal-title");
const requestForm = document.getElementById("request-form");

const zoomOverlay = document.getElementById("zoom-overlay");
const zoomImg = document.getElementById("zoom-img");
const zoomDots = document.getElementById("zoom-dots");
const zoomCategory = document.getElementById("zoom-category");
const zoomName = document.getElementById("zoom-name");
const zoomActions = document.getElementById("zoom-actions");
const zoomPrev = document.getElementById("zoom-prev");
const zoomNext = document.getElementById("zoom-next");

function openZoom(group) {
  const images = group.images;
  if (images.length === 0) return;

  let current = 0;

  function show(i) {
    current = (i + images.length) % images.length;
    zoomImg.src = images[current];
    zoomDots.querySelectorAll(".carousel-dot").forEach((d, di) => d.classList.toggle("active", di === current));
  }

  zoomCategory.textContent = group.category;
  zoomName.textContent = group.name;
  zoomDots.innerHTML = images.length > 1
    ? images.map((_, i) => `<span class="carousel-dot ${i === 0 ? "active" : ""}"></span>`).join("")
    : "";
  zoomDots.querySelectorAll(".carousel-dot").forEach((dot, i) => dot.addEventListener("click", () => show(i)));

  zoomPrev.hidden = zoomNext.hidden = images.length <= 1;
  zoomPrev.onclick = () => show(current - 1);
  zoomNext.onclick = () => show(current + 1);

  zoomActions.innerHTML = productActionsHTML(group);
  wireProductActions(zoomActions, group, { onRequestOpen: () => { zoomOverlay.hidden = true; } });

  show(0);
  zoomOverlay.hidden = false;
}

document.getElementById("zoom-close").addEventListener("click", () => { zoomOverlay.hidden = true; });
zoomOverlay.addEventListener("click", (e) => { if (e.target === zoomOverlay) zoomOverlay.hidden = true; });

function showMessage(text, type) {
  msgEl.textContent = text;
  msgEl.className = `msg ${type}`;
  msgEl.hidden = false;
  msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => { msgEl.hidden = true; }, 5000);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function sizeIndex(size) {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? SIZE_ORDER.length : i;
}

const STANDARD_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

function groupItems(items, imagesMap) {
  const map = new Map();
  for (const item of items) {
    const key = item.category + "||" + item.name;
    if (!map.has(key)) map.set(key, { category: item.category, name: item.name, variants: [], images: imagesMap.get(key) || [] });
    map.get(key).variants.push(item);
  }
  const list = Array.from(map.values());
  for (const g of list) {
    const isSized = g.variants.some((v) => v.size);
    if (isSized) {
      const present = new Set(g.variants.map((v) => v.size));
      for (const size of STANDARD_SIZES) {
        if (!present.has(size)) {
          g.variants.push({ id: null, size, quantity: 0, category: g.category, name: g.name });
        }
      }
    }
    g.variants.sort((a, b) => sizeIndex(a.size) - sizeIndex(b.size));
  }
  return list;
}

function stockLabel(qty) {
  if (qty <= 0) return `<span class="qty out">Out of stock</span>`;
  return `${qty} in stock`;
}

function productActionsHTML(g) {
  const hasSizes = g.variants.length > 1 || g.variants[0].size;
  const totalQty = g.variants.reduce((sum, v) => sum + v.quantity, 0);
  const groupKey = g.category + "||" + g.name;

  const controls = hasSizes
    ? `<select class="size-select" data-group="${escapeHtml(groupKey)}">
        <option value="" disabled selected>Select a size</option>
        ${g.variants.map((v) => `<option value="${v.id ?? ""}" ${v.quantity <= 0 ? "disabled" : ""}>${escapeHtml(v.size || "One size")}${v.quantity <= 0 ? " (out)" : ""}</option>`).join("")}
      </select>
      <input type="number" min="1" value="1" class="req-qty-input" />`
    : `<input type="number" min="1" value="1" class="req-qty-input" />`;

  const stock = hasSizes
    ? `<div class="product-stock stock-text" data-group="${escapeHtml(groupKey)}">Select a size to see stock</div>`
    : `<div class="product-stock">${stockLabel(totalQty)}</div>`;

  return `
    ${stock}
    <div class="product-controls">${controls}</div>
    <button class="btn request-btn">Request</button>
    <div class="field-notice" hidden></div>
  `;
}

function wireProductActions(scopeEl, group, opts = {}) {
  const select = scopeEl.querySelector(".size-select");
  const stockEl = scopeEl.querySelector(".stock-text");

  if (select) {
    select.addEventListener("change", () => {
      if (!select.value) {
        if (stockEl) stockEl.textContent = "Select a size to see stock";
        return;
      }
      const variant = group.variants.find((v) => (v.id ?? "") === select.value);
      if (stockEl && variant) stockEl.innerHTML = stockLabel(variant.quantity);
    });
  }

  const notice = scopeEl.querySelector(".field-notice");
  let noticeTimer = null;
  const showNotice = (text) => {
    if (!notice) return;
    notice.textContent = text;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 2500);
  };

  scopeEl.querySelector(".request-btn").addEventListener("click", () => {
    if (select && !select.value) {
      showNotice("Please select a size.");
      return;
    }
    const variant = select ? group.variants.find((v) => (v.id ?? "") === select.value) : group.variants[0];
    if (!variant || variant.quantity <= 0) {
      showNotice("That size is out of stock.");
      return;
    }
    const qtyInput = scopeEl.querySelector(".req-qty-input");
    if (opts.onRequestOpen) opts.onRequestOpen();
    openRequestModal(group, variant, parseInt(qtyInput.value, 10) || 1);
  });
}

function renderPills() {
  const counts = new Map();
  for (const g of groups) counts.set(g.category, (counts.get(g.category) || 0) + 1);
  const categories = ["All", ...Array.from(counts.keys()).sort()];

  pillsEl.innerHTML = categories.map((cat) => {
    const count = cat === "All" ? groups.length : counts.get(cat);
    return `<button class="pill ${cat === activeCategory ? "active" : ""}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)} <span class="count">${count}</span></button>`;
  }).join("");

  pillsEl.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderPills();
      renderGrid();
    });
  });
}

function renderGrid() {
  const q = searchEl.value.trim().toLowerCase();
  const visible = groups.filter((g) => {
    const matchesCategory = activeCategory === "All" || g.category === activeCategory;
    const matchesSearch = !q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  if (visible.length === 0) {
    gridEl.innerHTML = `<p class="empty">No items match.</p>`;
    return;
  }

  gridEl.innerHTML = visible.map((g) => {
    const hasPhotos = g.images.length > 0;
    const visual = hasPhotos
      ? `<img class="carousel-img" src="${escapeHtml(g.images[0])}" alt="${escapeHtml(g.name)}" />
         ${g.images.length > 1 ? `<div class="carousel-dots">${g.images.map((_, i) => `<span class="carousel-dot ${i === 0 ? "active" : ""}"></span>`).join("")}</div>` : ""}`
      : (ICONS[g.category] || ICONS.default);
    return `
      <div class="product-card" data-key="${escapeHtml(g.category + "||" + g.name)}">
        <div class="product-visual ${hasPhotos ? "has-photo" : ""}" data-images='${escapeHtml(JSON.stringify(g.images))}' data-index="0">${visual}</div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(g.category)}</div>
          <div class="product-name">${escapeHtml(g.name)}</div>
          ${productActionsHTML(g)}
        </div>
      </div>
    `;
  }).join("");

  // Match each photo box's background to that photo's own background color,
  // and swap to the second photo on hover (mouse) or press-and-hold (touch) --
  // scoped to whichever single card is actually being interacted with.
  gridEl.querySelectorAll(".product-visual[data-images]").forEach((vis) => {
    const images = JSON.parse(vis.dataset.images);
    if (images.length === 0) return;
    const imgEl = vis.querySelector(".carousel-img");
    const dots = vis.querySelectorAll(".carousel-dot");
    const colors = {};

    const showIndex = (i) => {
      imgEl.src = images[i];
      if (colors[i]) vis.style.background = colors[i];
      dots.forEach((d, di) => d.classList.toggle("active", di === i));
    };

    images.forEach((url, i) => {
      sampleImageColor(url).then((color) => {
        if (!color) return;
        colors[i] = color;
        if (i === 0) vis.style.background = color;
      });
    });

    if (images.length <= 1) return;

    const toSecond = () => showIndex(1);
    const toFirst = () => showIndex(0);
    vis.addEventListener("mouseenter", toSecond);
    vis.addEventListener("mouseleave", toFirst);
    vis.addEventListener("touchstart", toSecond, { passive: true });
    vis.addEventListener("touchend", toFirst, { passive: true });
    vis.addEventListener("touchcancel", toFirst, { passive: true });
  });

  // Wire up Request buttons, size-selects, and click-to-zoom
  gridEl.querySelectorAll(".product-card").forEach((card) => {
    const key = card.dataset.key;
    const group = groups.find((g) => (g.category + "||" + g.name) === key);

    const visualEl = card.querySelector(".product-visual.has-photo");
    if (visualEl) {
      visualEl.style.cursor = "zoom-in";
      visualEl.addEventListener("click", () => openZoom(group));
    }

    wireProductActions(card, group);
  });
}

function openRequestModal(group, variant, qty) {
  activeVariant = { group, variant };
  modalTitle.textContent = variant.size
    ? `Request: ${group.name} — ${variant.size}`
    : `Request: ${group.name}`;
  document.getElementById("req-qty").value = qty;
  document.getElementById("req-note").value = "";
  document.getElementById("req-pickup").checked = true;
  document.getElementById("req-ship-to").value = "";
  document.getElementById("ship-to-field").hidden = true;
  const savedName = localStorage.getItem("st-inventory-name");
  document.getElementById("req-name").value = savedName || "";
  overlay.hidden = false;
}

document.getElementById("req-pickup").addEventListener("change", (e) => {
  const shipField = document.getElementById("ship-to-field");
  shipField.hidden = e.target.checked;
  if (e.target.checked) document.getElementById("req-ship-to").value = "";
});

document.getElementById("cancel-request").addEventListener("click", () => {
  overlay.hidden = true;
});

requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeVariant) return;
  const { group, variant } = activeVariant;

  const name = document.getElementById("req-name").value.trim();
  const qty = parseInt(document.getElementById("req-qty").value, 10);
  const note = document.getElementById("req-note").value.trim();
  const isPickup = document.getElementById("req-pickup").checked;
  const shipTo = document.getElementById("req-ship-to").value.trim();

  if (!name || !qty || qty < 1) return;
  if (!isPickup && !shipTo) {
    showMessage("Enter where this should be sent, or check pickup.", "error");
    return;
  }

  const { error } = await sb.from("requests").insert({
    item_id: variant.id,
    item_name: group.name,
    size: variant.size,
    requested_by: name,
    quantity_requested: qty,
    note: note || null,
    ship_to: isPickup ? null : shipTo,
  });

  overlay.hidden = true;

  if (error) {
    showMessage("Could not send request: " + error.message, "error");
  } else {
    localStorage.setItem("st-inventory-name", name);
    const label = variant.size ? `${group.name} (${variant.size})` : group.name;
    showMessage(`Request sent for ${qty} x ${label}.`, "success");
  }
});

searchEl.addEventListener("input", renderGrid);

document.getElementById("suggest-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("suggest-name").value.trim();
  const what = document.getElementById("suggest-what").value.trim();
  const detail = document.getElementById("suggest-detail").value.trim();

  if (!name || !what) return;

  const { error } = await sb.from("requests").insert({
    item_id: null,
    item_name: what,
    size: null,
    requested_by: name,
    quantity_requested: 1,
    note: detail || null,
  });

  if (error) {
    showMessage("Could not send suggestion: " + error.message, "error");
  } else {
    localStorage.setItem("st-inventory-name", name);
    showMessage("Thanks! We'll look into it.", "success");
    e.target.reset();
    document.getElementById("suggest-name").value = name;
  }
});

async function loadItems() {
  const [itemsRes, imagesRes] = await Promise.all([
    sb.from("items").select("*").order("category", { ascending: true }).order("name", { ascending: true }),
    sb.from("product_images").select("*").order("position", { ascending: true }),
  ]);

  if (itemsRes.error) {
    gridEl.innerHTML = `<p class="empty">Could not load items: ${escapeHtml(itemsRes.error.message)}</p>`;
    return;
  }

  const imagesMap = new Map();
  for (const img of imagesRes.data || []) {
    const key = img.category + "||" + img.name;
    const url = sb.storage.from("item-images").getPublicUrl(img.path).data.publicUrl;
    if (!imagesMap.has(key)) imagesMap.set(key, []);
    imagesMap.get(key).push(url);
  }

  groups = groupItems(itemsRes.data, imagesMap);
  renderPills();
  renderGrid();
}

loadItems();
