/* Projects: list, filter, search, add, edit, delete, cover upload.
   Database text goes in with textContent / .value only (never innerHTML).
   Real protection is Row Level Security; this file only drives the screen. */
(function () {
  "use strict";

  var auth = window.SCAuth;
  var listEl = document.getElementById("pList");
  if (!auth || !listEl) return;
  var db = auth.client;
  var $ = function (id) { return document.getElementById(id); };

  var BUCKET = "project-images";
  var MAX_BYTES = 2 * 1024 * 1024;
  var TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  var slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  var rows = [], filter = "all", query = "", editing = null, controls = {}, armTimer = null;
  var coverUrl = null;      /* cover currently chosen in the open dialog */
  var uploadedNow = [];     /* files uploaded in this dialog session (cleaned up if not saved) */

  var msgEl = $("pMsg"), dlg = $("pDlg"), form = $("pForm"), fieldsEl = $("pFields");
  var dlgMsg = $("pDlgMsg"), saveBtn = $("pSave"), delBtn = $("pDelete");

  /* ---------- field definitions ---------- */
  function fields() {
    return [
      { name: "title", label: "Title", type: "text", required: true, max: 120, wide: true },
      { name: "slug", label: "Slug", type: "text", max: 120, hint: "Used in the page address. Lowercase letters, numbers and dashes. Left empty, it is made from the title." },
      { name: "category", label: "Category", type: "select", options: [["websites", "Websites"], ["software", "Software (ERP, admin panels)"], ["ai", "AI and Automation"], ["other", "Other"]], hint: "Decides which filter the project appears under on the website." },
      { name: "type_label", label: "Card label", type: "text", max: 60, hint: "Small text on the website card, e.g. ERP System. Left empty, the category name is used." },
      { name: "summary", label: "Short summary", type: "textarea", rows: 2, max: 300, wide: true },
      { name: "description", label: "Full description", type: "textarea", rows: 6, max: 5000, wide: true },
      { name: "tech_stack", label: "Tech stack", type: "tags", max: 300, wide: true, hint: "Separate with commas, e.g. HTML, CSS, JavaScript, Supabase" },
      { name: "demo_url", label: "Live demo URL", type: "url", max: 300 },
      { name: "source_url", label: "Source / GitHub URL", type: "url", max: 300 },
      { name: "cover_url", label: "Cover image", type: "cover", wide: true },
      { name: "sort_order", label: "Sort order", type: "number", hint: "Smaller numbers appear first." },
      { name: "is_published", label: "Published on the website", type: "check" },
      { name: "is_featured", label: "Featured", type: "check" },
      { name: "is_demo", label: "This is a demo project", type: "check" }
    ];
  }

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function topMsg(text, ok) {
    msgEl.textContent = text;
    msgEl.classList.toggle("is-ok", !!ok);
    msgEl.hidden = !text;
  }
  function setDlgMsg(text, isError) {
    dlgMsg.textContent = text;
    dlgMsg.classList.toggle("is-error", !!isError);
    dlgMsg.hidden = !text;
  }
  function slugify(s) {
    return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  }
  function nextOrder() {
    var m = 0;
    rows.forEach(function (r) { if (typeof r.sort_order === "number" && r.sort_order > m) m = r.sort_order; });
    return m + 1;
  }
  function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
  function isHttp(u) { return /^https?:\/\/[^\s]+$/i.test(u); }
  function isOurImage(u) {
    return typeof u === "string" && u.indexOf(window.SC_CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/") === 0;
  }
  function pathFromUrl(u) {
    return u.slice((window.SC_CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/").length);
  }
  function removeFiles(urls) {
    var paths = urls.filter(isOurImage).map(pathFromUrl);
    if (!paths.length) return Promise.resolve();
    return db.storage.from(BUCKET).remove(paths).then(function () {}, function () {});
  }
  function dbHint(err) {
    var t = err && err.message ? String(err.message) : "";
    if (err && err.code === "23505") return "That slug is already used. Choose another.";
    if (err && err.code === "42501") return "Your account does not have permission for this action.";
    return t ? "Could not save: " + t : "Could not save. Please try again.";
  }
  var PERM = "Nothing was changed. Your account may not have permission for this action (check the database policies).";

  /* ---------- list ---------- */
  function matches(r) {
    if (filter === "published" && !r.is_published) return false;
    if (filter === "draft" && r.is_published) return false;
    if (!query) return true;
    var hay = [r.title, r.slug, r.category, r.summary, (r.tech_stack || []).join(" ")]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function updateCounts() {
    var pub = rows.filter(function (r) { return r.is_published; }).length;
    var c = { all: rows.length, published: pub, draft: rows.length - pub };
    document.querySelectorAll("[data-count]").forEach(function (n) {
      n.textContent = String(c[n.getAttribute("data-count")] || 0);
    });
  }

  function thumb(r) {
    if (r.cover_url && isOurImage(r.cover_url)) {
      var img = el("img", "thumb");
      img.src = r.cover_url; img.alt = ""; img.loading = "lazy";
      return img;
    }
    return el("span", "thumb thumb--empty", "No img");
  }

  function render() {
    updateCounts();
    listEl.textContent = "";
    var shown = rows.filter(matches);
    if (!shown.length) {
      listEl.appendChild(el("li", "list__empty", rows.length ? "Nothing matches your filter." : "No projects yet."));
      return;
    }
    shown.forEach(function (r) {
      var li = document.createElement("li");
      var b = el("button", "inq__row inq__row--proj"); b.type = "button";
      var lead = el("span", "inq__lead");
      lead.appendChild(thumb(r));
      var main = el("span", "inq__main");
      main.appendChild(el("span", "inq__name", r.title || "Untitled"));
      main.appendChild(el("span", "inq__sub", [r.category, r.slug].filter(Boolean).join(" · ") || (r.summary || "")));
      if (r.tech_stack && r.tech_stack.length) {
        var tags = el("span", "tags");
        r.tech_stack.slice(0, 4).forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
        main.appendChild(tags);
      }
      lead.appendChild(main);
      var side = el("span", "inq__side");
      var pills = el("span");
      pills.appendChild(el("span", "pill" + (r.is_published ? " is-new" : ""), r.is_published ? "Published" : "Draft"));
      if (r.is_featured) {
        var f = el("span", "pill is-progress", "Featured");
        f.style.marginLeft = "6px"; pills.appendChild(f);
      }
      side.appendChild(pills);
      side.appendChild(el("span", "order", "Order " + (r.sort_order == null ? "–" : r.sort_order)));
      b.appendChild(lead); b.appendChild(side);
      b.addEventListener("click", function () { openRecord(r); });
      li.appendChild(b); listEl.appendChild(li);
    });
  }

  function load() {
    db.from("projects").select("*").order("sort_order", { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        rows = res.data || [];
        topMsg("");
        render();
      }).catch(function () {
        topMsg("Could not load projects. Please refresh the page.");
        listEl.textContent = "";
        listEl.appendChild(el("li", "list__empty", "Could not load projects."));
      });
  }

  /* ---------- filters, search, add ---------- */
  document.querySelectorAll("#pFilters .chip").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.getAttribute("data-filter");
      document.querySelectorAll("#pFilters .chip").forEach(function (o) {
        o.setAttribute("aria-pressed", o === b ? "true" : "false");
      });
      render();
    });
  });
  $("pSearch").addEventListener("input", function () {
    query = this.value.trim().toLowerCase(); render();
  });
  $("pAdd").addEventListener("click", function () { openRecord(null); });

  /* ---------- cover control ---------- */
  function buildCover(wrap, label) {
    var l = el("span", null, label);
    l.style.cssText = "display:block;font-size:.85rem;font-weight:700;margin-bottom:6px";
    wrap.appendChild(l);

    var box = el("div", "cover");
    var preview = el("img", "cover__preview"); preview.alt = "Cover preview"; preview.hidden = true;
    var actions = el("div", "cover__actions");
    var pick = el("button", "btn btn--ghost", "Choose image"); pick.type = "button";
    var clear = el("button", "btn btn--ghost", "Remove"); clear.type = "button";
    var file = document.createElement("input");
    file.type = "file"; file.accept = "image/png,image/jpeg,image/webp"; file.className = "sr-only";
    file.setAttribute("aria-label", "Cover image file");
    var note = el("span", "cover__note", "PNG, JPG or WebP, up to 2 MB.");
    actions.appendChild(pick); actions.appendChild(clear); actions.appendChild(note);
    box.appendChild(preview); box.appendChild(actions); box.appendChild(file);
    wrap.appendChild(box);

    function sync() {
      var ok = coverUrl && isOurImage(coverUrl);
      preview.hidden = !ok;
      if (ok) preview.src = coverUrl; else preview.removeAttribute("src");
      clear.hidden = !coverUrl;
      pick.textContent = coverUrl ? "Replace image" : "Choose image";
    }
    sync();

    pick.addEventListener("click", function () { file.click(); });
    clear.addEventListener("click", function () { coverUrl = null; sync(); });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      var ext = TYPES[f.type];
      if (!ext) { setDlgMsg("Only PNG, JPG or WebP images are allowed.", true); return; }
      if (f.size > MAX_BYTES) { setDlgMsg("Image is too large (2 MB max).", true); return; }
      var rand = Math.random().toString(36).slice(2, 8);
      var path = "covers/" + Date.now() + "-" + rand + "." + ext;
      pick.disabled = true; pick.textContent = "Uploading...";
      setDlgMsg("", false);
      db.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000", upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          var url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          if (coverUrl && uploadedNow.indexOf(coverUrl) !== -1) {
            removeFiles([coverUrl]);
            uploadedNow = uploadedNow.filter(function (u) { return u !== coverUrl; });
          }
          uploadedNow.push(url);
          coverUrl = url;
        })
        .catch(function () { setDlgMsg("Upload failed. Check the storage policies and try again.", true); })
        .then(function () { pick.disabled = false; sync(); });
    });
    return { get: function () { return coverUrl; } };
  }

  /* ---------- form ---------- */
  function buildField(f, rec) {
    var wrap = el("div", "field" + (f.wide ? " span2" : ""));
    var id = "f_" + f.name, ctl;

    if (f.type === "check") {
      var lab = el("label", "check");
      ctl = document.createElement("input"); ctl.type = "checkbox"; ctl.id = id;
      ctl.checked = rec ? !!rec[f.name] : false;
      lab.appendChild(ctl); lab.appendChild(el("span", null, f.label));
      wrap.appendChild(lab);
    } else if (f.type === "cover") {
      ctl = buildCover(wrap, f.label);
    } else {
      var l = el("label", null, f.label + (f.required ? " *" : "")); l.setAttribute("for", id);
      wrap.appendChild(l);
      if (f.type === "textarea") {
        ctl = document.createElement("textarea"); ctl.rows = f.rows || 4;
      } else if (f.type === "select") {
        ctl = document.createElement("select");
        var opts = f.options.slice();
        var cur = rec ? rec[f.name] : null;
        if (cur && !opts.some(function (o) { return o[0] === cur; })) opts.push([cur, cur + " (not in website filters)"]);
        opts.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; ctl.appendChild(op); });
      } else {
        ctl = document.createElement("input");
        ctl.type = f.type === "tags" ? "text" : f.type;
        if (f.type === "number") ctl.step = "1";
        if (f.type === "url") ctl.setAttribute("inputmode", "url");
      }
      ctl.id = id;
      if (f.max) ctl.maxLength = f.max;
      if (f.list) ctl.setAttribute("list", "catList");
      var val = rec ? rec[f.name] : "";
      if (f.type === "tags") val = Array.isArray(val) ? val.join(", ") : "";
      if (f.type === "select" && !val) val = rec ? "other" : f.options[0][0];
      if (f.name === "sort_order" && !rec) val = nextOrder();
      ctl.value = val == null ? "" : String(val);
      wrap.appendChild(ctl);
      if (f.hint) wrap.appendChild(el("span", "hint", f.hint));
    }
    controls[f.name] = { el: ctl, def: f, wrap: wrap };
    return wrap;
  }

  function openRecord(rec) {
    editing = rec;
    controls = {};
    uploadedNow = [];
    coverUrl = rec && rec.cover_url ? rec.cover_url : null;
    resetDelete();
    fieldsEl.textContent = "";

    fields().forEach(function (f) { fieldsEl.appendChild(buildField(f, rec)); });
    $("pTitle").textContent = rec ? "Edit project" : "Add project";
    delBtn.hidden = !rec;
    saveBtn.disabled = false; saveBtn.textContent = "Save";
    setDlgMsg("", false);
    dlg.showModal();
    var first = fieldsEl.querySelector("input, textarea, select"); if (first) first.focus();
  }

  function collect() {
    var payload = {}, bad = null;
    Object.keys(controls).forEach(function (k) {
      var c = controls[k], f = c.def, v;
      c.wrap.classList.remove("is-bad");
      if (f.type === "check") v = c.el.checked;
      else if (f.type === "cover") v = c.el.get() || null;
      else if (f.type === "number") {
        var raw = c.el.value.trim();
        if (raw === "") v = 0;
        else if (!/^-?\d+$/.test(raw)) { bad = bad || { c: c, m: f.label + " must be a whole number." }; v = 0; }
        else v = parseInt(raw, 10);
      } else if (f.type === "tags") {
        var seen = {};
        v = c.el.value.split(",").map(function (s) { return s.trim(); }).filter(function (s) {
          var key = s.toLowerCase();
          if (!s || s.length > 40 || seen[key]) return false;
          seen[key] = 1; return true;
        }).slice(0, 15);
      } else if (f.type === "url") {
        v = c.el.value.trim();
        if (v && !isHttp(v)) bad = bad || { c: c, m: f.label + " must start with http:// or https://" };
        v = v || null;
      } else {
        v = c.el.value.trim();
        if (!f.required && v === "" && (f.name === "type_label" || f.name === "summary" || f.name === "description")) v = null;
      }
      if (f.required && !v) bad = bad || { c: c, m: f.label + " is required." };
      payload[k] = v;
    });
    if (!payload.slug && payload.title) payload.slug = slugify(payload.title);
    if (payload.slug && !slugRe.test(payload.slug)) {
      bad = bad || { c: controls.slug, m: "Slug can only have lowercase letters, numbers and single dashes." };
    }
    if (!payload.slug && !bad) bad = { c: controls.slug, m: "Slug is required." };
    if (bad) {
      bad.c.wrap.classList.add("is-bad");
      if (bad.c.el && bad.c.el.focus) bad.c.el.focus();
      setDlgMsg(bad.m, true);
      return null;
    }
    payload.updated_at = new Date().toISOString();
    return payload;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var payload = collect();
    if (!payload) return;
    var oldCover = editing ? editing.cover_url : null;
    saveBtn.disabled = true; saveBtn.textContent = "Saving...";
    setDlgMsg("", false);

    var q = editing
      ? db.from("projects").update(payload).eq("id", editing.id).select("*")
      : db.from("projects").insert(payload).select("*");

    q.then(function (res) {
      if (res.error) throw res.error;
      var row = (res.data || [])[0];
      if (!row) { setDlgMsg(PERM, true); return; }
      if (editing) rows = rows.map(function (r) { return r.id === row.id ? row : r; });
      else rows.push(row);
      rows.sort(bySort);

      /* delete files that are no longer used */
      var stale = uploadedNow.filter(function (u) { return u !== row.cover_url; });
      if (oldCover && oldCover !== row.cover_url) stale.push(oldCover);
      uploadedNow = [];
      removeFiles(stale);

      dlg.close();
      render();
      topMsg("Saved.", true);
    }).catch(function (err) {
      setDlgMsg(dbHint(err), true);
    }).then(function () { saveBtn.disabled = false; saveBtn.textContent = "Save"; });
  });

  /* ---------- delete (two clicks) ---------- */
  function resetDelete() {
    clearTimeout(armTimer);
    delBtn.classList.remove("is-armed");
    delBtn.textContent = "Delete";
    delBtn.disabled = false;
  }
  delBtn.addEventListener("click", function () {
    if (!editing) return;
    if (!delBtn.classList.contains("is-armed")) {
      delBtn.classList.add("is-armed");
      delBtn.textContent = "Click again to delete";
      armTimer = setTimeout(resetDelete, 4000);
      return;
    }
    var id = editing.id, cover = editing.cover_url;
    clearTimeout(armTimer);
    delBtn.disabled = true; delBtn.textContent = "Deleting...";
    db.from("projects").delete().eq("id", id).select("id")
      .then(function (res) {
        if (res.error) throw res.error;
        if (!(res.data || []).length) { setDlgMsg(PERM, true); resetDelete(); return; }
        rows = rows.filter(function (r) { return r.id !== id; });
        removeFiles([cover].concat(uploadedNow));
        uploadedNow = [];
        dlg.close(); render(); topMsg("Deleted.", true);
      })
      .catch(function () { setDlgMsg("Could not delete. Please try again.", true); resetDelete(); });
  });

  /* ---------- closing the dialog without saving ---------- */
  function discardUploads() {
    if (uploadedNow.length) { removeFiles(uploadedNow); uploadedNow = []; }
  }
  $("pClose").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", function () { discardUploads(); resetDelete(); editing = null; coverUrl = null; });

  load();
})();