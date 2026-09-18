const pageUrl = "file:///c:/Users/redst/OneDrive/Documents/GitHub/dropped.lat/index.html";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export default async function run(page) {
  const results = [];
  const check = async (name, callback) => {
    try {
      const value = await callback();
      results.push({ name, passed: true, value: value ?? true });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
  };

  await check("renderer initializes black-hole scene", async () => {
    await page.waitForFunction(() => document.querySelectorAll(".node-label").length === 6);
    return await page.evaluate(() => ({
      canvasWidth: document.querySelector("#scene").width,
      canvasHeight: document.querySelector("#scene").height,
      serviceLabels: document.querySelectorAll(".node-label").length,
      telemetryRunning: /^T\+/.test(document.querySelector("#simTime").textContent),
      fatal: Boolean(document.querySelector(".fatal"))
    })).then((state) => {
      assert(state.canvasWidth > 0 && state.canvasHeight > 0, "black-hole canvas has no drawing surface");
      assert(state.serviceLabels === 6, `Expected 6 service labels, got ${state.serviceLabels}`);
      assert(state.telemetryRunning, "simulation telemetry did not start");
      assert(!state.fatal, "renderer entered fatal error state");
      return state;
    });
  });

  await check("menu interaction opens and closes", async () => {
    const menuButton = page.getByRole("button", { name: "Open explorer menu" });
    await menuButton.click();
    assert(await page.locator("#menuPanel").evaluate((node) => node.classList.contains("is-open")), "menu panel did not open");
    assert(await menuButton.getAttribute("aria-expanded") === "true", "menu aria-expanded was not updated");
    await page.locator("#panelBackdrop").click({ position: { x: 4, y: 4 } });
    assert(!(await page.locator("#menuPanel").evaluate((node) => node.classList.contains("is-open"))), "backdrop did not close menu");
    return "open -> backdrop close";
  });

  await check("search empty state and matching state", async () => {
    await page.getByRole("button", { name: "Search Servarr nodes" }).click();
    const input = page.locator("#searchInput");
    await input.fill("does-not-exist");
    assert(await page.locator(".search-empty").textContent() === "No service nodes found.", "empty search state is missing");
    await input.fill("rad");
    const matches = await page.locator(".search-result").allTextContents();
    assert(matches.length === 1 && matches[0].includes("RADARR"), "search did not return RADARR only");
    return matches;
  });

  // Two paths now exist, so both are covered. Availability is decided by a real network
  // probe, so the reachability state is forced explicitly rather than depending on what
  // happens to be running on the machine: otherwise this test asserts different things
  // on a developer box (services up) than in CI (nothing listening).
  const forceAvailability = async (serviceId, state) => {
    // patchright evaluates in an isolated world, where globals the page created are not
    // visible. Inject a script into the page's own world and read the result back through
    // the DOM, which is the only approach that has proven to work here.
    const applied = await page.evaluate(async ({ serviceId, state }) => {
      const slot = document.createElement("div");
      slot.id = "__availSlot";
      slot.style.display = "none";
      document.body.appendChild(slot);
      const script = document.createElement("script");
      script.textContent = `
        (function () {
          var out = { ok: false };
          try {
            out.type = typeof window.__setServiceAvailability;
            if (out.type === 'function') {
              out.ok = window.__setServiceAvailability(${JSON.stringify(serviceId)}, ${JSON.stringify(state)});
            }
          } catch (e) { out.error = String(e && e.message ? e.message : e); }
          var slot = document.getElementById('__availSlot');
          if (slot) { slot.textContent = JSON.stringify(out); }
        })();
      `;
      document.body.appendChild(script);
      const raw = document.getElementById("__availSlot").textContent;
      document.getElementById("__availSlot").remove();
      return raw ? JSON.parse(raw) : { ok: false, note: "slot empty" };
    }, { serviceId, state });

    // Fail loudly: silently no-oping here is what made the earlier run misleading.
    assert(applied.ok, `could not force availability for ${serviceId}: ${JSON.stringify(applied)}`);
    return applied;
  };

  await check("service interaction focuses node and opens endpoint when online", async () => {
    await page.evaluate(() => {
      window.__servarrOpened = null;
      window.open = (...args) => {
        window.__servarrOpened = args;
        return {};
      };
    });
    await forceAvailability("radarr", "online");
    await page.locator("#searchInput").fill("rad");
    await page.locator('[data-search-id="radarr"]').click();
    const state = await page.evaluate(() => ({
      linkState: document.querySelector("#linkState").textContent,
      notice: document.querySelector("#notice").textContent,
      opened: window.__servarrOpened
    }));
    assert(state.linkState === "RADARR FOCUS", "service click did not update focus state");
    assert(state.notice.includes("localhost:7878"), `service click did not resolve the configured endpoint: ${state.notice}`);
    return state;
  });

  // The complement: an unreachable service must focus but NOT open a dead URL, because
  // that would only land the user on a browser error page.
  await check("unreachable service focuses but does not open a dead endpoint", async () => {
    let openCalls = 0;
    await page.evaluate(() => {
      window.open = () => {
        window.__servarrDeadOpens = (window.__servarrDeadOpens || 0) + 1;
        return {};
      };
      window.__servarrDeadOpens = 0;
    });
    await forceAvailability("sonarr", "offline");
    // Open the search panel first: the previous test closes it, and with it shut the
    // canvas sits over the results and intercepts the click.
    await page.getByRole("button", { name: "Search Servarr nodes" }).click();
    await page.locator("#searchInput").fill("son");
    await page.locator('[data-search-id="sonarr"]').click();
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      linkState: document.querySelector("#linkState").textContent,
      notice: document.querySelector("#notice").textContent,
      deadOpens: window.__servarrDeadOpens || 0
    }));
    openCalls = state.deadOpens;
    assert(openCalls === 0, `offline service opened a dead endpoint ${openCalls} time(s)`);
    assert(state.linkState === "SONARR OFFLINE", `expected SONARR OFFLINE, got ${state.linkState}`);
    assert(/unreachable/i.test(state.notice), `notice should explain unreachability: ${state.notice}`);
    return state;
  });

  await check("settings form exposes all editable endpoints", async () => {
    await page.getByRole("button", { name: "Edit Servarr connection settings" }).click();
    const fieldCount = await page.locator("#connectionList input").count();
    assert(fieldCount === 12, `Expected 12 endpoint fields, got ${fieldCount}`);
    return fieldCount;
  });

  await check("roundRect compatibility fallback renders", async () => {
    await page.addInitScript(() => {
      if (window.CanvasRenderingContext2D?.prototype) {
        window.CanvasRenderingContext2D.prototype.roundRect = undefined;
      }
    });
    await page.goto(pageUrl, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll(".node-label").length === 6);
    const state = await page.evaluate(() => ({
      labels: document.querySelectorAll(".node-label").length,
      fatal: Boolean(document.querySelector(".fatal"))
    }));
    assert(state.labels === 6, "fallback page did not create all node labels");
    assert(!state.fatal, "fallback page entered fatal error state");
    return state;
  });

  const failed = results.filter((result) => !result.passed);
  return { passed: failed.length === 0, results };
}
