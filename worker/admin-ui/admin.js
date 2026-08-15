const state = {
  projects: [],
  tags: [],
};

// ---------------- API helper ----------------
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
  });
  if (res.status === 401) {
    showLogin();
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------------- MIME guessing ----------------
const MIME_MAP = {
  html: "text/html", htm: "text/html", css: "text/css", js: "application/javascript",
  json: "application/json", xml: "application/xml", txt: "text/plain",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  svg: "image/svg+xml", webp: "image/webp", ico: "image/x-icon",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
  mp4: "video/mp4", webm: "video/webm",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", eot: "application/vnd.ms-fontobject",
};
function guessContentType(file) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return MIME_MAP[ext] || "application/octet-stream";
}

// ---------------- Screen switching ----------------
function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
}
function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  loadProjectsPage();
}

async function boot() {
  try {
    const { authenticated } = await api("/admin/api/session");
    if (authenticated) showApp();
    else showLogin();
  } catch {
    showLogin();
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  try {
    await api("/admin/api/login", { method: "POST", body: JSON.stringify({ password }) });
    document.getElementById("login-password").value = "";
    showApp();
  } catch (err) {
    errorEl.textContent = "كلمة المرور غلط أو حصلت مشكلة، جرب تاني.";
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await api("/admin/api/logout", { method: "POST" }).catch(() => {});
  showLogin();
});

document.querySelectorAll("nav.sidebar .nav-link[data-page]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav.sidebar .nav-link[data-page]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("main > div").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`page-${btn.dataset.page}`).classList.remove("hidden");
    if (btn.dataset.page === "tags") loadTagsPage();
    if (btn.dataset.page === "partners") loadPartnersPage();
    if (btn.dataset.page === "settings") loadSettingsPage();
  });
});

// ---------------- Projects page ----------------
async function loadProjectsPage() {
  const [projectsRes, tagsRes] = await Promise.all([api("/admin/api/projects"), api("/admin/api/tags")]);
  state.projects = projectsRes.projects;
  state.tags = tagsRes.tags;
  renderProjectsPage();
}

