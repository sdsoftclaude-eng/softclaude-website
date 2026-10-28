/* Contact details from the database (site_settings, key "contact").
   Replaces the phone, WhatsApp number, email and address written in the HTML.
   If the request fails or a value looks invalid, the HTML stays as it is.
   Values are inserted as text or as checked link addresses, never as HTML. */
(function () {
  "use strict";

  if (!window.SCApi) return;

  /* What is written in the HTML today (used to find what to replace) */
  var OLD = {
    email: "sdsoftclaude@gmail.com",
    phone: "+92 310 1442332",
    whatsapp: "923101442332",
    address: "Lahore, Pakistan"
  };

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var phoneRe = /^\+?[0-9 ()-]{7,25}$/;
  var waRe = /^[0-9]{8,15}$/;

  function telHref(phone) {
    var digits = phone.replace(/[^0-9]/g, "");
    return "tel:" + (phone.trim().charAt(0) === "+" ? "+" : "") + digits;
  }

  function replaceText(root, from, to) {
    if (!root || !from || from === to) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === "SCRIPT" || p === "STYLE") continue;
      if (n.nodeValue.indexOf(from) !== -1) nodes.push(n);
    }
    nodes.forEach(function (node) { node.nodeValue = node.nodeValue.split(from).join(to); });
  }

  function apply(c) {
    var email = typeof c.email === "string" && emailRe.test(c.email.trim()) ? c.email.trim() : "";
    var phone = typeof c.phone === "string" && phoneRe.test(c.phone.trim()) ? c.phone.trim() : "";
    var wa = typeof c.whatsapp === "string" && waRe.test(c.whatsapp.trim()) ? c.whatsapp.trim() : "";
    var address = typeof c.address === "string" && c.address.trim() && c.address.length <= 200 ? c.address.trim() : "";

    /* Link addresses */
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (wa && href.indexOf("https://wa.me/" + OLD.whatsapp) === 0) {
        a.setAttribute("href", "https://wa.me/" + wa);
      } else if (email && href === "mailto:" + OLD.email) {
        a.setAttribute("href", "mailto:" + email);
      } else if (phone && href === "tel:+" + OLD.whatsapp) {
        a.setAttribute("href", telHref(phone));
      }
    });

    /* Visible phone and email text (footer, contact page, FAQ) */
    var areas = [document.querySelector("main"), document.querySelector(".site-footer")];
    areas.forEach(function (root) {
      if (phone) replaceText(root, OLD.phone, phone);
      if (email) replaceText(root, OLD.email, email);
    });

    /* Address: only the dedicated places, never sentences in the page text */
    if (address) {
      var targets = [];
      var footerLoc = document.querySelector(".footer-contact div:last-child p");
      var footerBottom = document.querySelector(".footer-bottom span:last-child");
      if (footerLoc) targets.push(footerLoc);
      if (footerBottom) targets.push(footerBottom);
      document.querySelectorAll(".contact-card__value").forEach(function (v) {
        if (v.textContent.trim() === OLD.address) targets.push(v);
      });
      targets.forEach(function (t) { t.textContent = address; });
    }
  }

  window.SCApi.get("site_settings?select=value&key=eq.contact")
    .then(function (rows) {
      var v = rows && rows[0] && rows[0].value;
      if (v && typeof v === "object") apply(v);
    })
    .catch(function () { /* keep the details already in the HTML */ });
})();