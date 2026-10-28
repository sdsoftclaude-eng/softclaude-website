/* ==========================================================================
   Soft Claude — Shared behaviour (header, mobile menu, footer year, loader, social icons)
   Loaded on every page. No API keys or secrets belong in this file.
   ========================================================================== */

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.getElementById("menuToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  var yearEl = document.getElementById("year");

  /* Footer year, so it never goes stale */
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* Header border appears after the visitor scrolls */
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  if (toggle && mobileMenu) {
    var setMenu = function (open) {
      mobileMenu.classList.toggle("is-open", open);
      mobileMenu.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    };

    toggle.addEventListener("click", function () {
      setMenu(!mobileMenu.classList.contains("is-open"));
    });

    /* Close when a link is tapped */
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    /* Close with the Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });

    /* Close automatically if the screen becomes desktop-sized (for example, rotating a tablet) */
    var desktopQuery = window.matchMedia("(min-width: 961px)");
    var onDesktop = function (e) {
      if (e.matches && mobileMenu.classList.contains("is-open")) {
        setMenu(false);
      }
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", onDesktop);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onDesktop);
    }
  }
})();

/* ==========================================================================
   Loading screen
   Appears only if the page is still loading after 400ms.
   If loading takes more than 12 seconds, shows an error with Retry.
   ========================================================================== */
(function () {
  "use strict";

  var loader = document.getElementById("loader");
  if (!loader) return;

  /* Page already loaded, nothing to show */
  if (document.readyState === "complete") return;

  var retryBtn = document.getElementById("loaderRetry");
  var skipBtn = document.getElementById("loaderSkip");
  var showTimer, errorTimer;

  function show() {
    loader.classList.add("is-visible");
    loader.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(errorTimer);
    loader.classList.remove("is-visible", "has-error");
    loader.setAttribute("aria-hidden", "true");

    /* Do not unlock scrolling if the mobile menu is open */
    if (!document.querySelector(".mobile-menu.is-open")) {
      document.body.style.overflow = "";
    }
  }

  showTimer = setTimeout(show, 400);

  errorTimer = setTimeout(function () {
    show();
    loader.classList.add("has-error");
  }, 12000);

  window.addEventListener("load", hide);

  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      window.location.reload();
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", hide);
  }
})();

/* ==========================================================================
   Social icons: footer, header (desktop) and Contact page
   YouTube, Instagram, Facebook and Google links come from the site_settings table.
   Links with an empty value stay hidden. Only https:// links are accepted.
   The WhatsApp icon always shows and uses the number below.
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP_URL = "https://wa.me/923101442332";

  var LABELS = {
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    google: "Google Business Profile",
    whatsapp: "WhatsApp"
  };

  var PATHS = {
    youtube: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z",
    instagram: "M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z",
    facebook: "M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z",
    google: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
  };

  function makeIcon(key) {
    var a = document.createElement("a");
    a.className = "social__link";
    a.setAttribute("aria-label", LABELS[key]);
    if (key === "whatsapp") {
      a.href = WHATSAPP_URL;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      a.href = "#";
      a.setAttribute("data-social", key);
    }
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + PATHS[key] + '"/></svg>';
    return a;
  }

  function makeRow(extraClass) {
    var row = document.createElement("div");
    row.className = "social " + extraClass;
    row.setAttribute("aria-label", "Social media");
    ["youtube", "instagram", "facebook", "google", "whatsapp"].forEach(function (k) {
      row.appendChild(makeIcon(k));
    });
    return row;
  }

  /* Footer: replace the old Google icon with a clearer one, and add WhatsApp */
  var footerRow = document.querySelector(".footer-about .social");
  if (footerRow) {
    var oldGoogle = footerRow.querySelector('[data-social="google"] path');
    if (oldGoogle) oldGoogle.setAttribute("d", PATHS.google);
    if (!footerRow.querySelector('[aria-label="WhatsApp"]')) {
      footerRow.appendChild(makeIcon("whatsapp"));
    }
  }

  /* Contact page: icons under the page title */
  if (document.getElementById("contactForm")) {
    var heroBox = document.querySelector(".page-hero .container");
    if (heroBox) heroBox.appendChild(makeRow("page-social"));
  }

  /* Links stay hidden until we know which ones exist */
  var links = document.querySelectorAll(".social__link[data-social]");
  links.forEach(function (a) { a.style.display = "none"; });

  if (!window.SCApi || !links.length) return;

  window.SCApi.get("site_settings?select=value&key=eq.social_links")
    .then(function (rows) {
      var data = rows && rows[0] && rows[0].value ? rows[0].value : {};

      links.forEach(function (a) {
        var url = data[a.getAttribute("data-social")];
        var ok = false;

        if (typeof url === "string" && url) {
          try {
            ok = new URL(url).protocol === "https:";
          } catch (e) {
            ok = false;
          }
        }

        if (ok) {
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.style.display = "";
        }
      });
    })
    .catch(function (e) { console.warn("Social links failed:", e); });
})();