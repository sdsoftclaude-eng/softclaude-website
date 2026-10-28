/* Shared helpers for the public pages: safe DOM building, icons, project cards.
   Everything that comes from the database is inserted as text, never as HTML. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* Our own trusted icon shapes. The database only supplies the icon NAME. */
  var ICONS = {
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
    "shopping-cart": '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6"/>',
    "layout": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    "layers": '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5"/>',
    "sliders": '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    "code": '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    "terminal": '<path d="m4 7 5 5-5 5M12 18h8"/>',
    "message-circle": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    "zap": '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    "database": '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    "shield": '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    "server": '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    "cloud": '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18H7z"/>'
  };

  var ART = ["art--a", "art--b", "art--c"];
  var CATEGORIES = ["websites", "software", "ai", "other"];
  var CATEGORY_LABELS = { websites: "Website", software: "Software", ai: "AI and Automation", other: "Project" };
  var SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9\/_.-]{2,299}$/;
  var SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name) {
    var markup = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : ICONS.code;
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.innerHTML = markup;
    return svg;
  }

  /* Public URL of a stored file, only if the stored path looks safe */
  function mediaUrl(bucket, path) {
    var cfg = window.SC_CONFIG;
    if (!cfg || typeof path !== "string") return null;
    if (!SAFE_PATH.test(path) || path.indexOf("..") !== -1) return null;
    return cfg.SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" +
      path.split("/").map(encodeURIComponent).join("/");
  }

  function coverImage(media) {
    var images = (media || [])
      .filter(function (m) { return m.kind === "image" && mediaUrl("site-images", m.storage_path); })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    return images.length ? images[0] : null;
  }

  /* Cover uploaded from the admin panel (bucket project-images) */
  function ownCoverUrl(u) {
    var cfg = window.SC_CONFIG;
    if (!cfg || typeof u !== "string") return null;
    var prefix = cfg.SUPABASE_URL + "/storage/v1/object/public/project-images/";
    if (u.indexOf(prefix) !== 0 || /[\s"'<>]/.test(u)) return null;
    return u;
  }

  /* Only plain http(s) links are allowed */
  function safeLink(u) {
    return typeof u === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : null;
  }

  function linkButton(href, label) {
    var a = el("a", "project-card__link");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.appendChild(document.createTextNode(label + " "));
    var arrow = el("span", null, "\u2197");
    arrow.setAttribute("aria-hidden", "true");
    a.appendChild(arrow);
    return a;
  }

  function projectCard(p, index) {
    var card = el("article", "project-card");
    var cats = [CATEGORIES.indexOf(p.category) !== -1 ? p.category : "other"];
    if (p.is_demo) cats.push("demo");
    card.setAttribute("data-cat", cats.join(" "));

    var media = el("div", "project-card__media");
    var cover = coverImage(p.project_media);
    var coverSrc = ownCoverUrl(p.cover_url) || (cover ? mediaUrl("site-images", cover.storage_path) : null);
    if (coverSrc) {
      var img = document.createElement("img");
      img.src = coverSrc;
      img.alt = (cover && cover.alt_text) || p.title;
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
    } else {
      var art = el("div", "project-card__art " + ART[index % ART.length]);
      art.setAttribute("aria-hidden", "true");
      media.appendChild(art);
    }
    if (p.is_demo) media.appendChild(el("span", "badge-demo", "DEMO"));

    var body = el("div", "project-card__body");
    body.appendChild(el("span", "project-card__cat", p.type_label || CATEGORY_LABELS[p.category] || "Project"));
    body.appendChild(el("h3", null, p.title));
    body.appendChild(el("p", null, p.summary));

    var tags = el("div", "tags");
    var techs = (p.tech_stack && p.tech_stack.length) ? p.tech_stack : (p.technologies || []);
    techs.forEach(function (t) { tags.appendChild(el("span", null, t)); });
    body.appendChild(tags);

    var demo = safeLink(p.demo_url), source = safeLink(p.source_url);
    if (demo || source) {
      var links = el("div", "project-card__links");
      if (demo) links.appendChild(linkButton(demo, "View demo"));
      if (source) links.appendChild(linkButton(source, "Source code"));
      body.appendChild(links);
    }

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  window.SCUi = Object.freeze({
    el: el,
    icon: icon,
    mediaUrl: mediaUrl,
    projectCard: projectCard,
    SLUG: SLUG
  });
})();