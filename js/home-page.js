/* Home page: featured services and featured projects from the database.
   If a request fails, the static cards already on the page stay in place.
   If nothing is marked as featured, that section is hidden. */
(function () {
  "use strict";

  if (!window.SCApi || !window.SCUi) return;
  var ui = window.SCUi;

  function serviceCard(s) {
    var card = ui.el("article", "service-card");
    var iconBox = ui.el("div", "service-card__icon");
    iconBox.setAttribute("aria-hidden", "true");
    iconBox.appendChild(ui.icon(s.icon));
    card.appendChild(iconBox);
    card.appendChild(ui.el("h3", null, s.title));
    card.appendChild(ui.el("p", null, s.summary));

    var slug = s.service_categories && ui.SLUG.test(s.service_categories.slug || "")
      ? s.service_categories.slug : "";
    var link = ui.el("a", "service-card__link");
    link.href = "services.html" + (slug ? "#" + slug : "");
    link.appendChild(document.createTextNode("Learn more "));
    var arrow = ui.el("span", null, "\u2192");
    arrow.setAttribute("aria-hidden", "true");
    link.appendChild(arrow);
    card.appendChild(link);
    return card;
  }

  function replaceCards(grid, section, nodes) {
    if (!nodes.length) {
      if (section) section.hidden = true;
      return;
    }
    var fragment = document.createDocumentFragment();
    nodes.forEach(function (n) { fragment.appendChild(n); });
    grid.textContent = "";
    grid.appendChild(fragment);
  }

  /* Featured services (max 3) */
  var servicesSection = document.querySelector(".services-featured");
  var servicesGrid = servicesSection ? servicesSection.querySelector(".grid") : null;

  if (servicesGrid) {
    window.SCApi.get(
      "services?select=title,summary,icon,sort_order,service_categories(slug,sort_order)&is_featured=eq.true"
    )
      .then(function (rows) {
        rows = (rows || []).slice().sort(function (a, b) {
          var ca = a.service_categories ? a.service_categories.sort_order : 0;
          var cb = b.service_categories ? b.service_categories.sort_order : 0;
          return ca - cb || a.sort_order - b.sort_order;
        }).slice(0, 3);
        replaceCards(servicesGrid, servicesSection, rows.map(serviceCard));
      })
      .catch(function () { /* keep the cards already on the page */ });
  }

  /* Featured projects (max 3) */
  var projectsSection = document.querySelector(".projects-featured");
  var projectsGrid = projectsSection ? projectsSection.querySelector(".grid") : null;

  if (projectsGrid) {
    window.SCApi.get(
      "projects?select=title,category,type_label,summary,technologies,tech_stack,cover_url,demo_url,source_url,is_demo,published_at," +
      "project_media(kind,storage_path,alt_text,sort_order)" +
      "&is_featured=eq.true&is_published=eq.true&order=sort_order.asc,published_at.desc.nullslast&limit=3"
    )
      .then(function (rows) {
        replaceCards(projectsGrid, projectsSection, (rows || []).map(function (p, i) {
          return ui.projectCard(p, i);
        }));
      })
      .catch(function () { /* keep the cards already on the page */ });
  }
})();
