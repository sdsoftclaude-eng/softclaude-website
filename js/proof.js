/* Testimonials (Home and Clients pages) and client logos (Clients page).
   Only rows marked show_publicly are readable by visitors (database rule).
   While there is nothing to show, the "coming soon" cards stay on the page. */
(function () {
  "use strict";

  if (!window.SCApi || !window.SCUi) return;
  var ui = window.SCUi;

  /* Testimonials */
  var emptyTestimonials = document.querySelector(".testimonials__empty");

  if (emptyTestimonials) {
    window.SCApi.get(
      "testimonials?select=client_name,company,role,quote,sort_order&order=sort_order.asc&limit=6"
    )
      .then(function (rows) {
        if (!rows || !rows.length) return;

        var grid = ui.el("div", "grid grid--3");
        rows.forEach(function (t) {
          var card = ui.el("figure", "testimonial");
          card.style.margin = "0";
          card.appendChild(ui.el("blockquote", "testimonial__quote", "\u201C" + t.quote + "\u201D"));

          var author = ui.el("figcaption", "testimonial__author");
          author.appendChild(ui.el("span", "testimonial__name", t.client_name));
          var detail = [t.role, t.company].filter(Boolean).join(", ");
          if (detail) author.appendChild(ui.el("span", "testimonial__role", detail));
          card.appendChild(author);

          grid.appendChild(card);
        });
        emptyTestimonials.replaceWith(grid);
      })
      .catch(function () { /* keep the "coming soon" card */ });
  }

  /* Client logos */
  var logoBox = document.getElementById("clientLogos");

  if (logoBox) {
    window.SCApi.get("clients?select=name,logo_path,sort_order&order=sort_order.asc")
      .then(function (rows) {
        if (!rows || !rows.length) return;

        var grid = ui.el("div", "client-logos");
        rows.forEach(function (c) {
          var item = ui.el("div", "client-logo");
          var url = ui.mediaUrl("project-images", c.logo_path);
          if (url) {
            var img = document.createElement("img");
            img.src = url;
            img.alt = c.name;
            img.loading = "lazy";
            img.decoding = "async";
            item.appendChild(img);
          } else {
            item.textContent = c.name;
          }
          grid.appendChild(item);
        });
        logoBox.replaceWith(grid);
      })
      .catch(function () { /* keep the "will appear here" card */ });
  }
})();