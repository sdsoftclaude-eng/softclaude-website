/* Services page: builds the categories and cards from the database.
   If the request fails, the static HTML already on the page stays as it is. */
(function () {
  "use strict";

  /* Spotlight effect: one listener, works for cards added later too */
  if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener("mousemove", function (e) {
      var card = e.target.closest ? e.target.closest(".svc-grid .service-card") : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }

  if (!window.SCApi || !window.SCUi) return;

  var ui = window.SCUi;
  var anchor = document.querySelector(".process");
  if (!anchor) return;

  function buildCard(service) {
    var card = ui.el("article", "service-card");
    var iconBox = ui.el("div", "service-card__icon");
    iconBox.setAttribute("aria-hidden", "true");
    iconBox.appendChild(ui.icon(service.icon));
    card.appendChild(iconBox);
    card.appendChild(ui.el("h3", null, service.title));
    card.appendChild(ui.el("p", null, service.summary));
    return card;
  }

  function buildCategory(cat, services) {
    var section = ui.el("section", "svc-cat");
    section.id = cat.slug;
    section.setAttribute("aria-labelledby", "cat-" + cat.slug);

    var container = ui.el("div", "container");
    var head = ui.el("div", "svc-cat__head");
    var title = ui.el("h2", "svc-cat__label", cat.name);
    title.id = "cat-" + cat.slug;
    var line = ui.el("span", "svc-cat__line");
    line.setAttribute("aria-hidden", "true");
    head.appendChild(title);
    head.appendChild(line);

    var grid = ui.el("div", "grid grid--3 svc-grid");
    services.forEach(function (s) { grid.appendChild(buildCard(s)); });

    container.appendChild(head);
    container.appendChild(grid);
    section.appendChild(container);
    return section;
  }

  Promise.all([
    window.SCApi.get("service_categories?select=id,slug,name,sort_order&order=sort_order.asc"),
    window.SCApi.get("services?select=id,category_id,title,summary,icon,sort_order&order=sort_order.asc")
  ])
    .then(function (result) {
      var cats = result[0];
      var services = result[1];
      if (!cats.length || !services.length) return; /* keep the static content */

      var built = [];
      cats.forEach(function (cat) {
        if (!ui.SLUG.test(cat.slug)) return;
        var list = services.filter(function (s) { return s.category_id === cat.id; });
        if (list.length) built.push(buildCategory(cat, list));
      });
      if (!built.length) return;

      document.querySelectorAll(".svc-cat").forEach(function (s) { s.remove(); });
      built.forEach(function (s) { anchor.parentNode.insertBefore(s, anchor); });

      /* Jump to the category if the link was services.html#software etc. */
      if (location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function () { /* keep the static content */ });
})();