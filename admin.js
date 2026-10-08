const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

const msgEl = document.getElementById("msg");
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const signOutLink = document.getElementById("sign-out");

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

// --- Auth ---

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage("Sign in failed: " + error.message, "error");
  }
});

signOutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange((_event, session) => {
  if (session) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    signOutLink.style.display = "inline";
    loadRequests();
    loadItems();
  } else {
    loginSection.style.display = "block";
    adminSection.style.display = "none";
    signOutLink.style.display = "none";
  }
});

// --- Items ---

function groupItems(items, imagesMap) {
  const map = new Map();
  for (const item of items) {
    const key = item.category + "||" + item.name;
    if (!map.has(key)) map.set(key, { category: item.category, name: item.name, variants: [], images: imagesMap.get(key) || [] });
    map.get(key).variants.push(item);
  }
  const list = Array.from(map.values());
  for (const g of list) g.variants.sort((a, b) => sizeIndex(a.size) - sizeIndex(b.size));
  return list;
}

let lastGroups = [];

function renderReorder() {
  const rowsEl = document.getElementById("reorder-rows");
  const min = parseInt(document.getElementById("reorder-min").value, 10) || 0;

  const low = lastGroups
    .map((g) => ({ ...g, total: g.variants.reduce((sum, v) => sum + v.quantity, 0) }))
    .filter((g) => g.total < min)
    .sort((a, b) => (min - b.total) - (min - a.total));

  if (low.length === 0) {
    rowsEl.innerHTML = `<tr><td colspan="4" class="empty">Everything is at or above ${min}.</td></tr>`;
    return;
  }

  rowsEl.innerHTML = low.map((g) => `
    <tr>
      <td>${escapeHtml(g.name)}</td>
      <td>${escapeHtml(g.category)}</td>
      <td><span class="qty ${g.total === 0 ? "out" : "low"}">${g.total}</span></td>
      <td>${min - g.total}</td>
    </tr>
  `).join("");
}

document.getElementById("reorder-min").addEventListener("input", renderReorder);

