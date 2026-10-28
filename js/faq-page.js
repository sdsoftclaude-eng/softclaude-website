/* FAQ page: loads the questions from the database, and runs the accordion,
   category filter and search. If the request fails, the questions already
   written in the HTML stay in place. */
(function () {
  "use strict";

  var list = document.getElementById("faqList");
  var cats = document.querySelectorAll(".faq-cat");
  var search = document.getElementById("faqSearch");
  var empty = document.getElementById("faqEmpty");
  if (!list || !search || !empty) return;

  var activeCat = "all";
  var CATEGORIES = ["general", "services", "pricing", "support"];

  function allItems() {
    return list.querySelectorAll(".faq-item");
  }

  function setOpen(item, open) {
    var btn = item.querySelector(".faq-q");
    var panel = item.querySelector(".faq-a");
    btn.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    item.classList.toggle("is-open", open);
  }

  /* Accordion: one listener for all questions, only one answer open at a time */
  list.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".faq-q") : null;
    if (!btn) return;
    var item = btn.closest(".faq-item");
    var wasOpen = item.classList.contains("is-open");
    allItems().forEach(function (other) { setOpen(other, false); });
    if (!wasOpen) setOpen(item, true);
  });

  /* Category and search filtering */
  function apply() {
    var query = search.value.trim().toLowerCase();
    var shown = 0;
    allItems().forEach(function (item) {
      var okCat = activeCat === "all" || item.getAttribute("data-cat") === activeCat;
      var okText = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
      var visible = okCat && okText;
      item.hidden = !visible;
      if (visible) shown++;
    });
    empty.hidden = shown !== 0;
  }

  cats.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeCat = btn.getAttribute("data-cat");
      cats.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      apply();
    });
  });

  search.addEventListener("input", apply);

  /* Build one question from a database row (text only, never innerHTML) */
  function build(row, n) {
    var item = document.createElement("div");
    item.className = "faq-item";
    item.setAttribute("data-cat", CATEGORIES.indexOf(row.category) !== -1 ? row.category : "general");

    var q = document.createElement("button");
    q.type = "button";
    q.className = "faq-q";
    q.id = "q" + n;
    q.setAttribute("aria-expanded", "false");
    q.setAttribute("aria-controls", "a" + n);
    q.textContent = row.question;

    var a = document.createElement("div");
    a.className = "faq-a";
    a.id = "a" + n;
    a.hidden = true;
    var p = document.createElement("p");
    p.textContent = row.answer;
    a.appendChild(p);

    item.appendChild(q);
    item.appendChild(a);
    return item;
  }

  if (!window.SCApi) return;

  window.SCApi.get("faqs?select=question,answer,category,sort_order&order=sort_order.asc")
    .then(function (rows) {
      if (!rows || !rows.length) return; /* keep the questions already on the page */
      var fragment = document.createDocumentFragment();
      rows.forEach(function (row, i) { fragment.appendChild(build(row, i + 1)); });
      list.textContent = "";
      list.appendChild(fragment);
      apply();
    })
    .catch(function () { /* keep the questions already on the page */ });
})();
