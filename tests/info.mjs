// Ask the page directly: is the black-hole mesh being drawn at all, what are its
// uniforms, and is the starfield still in the scene?
export default async function run(page) {
  await page.waitForTimeout(4600);
  return page.evaluate(() => {
    const slot = document.createElement("div");
    slot.id = "__infoSlot";
    slot.style.display = "none";
    document.body.appendChild(slot);

    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var out = {};
        try {
          var st = window.__atgState();
          for (var k in st) { out[k] = st[k]; }
          var sample = window.__atgSample();
          out.sample = sample;
          var canvas = document.getElementById('scene');
          out.canvas = [canvas.width, canvas.height];
          out.webglError = (canvas.getContext('webgl2') || canvas.getContext('webgl')).getError();
          out.labels = document.querySelectorAll('.node-label').length;
          out.fatal = !!document.querySelector('.fatal');
        } catch (e) { out.error = String(e && e.message ? e.message : e); }
        document.getElementById('__infoSlot').textContent = JSON.stringify(out);
      })();
    `;
    document.body.appendChild(script);
    const raw = document.getElementById("__infoSlot").textContent;
    document.getElementById("__infoSlot").remove();
    return raw ? JSON.parse(raw) : { ran: false };
  });
}
