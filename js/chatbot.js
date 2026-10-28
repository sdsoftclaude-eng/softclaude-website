/* Soft Claude guided inquiry chatbot. Add to every page: <script src="chatbot.js" defer></script> */
(function () {
  if (window.__scChat) return;
  window.__scChat = 1;

  var CONFIG = {
    // Copy the same function URL your contact form uses
    submitUrl: "https://ktwomdfbrharghrlwnyf.supabase.co/functions/v1/submit-inquiry",
    firstMessage: "Hi! Tell us about your project and we will get back to you.",
    bubbleText: "Tell us about your project",
    teal: "#14b8a6",
    midnight: "#0b1220"
  };

  // These lists must match the Edge Function exactly
  var SERVICES = ["New website", "E-commerce website", "ERP system", "Custom admin panel", "Changes to an existing website", "Bug fixing or redesign", "AI integration", "Security improvement", "Domain and hosting help", "Custom software", "Not sure yet"];
  var BUDGETS = ["Under $500", "$500 - $1,500", "$1,500 - $5,000", "$5,000+", "Not sure yet"];
  var TIMELINES = ["As soon as possible", "Within 1 month", "1 - 3 months", "Flexible"];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

  var STEPS = [
    { k: "service", l: "Service", q: "What do you need help with?", t: "opt", o: SERVICES },
    { k: "budget", l: "Budget", q: "Do you have a budget in mind?", t: "opt", o: BUDGETS, skip: 1 },
    { k: "timeline", l: "Timeline", q: "When would you like to start?", t: "opt", o: TIMELINES, skip: 1 },
    { k: "name", l: "Name", q: "What is your name?", t: "text", v: function (s) { return s.length >= 2 && s.length <= 80 ? true : "Please enter your full name."; } },
    { k: "email", l: "Email", q: "What is your email address?", t: "email", v: function (s) { return s.length <= 120 && EMAIL_RE.test(s) ? true : "Please enter a valid email address."; } },
    { k: "phone", l: "Phone", q: "Your phone or WhatsApp number? (optional)", t: "tel", skip: 1, v: function (s) { return PHONE_RE.test(s) ? true : "Please enter a valid phone number."; } },
    { k: "message", l: "Project", q: "Tell us a little about your project.", t: "text", v: function (s) { return s.length >= 10 && s.length <= 2000 ? true : "Please write between 10 and 2000 characters."; } }
  ];

  var data = {}, idx = 0, editing = null, busy = false, started = false, done = false;

  var css = "\
.scc-btn{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;border:0;background:" + CONFIG.teal + ";color:#fff;cursor:pointer;z-index:99998;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.35);animation:scc-pulse 2.4s ease-out 3}\
.scc-btn:focus-visible,.scc-o:focus-visible,.scc-x:focus-visible{outline:3px solid #fff;outline-offset:2px}\
@keyframes scc-pulse{0%{box-shadow:0 0 0 0 rgba(20,184,166,.6)}100%{box-shadow:0 0 0 22px rgba(20,184,166,0)}}\
.scc-tip{position:fixed;right:90px;bottom:34px;background:#fff;color:#0b1220;padding:9px 14px;border-radius:14px;font:14px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:99998;cursor:pointer}\
.scc-win{position:fixed;right:20px;bottom:92px;width:380px;height:560px;max-height:calc(100vh - 112px);background:" + CONFIG.midnight + ";color:#e6edf6;border-radius:16px;display:none;flex-direction:column;overflow:hidden;z-index:99999;box-shadow:0 20px 50px rgba(0,0,0,.5);font:15px/1.45 system-ui,sans-serif}\
.scc-win.on{display:flex;animation:scc-in .25s ease}\
@keyframes scc-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}\
.scc-h{display:flex;align-items:center;gap:8px;padding:14px 16px;background:#111a2e;font-weight:600}\
.scc-dot{width:9px;height:9px;border-radius:50%;background:#22c55e}\
.scc-x{margin-left:auto;background:none;border:0;color:#e6edf6;font-size:24px;cursor:pointer;line-height:1}\
.scc-pb{height:3px;background:#1d2840}.scc-pb i{display:block;height:100%;width:0;background:" + CONFIG.teal + ";transition:width .3s}\
.scc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none;-ms-overflow-style:none}.scc-log::-webkit-scrollbar{display:none;width:0;height:0}\
.scc-m{max-width:85%;padding:9px 13px;border-radius:14px;animation:scc-in .25s ease;word-wrap:break-word}\
.scc-m.bot{background:#1a2540;align-self:flex-start;border-bottom-left-radius:4px}\
.scc-m.me{background:" + CONFIG.teal + ";color:#04211e;align-self:flex-end;border-bottom-right-radius:4px}\
.scc-dots{display:flex;gap:4px;padding:12px 14px}.scc-dots i{width:7px;height:7px;border-radius:50%;background:#8fa0bd;animation:scc-b 1s infinite}.scc-dots i:nth-child(2){animation-delay:.15s}.scc-dots i:nth-child(3){animation-delay:.3s}\
@keyframes scc-b{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-5px);opacity:1}}\
.scc-ops{display:flex;flex-wrap:wrap;gap:7px}\
.scc-o{background:transparent;border:1px solid " + CONFIG.teal + ";color:" + CONFIG.teal + ";padding:7px 12px;border-radius:18px;cursor:pointer;font:inherit;font-size:14px}\
.scc-o:hover{background:" + CONFIG.teal + ";color:#04211e}\
.scc-f{padding:10px 12px;background:#111a2e;display:none;flex-direction:column;gap:6px}\
.scc-f.on{display:flex}\
.scc-r{display:flex;gap:8px}\
.scc-i{flex:1;min-width:0;background:#0b1220;border:1px solid #2a3858;color:#e6edf6;border-radius:10px;padding:10px 12px;font:inherit}\
.scc-i:focus{outline:2px solid " + CONFIG.teal + "}\
.scc-s{background:" + CONFIG.teal + ";color:#04211e;border:0;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer}\
.scc-sk{align-self:flex-start;background:none;border:0;color:#8fa0bd;text-decoration:underline;cursor:pointer;font:inherit;font-size:13px;display:none}\
.scc-er{color:#fca5a5;font-size:13px;min-height:0}\
.scc-card{background:#1a2540;border-radius:14px;padding:12px;align-self:stretch}\
.scc-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #2a3858;font-size:14px}\
.scc-row b{width:68px;flex:none;color:#8fa0bd;font-weight:500}.scc-row span{flex:1;word-break:break-word}\
.scc-row button{background:none;border:0;color:" + CONFIG.teal + ";cursor:pointer;font:inherit;font-size:13px}\
.scc-go{width:100%;margin-top:12px;background:" + CONFIG.teal + ";color:#04211e;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:15px;cursor:pointer}\
.scc-go:disabled{opacity:.6;cursor:wait}\
.scc-ok{text-align:center;padding:10px}.scc-ok svg{width:56px;height:56px;stroke:" + CONFIG.teal + ";stroke-width:3;fill:none;stroke-dasharray:60;stroke-dashoffset:60;animation:scc-d .6s .1s forwards}\
@keyframes scc-d{to{stroke-dashoffset:0}}\
.scc-ref{display:inline-block;margin-top:6px;padding:6px 12px;background:#0b1220;border-radius:8px;font-family:monospace;font-size:16px;color:" + CONFIG.teal + "}\
@media(max-width:600px){.scc-win{inset:0;width:100%;height:100%;max-height:none;border-radius:0;animation:scc-up .28s ease}.scc-tip{right:84px;bottom:30px}}\
@keyframes scc-up{from{transform:translateY(100%)}to{transform:none}}\
@media(prefers-reduced-motion:reduce){.scc-btn,.scc-m,.scc-win.on{animation:none}}";

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var st = el("style"); st.textContent = css; document.head.appendChild(st);

  // Launcher
  var btn = el("button", "scc-btn");
  btn.type = "button"; btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var tip = el("div", "scc-tip", CONFIG.bubbleText);

  // Window
  var win = el("div", "scc-win");
  win.setAttribute("role", "dialog"); win.setAttribute("aria-label", "Soft Claude Assistant");
  var head = el("div", "scc-h"); head.appendChild(el("span", "scc-dot")); head.appendChild(el("span", null, "Soft Claude Assistant"));
  var closeB = el("button", "scc-x", "\u00d7"); closeB.type = "button"; closeB.setAttribute("aria-label", "Close chat"); head.appendChild(closeB);
  var pb = el("div", "scc-pb"), pbi = el("i"); pb.appendChild(pbi);
  var log = el("div", "scc-log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
  var foot = el("div", "scc-f");
  var skipB = el("button", "scc-sk", "Skip"); skipB.type = "button";
  var errB = el("div", "scc-er"); errB.setAttribute("role", "alert");
  var row = el("div", "scc-r"), input = el("input", "scc-i"), send = el("button", "scc-s", "Send");
  send.type = "button"; input.setAttribute("aria-label", "Your answer"); row.appendChild(input); row.appendChild(send);
  foot.appendChild(skipB); foot.appendChild(errB); foot.appendChild(row);
  win.appendChild(head); win.appendChild(pb); win.appendChild(log); win.appendChild(foot);
  document.body.appendChild(btn); document.body.appendChild(tip); document.body.appendChild(win);
  setTimeout(function () { if (!win.classList.contains("on")) tip.style.display = "block"; }, 0);

  function scroll() { log.scrollTop = log.scrollHeight; }
  function progress() { pbi.style.width = Math.round((done ? STEPS.length : idx) / STEPS.length * 100) + "%"; }
  function msg(role, text) { var m = el("div", "scc-m " + role, text); log.appendChild(m); scroll(); return m; }

  function botSay(text, cb) {
    var d = el("div", "scc-m bot scc-dots"); d.innerHTML = "<i></i><i></i><i></i>"; d.setAttribute("aria-label", "Typing"); log.appendChild(d); scroll();
    setTimeout(function () {
      d.remove();
      var m = msg("bot", ""), w = text.split(" "), i = 0;
      var t = setInterval(function () { m.textContent = w.slice(0, ++i).join(" "); scroll(); if (i >= w.length) { clearInterval(t); if (cb) cb(); } }, 32);
    }, 450);
  }

  function setInput(step) {
    errB.textContent = "";
    skipB.style.display = step && step.skip ? "block" : "none";
    if (!step || step.t === "opt") { foot.classList.toggle("on", !!step && !!step.skip); row.style.display = "none"; return; }
    foot.classList.add("on"); row.style.display = "flex";
    input.type = step.t === "text" ? "text" : step.t; input.value = ""; input.maxLength = step.k === "message" ? 2000 : 120;
    input.setAttribute("inputmode", step.t === "tel" ? "tel" : step.t === "email" ? "email" : "text");
    input.setAttribute("autocomplete", "off"); input.setAttribute("autocorrect", "off"); input.setAttribute("data-lpignore", "true"); input.setAttribute("data-form-type", "other");
    setTimeout(function () { input.focus(); }, 50);
  }

  function ask(i) {
    idx = i; progress(); var step = STEPS[i]; foot.classList.remove("on");
    botSay(step.q, function () {
      if (step.t === "opt") {
        var box = el("div", "scc-ops");
        step.o.forEach(function (o) { var b = el("button", "scc-o", o); b.type = "button"; b.onclick = function () { box.remove(); answer(o); }; box.appendChild(b); });
        log.appendChild(box); scroll();
      }
      setInput(step);
    });
  }

  function answer(val) {
    var step = STEPS[idx]; data[step.k] = val; msg("me", val || "Skipped");
    foot.classList.remove("on");
    if (editing !== null) { editing = null; summary(); } else if (idx + 1 < STEPS.length) ask(idx + 1); else summary();
  }

  function submitText() {
    var step = STEPS[idx]; if (!step || step.t === "opt") return;
    var v = input.value.trim(), r = step.v(v);
    if (r !== true) { errB.textContent = r; input.focus(); return; }
    answer(v);
  }

  function summary() {
    idx = STEPS.length; progress();
    botSay("Please check your details.", function () {
      var card = el("div", "scc-card");
      STEPS.forEach(function (s, i) {
        var r = el("div", "scc-row"); r.appendChild(el("b", null, s.l)); r.appendChild(el("span", null, data[s.k] || "-"));
        var e = el("button", null, "Edit"); e.type = "button"; e.setAttribute("aria-label", "Edit " + s.l);
        e.onclick = function () { card.remove(); editing = i; ask(i); }; r.appendChild(e); card.appendChild(r);
      });
      var go = el("button", "scc-go", "Submit Inquiry"); go.type = "button";
      go.onclick = function () { submit(go, card); }; card.appendChild(go);
      log.appendChild(card); scroll(); go.focus();
    });
  }

  function submit(go, card) {
    if (busy) return; busy = true; go.disabled = true; go.textContent = "Sending...";
    var payload = { source: "chatbot", name: data.name, email: (data.email || "").toLowerCase(), phone: data.phone || "", service: data.service || "", budget: data.budget || "", timeline: data.timeline || "", message: data.message };
    (window.SCVisitor ? SCVisitor.authHeaders() : Promise.resolve({})).then(function (h) { return fetch(CONFIG.submitUrl, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, h), body: JSON.stringify(payload) }); })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        busy = false;
        if (x.s === 200 && x.j.ok) { done = true; progress(); card.remove(); success(x.j.reference); return; }
        go.disabled = false; go.textContent = "Submit Inquiry";
        if (x.s === 429) return botSay("Too many requests. Please try again a little later.");
        if (x.j.errors) {
          var key = Object.keys(x.j.errors)[0], map = { name: "name", email: "email", phone: "phone", service: "service", budget: "budget", timeline: "timeline", message: "message" };
          var i = STEPS.map(function (s) { return s.k; }).indexOf(map[key]);
          if (i > -1) { card.remove(); editing = i; botSay(x.j.errors[key], function () { ask(i); }); return; }
        }
        botSay("Something went wrong. Please try again.");
      })
      .catch(function () { busy = false; go.disabled = false; go.textContent = "Submit Inquiry"; botSay("Connection problem. Please check your internet and try again."); });
  }

  function success(ref) {
    var box = el("div", "scc-card scc-ok");
    box.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M14 27l8 8 16-17"/></svg>';
    box.appendChild(el("div", null, "Thank you! Your inquiry has been received."));
    if (ref) { box.appendChild(el("div", null, "Your reference number:")); box.appendChild(el("div", "scc-ref", ref)); }
    log.appendChild(box); scroll(); foot.classList.remove("on");
  }

  function open() {
    win.classList.add("on"); tip.style.display = "none"; btn.style.display = "none"; btn.setAttribute("aria-expanded", "true");
    if (!started) { started = true; botSay(CONFIG.firstMessage, function () { ask(0); }); }
    else if (foot.classList.contains("on")) input.focus();
  }
  function close() { win.classList.remove("on"); btn.style.display = "flex"; btn.focus(); }

  function gated() { if (!window.SCVisitor) { alert("Chat abhi load nahi hua. Page refresh karein aur internet check karein."); return; } SCVisitor.requireLogin(open); }
  btn.onclick = gated; tip.onclick = gated; closeB.onclick = close;
  send.onclick = submitText;
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submitText(); } });
  skipB.onclick = function () { answer(""); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && win.classList.contains("on")) close(); });
})();
