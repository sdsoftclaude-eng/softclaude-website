/* Projects page: loads published projects from the database and runs the filter.
   If the request fails, the demo cards already in the HTML stay in place. */
(function () {
  "use strict";

  var grid = document.getElementById("projectGrid");
  var filters = document.querySelector(".filters");
  var empty = document.getElementById("projectsEmpty");
  if (!grid || !filters || !empty) return;

  var activeFilter = "all";

  function allCards() {
    return grid.querySelectorAll(".project-card");
  }

  function apply() {
    var shown = 0;
    allCards().forEach(function (card) {
      var cats = (card.getAttribute("data-cat") || "").split(" ");
      var match = activeFilter === "all" || cats.indexOf(activeFilter) !== -1;
      card.hidden = !match;
      if (match) shown++;
    });
    empty.hidden = shown !== 0;
  }

  filters.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".filter-btn") : null;
    if (!btn) return;
    activeFilter = btn.getAttribute("data-filter");
    filters.querySelectorAll(".filter-btn").forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    apply();
  });

  if (!window.SCApi || !window.SCUi) return;

  window.SCApi.get(
    "projects?select=title,slug,category,type_label,summary,technologies,tech_stack,cover_url,demo_url,source_url,is_demo,published_at," +
    "project_media(kind,storage_path,alt_text,sort_order)&is_published=eq.true" +
    "&order=sort_order.asc,published_at.desc.nullslast"
  )
    .then(function (rows) {
      var fragment = document.createDocumentFragment();
      (rows || []).forEach(function (p, i) { fragment.appendChild(window.SCUi.projectCard(p, i)); });
      grid.textContent = "";
      grid.appendChild(fragment);
      apply();
    })
    .catch(function () { /* keep the cards already on the page */ });
})();