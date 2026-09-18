// Measure the disk's palette and the shadow's geometry from the page's offscreen probe.
//
// The on-screen canvas cannot be sampled (no preserved drawing buffer), so the page
// renders a throwaway frame into a target that can be read back. patchright's isolated
// world cannot see the page's globals, so the call is injected into the page's own world
// and the result passed back through the DOM.
export default async function run(page, ui) {
  await page.waitForTimeout(4600); // let the intro settle
  return page.evaluate(async () => {

    const slot = document.createElement("div");
    slot.id = "__probeSlot";
    slot.style.display = "none";
    document.body.appendChild(slot);

    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var out = { ran: true };
        try {
          var p = window.__blackHoleProbe(2);
          for (var k in p) { out[k] = p[k]; }
        } catch (e) { out.error = String(e && e.message ? e.message : e); }
        var slot = document.getElementById('__probeSlot');
        if (slot) { slot.textContent = JSON.stringify(out); }
      })();
    `;
    document.body.appendChild(script);

    const raw = document.getElementById("__probeSlot").textContent;
    document.getElementById("__probeSlot").remove();
    return raw ? JSON.parse(raw) : { ran: false, note: "slot empty" };
  });
}