function renderProjectsPage() {
  const root = document.getElementById("page-projects");
  root.innerHTML = `
    <h2>المشاريع</h2>
    <button class="btn" id="add-project-btn">+ إضافة مشروع</button>
    <div id="projects-list" style="margin-top:1rem;"></div>
  `;
  document.getElementById("add-project-btn").addEventListener("click", () => openProjectEditor(null));

  const list = document.getElementById("projects-list");
  if (state.projects.length === 0) {
    list.innerHTML = `<p style="color:var(--text-dim)">لسه مفيش مشاريع. دوس "إضافة مشروع" عشان تبدأ.</p>`;
    return;
  }
  list.innerHTML = state.projects
    .map(
      (p) => `
      <div class="project-row" data-id="${p.id}">
        <img src="${p.thumbnail_url || ""}" onerror="this.style.visibility='hidden'" alt="">
        <div class="info">
          <div class="title">${escapeHtml(p.title)}
            <span class="status-badge ${p.status}">${p.status === "published" ? "منشور" : "مسودة"}</span>
          </div>
          <div class="meta">${p.sample_id ? "🔒 فيه نموذج تفاعلي" : p.external_url ? "🔗 رابط خارجي" : "بدون معاينة"}</div>
          <div class="tags-inline">${p.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>
        </div>
        <div class="actions">
          <button class="btn secondary edit-btn">تعديل</button>
          <button class="btn danger delete-btn">حذف</button>
        </div>
      </div>`,
    )
    .join("");

  list.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const id = Number(e.target.closest(".project-row").dataset.id);
      openProjectEditor(state.projects.find((p) => p.id === id));
    }),
  );
  list.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = Number(e.target.closest(".project-row").dataset.id);
      if (!confirm("متأكد إنك عايز تمسح المشروع ده؟")) return;
      await api(`/admin/api/projects/${id}`, { method: "DELETE" });
      await loadProjectsPage();
    }),
  );
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------- Project editor modal ----------------
function openProjectEditor(project) {
  const isNew = !project;
  const selectedTagIds = new Set(
    isNew ? [] : state.tags.filter((t) => project.tags.includes(t.name)).map((t) => t.id),
  );
  let pendingThumbnailKey = project?.thumbnail_r2_key || null;
  let pendingSampleId = project?.sample_id || null;

  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="overlay">
      <div class="sheet">
        <h3>${isNew ? "مشروع جديد" : "تعديل مشروع"}</h3>

        <label>العنوان</label>
        <input id="f-title" value="${isNew ? "" : escapeHtml(project.title)}" />

        <label>الوصف</label>
        <textarea id="f-description" rows="2">${isNew ? "" : escapeHtml(project.description || "")}</textarea>

        <div class="row">
          <div>
            <label>رابط خارجي (Open Template)</label>
            <input id="f-external-url" value="${isNew ? "" : escapeHtml(project.external_url || "")}" placeholder="https://..." />
          </div>
          <div>
            <label>الحالة</label>
            <select id="f-status">
              <option value="draft" ${!isNew && project.status === "draft" ? "selected" : ""}>مسودة</option>
              <option value="published" ${!isNew && project.status === "published" ? "selected" : ""}>منشور</option>
            </select>
          </div>
        </div>

        <label>الصورة المصغرة (thumbnail)</label>
        <input type="file" id="f-thumbnail" accept="image/*" />
        <div class="error-msg" id="thumb-status"></div>

        <label>التاجات</label>
        <div class="tag-picker" id="tag-picker"></div>
        <div class="row" style="margin-top:0.4rem;">
          <input id="f-new-tag" placeholder="اسم تاج جديد..." />
          <button class="btn secondary" id="add-tag-btn" type="button" style="flex:0 0 auto;">إضافة تاج</button>
        </div>

        <label>نموذج تفاعلي محمي (اختياري)</label>
        ${pendingSampleId ? `<div class="ok-msg">فيه نموذج مرفوع بالفعل (id: ${pendingSampleId.slice(0, 8)}…)</div>` : ""}
        <div class="upload-zone">
          <input type="file" id="f-sample-folder" webkitdirectory multiple />
          <div style="margin-top:0.4rem;">اختار فولدر النموذج (لازم يحتوي index.html)</div>
        </div>
        <div class="progress-bar hidden" id="sample-progress"><div></div></div>
        <div class="error-msg" id="sample-status"></div>

        <div class="error-msg" id="editor-error"></div>
        <div class="actions-bar">
          <button class="btn secondary" id="cancel-btn" type="button">إلغاء</button>
          <button class="btn" id="save-btn" type="button">حفظ</button>
        </div>
      </div>
    </div>
  `;

  const tagPicker = document.getElementById("tag-picker");
  function renderTagPicker() {
    tagPicker.innerHTML = state.tags
      .map(
        (t) =>
          `<button type="button" class="tag-toggle ${selectedTagIds.has(t.id) ? "selected" : ""}" data-id="${t.id}">${escapeHtml(t.name)}</button>`,
      )
      .join("");
    tagPicker.querySelectorAll(".tag-toggle").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        if (selectedTagIds.has(id)) selectedTagIds.delete(id);
        else selectedTagIds.add(id);
        renderTagPicker();
      }),
    );
  }
  renderTagPicker();

  document.getElementById("add-tag-btn").addEventListener("click", async () => {
    const input = document.getElementById("f-new-tag");
    const name = input.value.trim();
    if (!name) return;
    const { tag } = await api("/admin/api/tags", { method: "POST", body: JSON.stringify({ name }) });
    if (!state.tags.some((t) => t.id === tag.id)) state.tags.push(tag);
    selectedTagIds.add(tag.id);
    input.value = "";
    renderTagPicker();
  });

  document.getElementById("f-thumbnail").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById("thumb-status");
    statusEl.textContent = "جاري الرفع...";
    statusEl.className = "error-msg";
    try {
      const { uploads } = await api("/admin/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ kind: "thumbnail", files: [{ path: file.name, size: file.size, contentType: guessContentType(file) }] }),
      });
      const upload = uploads[0];
      await fetch(upload.url, { method: "PUT", headers: { "Content-Type": guessContentType(file) }, body: file });
      pendingThumbnailKey = upload.key;
      statusEl.textContent = "تم رفع الصورة ✓";
      statusEl.className = "ok-msg";
    } catch (err) {
      statusEl.textContent = "فشل رفع الصورة: " + err.message;
    }
  });

  document.getElementById("f-sample-folder").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const statusEl = document.getElementById("sample-status");
    const progressWrap = document.getElementById("sample-progress");
    const progressBar = progressWrap.querySelector("div");
    progressWrap.classList.remove("hidden");
    statusEl.className = "error-msg";
    statusEl.textContent = "";

    const descriptors = files.map((f) => ({
      path: f.webkitRelativePath.split("/").slice(1).join("/") || f.name,
      size: f.size,
      contentType: guessContentType(f),
    }));

    if (!descriptors.some((d) => d.path === "index.html")) {
      statusEl.textContent = 'الفولدر لازم يحتوي ملف "index.html" في المستوى الأول.';
      return;
    }

    try {
      const { sampleId, uploads } = await api("/admin/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ sampleId: pendingSampleId, kind: "sample", files: descriptors }),
      });

      let done = 0;
      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i];
        const file = files[i];
        await fetch(upload.url, { method: "PUT", headers: { "Content-Type": descriptors[i].contentType }, body: file });
        done++;
        progressBar.style.width = `${Math.round((done / uploads.length) * 100)}%`;
      }

      await api("/admin/api/samples", {
        method: "POST",
        body: JSON.stringify({
          sampleId,
          title: document.getElementById("f-title").value || "sample",
          entryFile: "index.html",
          manifest: descriptors,
        }),
      });

      pendingSampleId = sampleId;
      statusEl.textContent = `تم رفع ${uploads.length} ملف بنجاح ✓`;
      statusEl.className = "ok-msg";
    } catch (err) {
      statusEl.textContent = "فشل الرفع: " + err.message;
    }
  });

  document.getElementById("cancel-btn").addEventListener("click", () => {
    root.innerHTML = "";
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("editor-error");
    errorEl.textContent = "";
    const payload = {
      title: document.getElementById("f-title").value.trim(),
      description: document.getElementById("f-description").value.trim(),
      external_url: document.getElementById("f-external-url").value.trim() || null,
      status: document.getElementById("f-status").value,
      thumbnail_r2_key: pendingThumbnailKey,
      sample_id: pendingSampleId,
    };
    if (!payload.title) {
      errorEl.textContent = "العنوان مطلوب.";
      return;
    }
    try {
      let id = project?.id;
      if (isNew) {
        const created = await api("/admin/api/projects", { method: "POST", body: JSON.stringify(payload) });
        id = created.id;
      } else {
        await api(`/admin/api/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      await api(`/admin/api/projects/${id}/tags`, { method: "POST", body: JSON.stringify({ tagIds: [...selectedTagIds] }) });
      root.innerHTML = "";
      await loadProjectsPage();
    } catch (err) {
      errorEl.textContent = "فشل الحفظ: " + err.message;
    }
  });
}