async function loadItems() {
  const container = document.getElementById("item-groups");
  const [itemsRes, imagesRes] = await Promise.all([
    sb.from("items").select("*").order("category", { ascending: true }).order("name", { ascending: true }),
    sb.from("product_images").select("*").order("position", { ascending: true }),
  ]);

  if (itemsRes.error) {
    container.innerHTML = `<p class="empty">${escapeHtml(itemsRes.error.message)}</p>`;
    return;
  }
  if (itemsRes.data.length === 0) {
    container.innerHTML = `<p class="empty">No items yet.</p>`;
    return;
  }

  const imagesMap = new Map();
  for (const img of imagesRes.data || []) {
    const key = img.category + "||" + img.name;
    const url = sb.storage.from("item-images").getPublicUrl(img.path).data.publicUrl;
    if (!imagesMap.has(key)) imagesMap.set(key, []);
    imagesMap.get(key).push({ id: img.id, path: img.path, url });
  }

  const groups = groupItems(itemsRes.data, imagesMap);
  lastGroups = groups;
  renderReorder();

  container.innerHTML = groups.map((g, gi) => `
    <div style="margin-bottom:1.25rem;" data-group-index="${gi}">
      <div style="font-weight:700; margin-bottom:0.5rem;">${escapeHtml(g.name)} <span style="color:var(--ink-soft); font-weight:500; font-size:0.85rem;">${escapeHtml(g.category)}</span></div>
      <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.6rem; flex-wrap:wrap;">
        ${g.images.map((img) => `
          <div class="thumb" data-image-id="${img.id}" data-image-path="${escapeHtml(img.path)}" style="position:relative;">
            <img src="${escapeHtml(img.url)}" alt="" />
            <button type="button" class="thumb-delete" title="Remove photo">&times;</button>
          </div>
        `).join("")}
        <div class="thumb thumb-add-wrap">
          <span class="thumb-empty">${g.images.length === 0 ? "No photos" : "+ Add"}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem;">
        <input type="file" accept="image/*" class="photo-input" style="max-width:220px;" />
        <button class="btn secondary upload-photo">Add photo</button>
      </div>
      <div class="request-note preview-note" hidden style="color:var(--orange-text); margin-bottom:0.6rem;">Preview only &mdash; click Add photo to save it to ${escapeHtml(g.name)}.</div>
      <table>
        <thead><tr><th>Size</th><th>Quantity</th><th></th></tr></thead>
        <tbody>
          ${g.variants.map((v) => `
            <tr data-id="${v.id}">
              <td>${escapeHtml(v.size || "One size")}</td>
              <td style="max-width:110px;"><input type="number" min="0" value="${v.quantity}" class="qty-input" /></td>
              <td style="white-space:nowrap;">
                <button class="btn save-qty">Save</button>
                <button class="btn danger delete-item">Delete</button>
              </td>
            </tr>
          `).join("")}
          <tr class="add-size-row">
            <td><input type="text" class="add-size-input" placeholder="Size (optional)" style="max-width:110px;" /></td>
            <td style="max-width:110px;"><input type="number" min="0" value="0" class="add-qty-input" /></td>
            <td style="white-space:nowrap;"><button class="btn secondary add-size">Add size</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  `).join("");

  container.querySelectorAll("[data-group-index]").forEach((block) => {
    const g = groups[parseInt(block.dataset.groupIndex, 10)];
    const fileInput = block.querySelector(".photo-input");
    const addWrap = block.querySelector(".thumb-add-wrap");
    const previewNote = block.querySelector(".preview-note");

    block.querySelector(".add-size").addEventListener("click", async () => {
      const sizeInput = block.querySelector(".add-size-input");
      const qtyInput = block.querySelector(".add-qty-input");
      const size = sizeInput.value.trim();
      const quantity = parseInt(qtyInput.value, 10) || 0;
      const unit = g.variants[0]?.unit || "unit";

      const { error } = await sb.from("items").insert({
        name: g.name,
        category: g.category || null,
        size: size || null,
        quantity,
        unit,
      });

      if (error) showMessage("Could not add size: " + error.message, "error");
      else { showMessage("Size added.", "success"); loadItems(); }
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      addWrap.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" />`;
      previewNote.hidden = false;
    });

    block.querySelector(".upload-photo").addEventListener("click", async () => {
      const file = fileInput.files[0];
      if (!file) { showMessage("Choose a photo first.", "error"); return; }

      const slug = (g.category + "-" + g.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const ext = file.name.split(".").pop();
      const path = `${slug}-${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage.from("item-images").upload(path, file, { cacheControl: "3600" });
      if (uploadError) { showMessage("Upload failed: " + uploadError.message, "error"); return; }

      const { error: insertError } = await sb.from("product_images").insert({
        category: g.category,
        name: g.name,
        path,
        position: g.images.length,
      });

      if (insertError) showMessage("Photo uploaded but could not save to item: " + insertError.message, "error");
      else { showMessage("Photo added.", "success"); loadItems(); }
    });

    block.querySelectorAll(".thumb-delete").forEach((delBtn) => {
      delBtn.addEventListener("click", async () => {
        const thumb = delBtn.closest(".thumb");
        const imageId = thumb.dataset.imageId;
        const imagePath = thumb.dataset.imagePath;
        if (!confirm("Remove this photo?")) return;

        await sb.storage.from("item-images").remove([imagePath]);
        const { error } = await sb.from("product_images").delete().eq("id", imageId);
        if (error) showMessage("Could not remove photo: " + error.message, "error");
        else { showMessage("Photo removed.", "success"); loadItems(); }
      });
    });
  });

  container.querySelectorAll("tr[data-id]").forEach((tr) => {
    const id = tr.dataset.id;
    tr.querySelector(".save-qty").addEventListener("click", async () => {
      const newQty = parseInt(tr.querySelector(".qty-input").value, 10);
      if (isNaN(newQty) || newQty < 0) return;
      const { error } = await sb.from("items").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) showMessage("Could not update: " + error.message, "error");
      else showMessage("Stock updated.", "success");
    });
    tr.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      const { error } = await sb.from("items").delete().eq("id", id);
      if (error) showMessage("Could not delete: " + error.message, "error");
      else { showMessage("Item deleted.", "success"); loadItems(); }
    });
  });
}

document.getElementById("add-item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("new-name").value.trim();
  const category = document.getElementById("new-category").value.trim();
  const size = document.getElementById("new-size").value.trim();
  const quantity = parseInt(document.getElementById("new-qty").value, 10) || 0;
  const unit = document.getElementById("new-unit").value.trim() || "unit";

  if (!name) return;

  const { error } = await sb.from("items").insert({ name, category: category || null, size: size || null, quantity, unit });
  if (error) {
    showMessage("Could not add item: " + error.message, "error");
  } else {
    showMessage("Item added.", "success");
    e.target.reset();
    document.getElementById("new-unit").value = "unit";
    loadItems();
  }
});

// --- Requests ---

async function loadRequests() {
  const rowsEl = document.getElementById("request-rows");
  const { data, error } = await sb
    .from("requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    rowsEl.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (data.length === 0) {
    rowsEl.innerHTML = `<tr><td colspan="7" class="empty">No pending requests.</td></tr>`;
    return;
  }

  rowsEl.innerHTML = data.map((r) => {
    const isSuggestion = !r.item_id;
    return `
    <tr class="request-row" data-id="${r.id}">
      <td>${escapeHtml(r.item_name)}${isSuggestion ? ` <span class="request-note">(new idea)</span>` : ""}</td>
      <td>${escapeHtml(r.size || "-")}</td>
      <td>${r.quantity_requested}</td>
      <td>${escapeHtml(r.requested_by)}</td>
      <td>${isSuggestion ? "-" : (r.ship_to ? `Ship to:<br><span class="request-note">${escapeHtml(r.ship_to)}</span>` : "Pickup")}</td>
      <td class="request-note">${escapeHtml(r.note || "")}</td>
      <td style="white-space:nowrap;">
        <button class="btn good fulfill-request">${isSuggestion ? "Mark reviewed" : "Fulfill"}</button>
        <button class="btn danger reject-request">${isSuggestion ? "Dismiss" : "Reject"}</button>
      </td>
    </tr>
  `;
  }).join("");

  rowsEl.querySelectorAll("tr").forEach((tr) => {
    const id = tr.dataset.id;
    tr.querySelector(".fulfill-request").addEventListener("click", async () => {
      const { error } = await sb.rpc("fulfill_request", { req_id: id });
      if (error) showMessage("Could not fulfill: " + error.message, "error");
      else { showMessage("Request fulfilled, stock updated.", "success"); loadRequests(); loadItems(); }
    });
    tr.querySelector(".reject-request").addEventListener("click", async () => {
      const { error } = await sb.from("requests").update({ status: "rejected", resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) showMessage("Could not reject: " + error.message, "error");
      else { showMessage("Request rejected.", "success"); loadRequests(); }
    });
  });
}
