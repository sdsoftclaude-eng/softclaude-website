/* Small read-only helper for the public website.
   Uses the publishable key, so it can only read what the RLS policies allow. */
(function () {
  "use strict";

  var cfg = window.SC_CONFIG;
  if (!cfg) return;

  var TIMEOUT_MS = 8000;

  function get(path) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    return fetch(cfg.SUPABASE_URL + "/rest/v1/" + path, {
      headers: { apikey: cfg.SUPABASE_KEY, Accept: "application/json" },
      signal: controller.signal
    })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  window.SCApi = Object.freeze({ get: get });
})();