/* Soft Claude visitor sign-in with Google.
   Public pages stay open. Protected features (chatbot, contact form) call
   SCVisitor.requireLogin(callback). No secrets belong in this file. */
(function () {
  "use strict";

  var cfg = window.SC_CONFIG;
  if (!cfg || !window.supabase) {
    console.error("Soft Claude: Supabase library did not load. Sign-in and chat are locked.");
    window.SCVisitor = null;
    return;
  }

  var client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sc-visitor-auth"
    }
  });

  /* Save or refresh the visitor's row in site_visitors (RLS: own row only) */
  function saveVisitor(user) {
    if (!user) return;
    client.auth.getSession().then(function (sres) {
      var session = sres.data && sres.data.session;
      if (!session || session.user.id !== user.id) {
        console.error("Visitor save skipped: no active session for this user.");
        return;
      }
      var meta = session.user.user_metadata || {};
      return client.from("site_visitors").upsert({
        user_id: session.user.id,
        email: session.user.email || null,
        full_name: meta.full_name || meta.name || null,
        avatar_url: meta.avatar_url || meta.picture || null,
        last_seen_at: new Date().toISOString()
      }, { onConflict: "user_id" }).then(function (res) {
        if (res.error) {
          console.error("Visitor save failed:", res.status, res.error.code, res.error.message);
        } else {
          console.log("Visitor saved.");
        }
      });
    }).catch(function (err) {
      console.error("Visitor save crashed:", err);
    });
  }

  /* Supabase calls must not run inside onAuthStateChange (it can deadlock),
     so the save is moved to a timer that runs after the callback returns. */
  client.auth.onAuthStateChange(function (event, session) {
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
      setTimeout(function () { saveVisitor(session.user); }, 0);
    }
    if (session) closeModal();
  });

  /* ---------- Login box ---------- */
  var modal = null;

  function buildModal() {
    var style = document.createElement("style");
    style.textContent =
      ".scv-bg{position:fixed;inset:0;background:rgba(5,8,15,.7);display:none;align-items:center;justify-content:center;z-index:100000;padding:20px}" +
      ".scv-bg.on{display:flex}" +
      ".scv-box{background:#0b1220;color:#e6edf6;border:1px solid #1d2840;border-radius:16px;max-width:380px;width:100%;padding:28px 24px;text-align:center;font:15px/1.5 system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.5)}" +
      ".scv-box h2{margin:0 0 8px;font-size:20px}" +
      ".scv-box p{margin:0 0 20px;color:#9fb0cc}" +
      ".scv-g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#fff;color:#1f1f1f;border:0;border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer}" +
      ".scv-x{margin-top:14px;background:none;border:0;color:#9fb0cc;cursor:pointer;font:inherit}" +
      ".scv-err{color:#f87171;font-size:13px;margin-top:12px;min-height:1em}";
    document.head.appendChild(style);

    var bg = document.createElement("div");
    bg.className = "scv-bg";
    bg.setAttribute("role", "dialog");
    bg.setAttribute("aria-modal", "true");
    bg.setAttribute("aria-labelledby", "scvTitle");
    bg.innerHTML =
      '<div class="scv-box">' +
        '<h2 id="scvTitle">Sign in to continue</h2>' +
        '<p>Please sign in with your Gmail account. After that you can send us an inquiry and use the chat.</p>' +
        '<button type="button" class="scv-g" id="scvGoogle">' +
          '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-2.9-.8-4.8s.3-3.4.8-4.8l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-3.8-13.6-9.3l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>' +
          'Continue with Google' +
        '</button>' +
        '<div class="scv-err" id="scvErr" role="alert"></div>' +
        '<button type="button" class="scv-x" id="scvClose">Not now</button>' +
      '</div>';
    document.body.appendChild(bg);

    bg.querySelector("#scvClose").addEventListener("click", closeModal);
    bg.addEventListener("click", function (e) { if (e.target === bg) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

    bg.querySelector("#scvGoogle").addEventListener("click", function () {
      bg.querySelector("#scvErr").textContent = "";
      client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href }
      }).then(function (res) {
        if (res.error) bg.querySelector("#scvErr").textContent = "Google sign-in failed: " + res.error.message;
      });
    });

    return bg;
  }

  var pending = null;

  function openModal() {
    if (!modal) modal = buildModal();
    modal.classList.add("on");
  }

  function closeModal() {
    if (modal) modal.classList.remove("on");
    pending = null;
  }

  /* Runs callback at once if signed in; otherwise shows the Google sign-in box */
  function requireLogin(callback) {
    client.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session) {
        if (typeof callback === "function") callback(session.user);
      } else {
        pending = callback;
        openModal();
      }
    }).catch(function () { openModal(); });
  }

  /* Headers for calls to Supabase functions: signed-in user's token, or nothing */
  function authHeaders() {
    return client.auth.getSession().then(function (res) {
      var token = res.data && res.data.session && res.data.session.access_token;
      return token ? { Authorization: "Bearer " + token } : {};
    }).catch(function () { return {}; });
  }

  function signOut() {
    return client.auth.signOut().then(function () { window.location.reload(); });
  }

  /* Footer "Sign up with Google" buttons (data-action="google-signup") */
  function wireFooterButtons() {
    document.querySelectorAll('[data-action="google-signup"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        requireLogin(function (user) {
          var label = btn.querySelector(".btn-google__label");
          btn.disabled = true;
          btn.textContent = "Signed in as " + (user.email || "your Google account");
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireFooterButtons);
  } else {
    wireFooterButtons();
  }

  window.SCVisitor = Object.freeze({
    client: client,
    requireLogin: requireLogin,
    authHeaders: authHeaders,
    signOut: signOut
  });
})();