// ---------------- Tags page ----------------
async function loadTagsPage() {
  const { tags } = await api("/admin/api/tags");
  state.tags = tags;
  const root = document.getElementById("page-tags");
  root.innerHTML = `
    <h2 class="tags-page">التاجات</h2>
    <div class="row" style="max-width:400px;">
      <input id="new-tag-name" placeholder="اسم تاج جديد..." />
      <button class="btn" id="create-tag-btn" style="flex:0 0 auto;">إضافة</button>
    </div>
    <ul style="margin-top:1rem; max-width:400px;">
      ${tags.map((t) => `<li data-id="${t.id}"><span>${escapeHtml(t.name)}</span><button class="btn danger" data-id="${t.id}" style="padding:0.2rem 0.6rem;">حذف</button></li>`).join("")}
    </ul>
  `;
  document.getElementById("create-tag-btn").addEventListener("click", async () => {
    const input = document.getElementById("new-tag-name");
    const name = input.value.trim();
    if (!name) return;
    await api("/admin/api/tags", { method: "POST", body: JSON.stringify({ name }) });
    await loadTagsPage();
  });
  root.querySelectorAll("li button").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("حذف التاج ده هيشيله من كل المشاريع. متأكد؟")) return;
      await api(`/admin/api/tags/${btn.dataset.id}`, { method: "DELETE" });
      await loadTagsPage();
    }),
  );
}

// ---------------- Partners (logo strip) page ----------------
const FONT_OPTIONS = [
  { value: "poppins", label: "Poppins (الحالي)" },
  { value: "inter", label: "Inter" },
  { value: "montserrat", label: "Montserrat" },
  { value: "roboto", label: "Roboto" },
  { value: "cairo", label: "Cairo (يدعم العربي)" },
  { value: "tajawal", label: "Tajawal (يدعم العربي)" },
];

async function loadPartnersPage() {
  const { partners } = await api("/admin/api/partners");
  state.partners = partners;
  const root = document.getElementById("page-partners");
  root.innerHTML = `
    <h2>لوجوهات الشركاء (الشريط الأبيض)</h2>
    <div class="upload-zone" style="max-width:400px; text-align:right;">
      <label>إضافة لوجو جديد</label>
      <input type="file" id="new-partner-logo" accept="image/*" />
      <input id="new-partner-name" placeholder="اسم الشريك (اختياري)" style="margin-top:0.5rem;" />
      <input id="new-partner-link" placeholder="رابط عند الضغط (اختياري)" style="margin-top:0.5rem;" />
      <button class="btn" id="add-partner-btn" style="margin-top:0.6rem;">إضافة</button>
      <div class="error-msg" id="partner-add-status"></div>
    </div>
    <div id="partners-list" style="margin-top:1.5rem; display:flex; flex-wrap:wrap; gap:0.75rem;"></div>
  `;

  const list = document.getElementById("partners-list");
  partners.forEach((p) => {
    const card = document.createElement("div");
    card.style.cssText =
      "background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:0.75rem;width:160px;text-align:center;";
    card.innerHTML = `
      <img src="${p.logo_url || ""}" style="width:100%; height:60px; object-fit:contain; background:#fff; border-radius:6px;" alt="">
      <div style="font-size:0.8rem; margin-top:0.4rem; color:var(--text-dim);">${escapeHtml(p.name || "بدون اسم")}</div>
      <button class="btn danger" data-id="${p.id}" style="width:100%; margin-top:0.5rem; padding:0.3rem;">حذف</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      if (!confirm("حذف اللوجو ده؟")) return;
      await api(`/admin/api/partners/${p.id}`, { method: "DELETE" });
      await loadPartnersPage();
    });
    list.appendChild(card);
  });

  document.getElementById("add-partner-btn").addEventListener("click", async () => {
    const fileInput = document.getElementById("new-partner-logo");
    const file = fileInput.files[0];
    const statusEl = document.getElementById("partner-add-status");
    if (!file) {
      statusEl.textContent = "اختار صورة اللوجو الأول.";
      return;
    }
    statusEl.className = "error-msg";
    statusEl.textContent = "جاري الرفع...";
    try {
      const { uploads } = await api("/admin/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ kind: "partner-logo", files: [{ path: file.name, size: file.size, contentType: guessContentType(file) }] }),
      });
      const upload = uploads[0];
      await fetch(upload.url, { method: "PUT", headers: { "Content-Type": guessContentType(file) }, body: file });
      await api("/admin/api/partners", {
        method: "POST",
        body: JSON.stringify({
          logo_r2_key: upload.key,
          name: document.getElementById("new-partner-name").value.trim() || null,
          link_url: document.getElementById("new-partner-link").value.trim() || null,
        }),
      });
      await loadPartnersPage();
    } catch (err) {
      statusEl.textContent = "فشل الإضافة: " + err.message;
    }
  });
}

// ---------------- Site settings page ----------------
async function loadSettingsPage() {
  const { settings } = await api("/admin/api/site");
  const root = document.getElementById("page-settings");
  const v = (key) => escapeHtml(settings[key] || "");

  root.innerHTML = `
    <h2>إعدادات الموقع</h2>

    <h3 style="font-size:1rem; color:var(--text-dim); margin-top:1.5rem;">الشاشة الرئيسية (Home)</h3>
    <label>الاسم / العنوان الرئيسي</label>
    <input id="s-hero-title" value="${v("hero_title")}" />
    <label>الوصف تحت الاسم</label>
    <input id="s-hero-tagline" value="${v("hero_tagline")}" />
    <label>نص الترحيب</label>
    <input id="s-hero-welcome" value="${v("hero_welcome_text")}" />

    <h3 style="font-size:1rem; color:var(--text-dim); margin-top:1.5rem;">قسم About</h3>
    <label>صورة About</label>
    <input type="file" id="s-about-photo" accept="image/*" />
    <div class="error-msg" id="about-photo-status"></div>
    <label>النبذة التعريفية</label>
    <textarea id="s-about-bio" rows="4">${v("about_bio")}</textarea>
    <label>رابط تحميل الـ CV</label>
    <input id="s-cv-url" value="${v("cv_url")}" />

    <h3 style="font-size:1rem; color:var(--text-dim); margin-top:1.5rem;">روابط التواصل</h3>
    <div class="row">
      <div><label>Facebook</label><input id="s-facebook" value="${v("social_facebook")}" /></div>
      <div><label>LinkedIn</label><input id="s-linkedin" value="${v("social_linkedin")}" /></div>
    </div>
    <div class="row">
      <div><label>GitHub</label><input id="s-github" value="${v("social_github")}" /></div>
      <div><label>WhatsApp (رقم بالكود الدولي)</label><input id="s-whatsapp" value="${v("social_whatsapp_number")}" /></div>
    </div>
    <div class="row">
      <div><label>Email</label><input id="s-email" value="${v("social_email")}" /></div>
      <div><label>Phone</label><input id="s-phone" value="${v("social_phone")}" /></div>
    </div>

    <h3 style="font-size:1rem; color:var(--text-dim); margin-top:1.5rem;">الخط المستخدم في الموقع</h3>
    <select id="s-font">
      ${FONT_OPTIONS.map((f) => `<option value="${f.value}" ${settings.font_choice === f.value ? "selected" : ""}>${f.label}</option>`).join("")}
    </select>

    <div class="error-msg" id="settings-error"></div>
    <div class="ok-msg" id="settings-ok"></div>
    <button class="btn" id="save-settings-btn" style="margin-top:1.25rem;">حفظ الإعدادات</button>
  `;

  let pendingAboutPhotoKey = settings.about_photo_r2_key || null;

  document.getElementById("s-about-photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById("about-photo-status");
    statusEl.className = "error-msg";
    statusEl.textContent = "جاري الرفع...";
    try {
      const { uploads } = await api("/admin/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ kind: "about-photo", files: [{ path: file.name, size: file.size, contentType: guessContentType(file) }] }),
      });
      const upload = uploads[0];
      await fetch(upload.url, { method: "PUT", headers: { "Content-Type": guessContentType(file) }, body: file });
      pendingAboutPhotoKey = upload.key;
      statusEl.textContent = "تم رفع الصورة ✓ (هتتحفظ لما تدوس حفظ الإعدادات)";
      statusEl.className = "ok-msg";
    } catch (err) {
      statusEl.textContent = "فشل رفع الصورة: " + err.message;
    }
  });

  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("settings-error");
    const okEl = document.getElementById("settings-ok");
    errorEl.textContent = "";
    okEl.textContent = "";
    const payload = {
      hero_title: document.getElementById("s-hero-title").value.trim(),
      hero_tagline: document.getElementById("s-hero-tagline").value.trim(),
      hero_welcome_text: document.getElementById("s-hero-welcome").value.trim(),
      about_bio: document.getElementById("s-about-bio").value.trim(),
      about_photo_r2_key: pendingAboutPhotoKey || "",
      cv_url: document.getElementById("s-cv-url").value.trim(),
      social_facebook: document.getElementById("s-facebook").value.trim(),
      social_linkedin: document.getElementById("s-linkedin").value.trim(),
      social_github: document.getElementById("s-github").value.trim(),
      social_whatsapp_number: document.getElementById("s-whatsapp").value.trim(),
      social_email: document.getElementById("s-email").value.trim(),
      social_phone: document.getElementById("s-phone").value.trim(),
      font_choice: document.getElementById("s-font").value,
    };
    try {
      await api("/admin/api/site", { method: "PUT", body: JSON.stringify(payload) });
      okEl.textContent = "اتحفظ بنجاح ✓";
    } catch (err) {
      errorEl.textContent = "فشل الحفظ: " + err.message;
    }
  });
}

boot();
