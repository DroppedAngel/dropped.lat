// Compile the page's current shader source and print the GLSL error log.
export default async function run(page) {
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const slot = document.createElement("div");
    slot.id = "__glSlot";
    slot.style.display = "none";
    document.body.appendChild(slot);

    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var out = {};
        try {
          var html = Array.from(document.querySelectorAll('script'))
            .map(function (s) { return s.textContent; }).join('\\n');
          var tick = String.fromCharCode(96);
          var start = html.indexOf('const blackHoleFragment');
          var open = html.indexOf(tick, start);
          var close = html.indexOf(tick, open + 1);
          var src = html.slice(open + 1, close);
          var canvas = document.getElementById('scene');
          var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          var sh = gl.createShader(gl.FRAGMENT_SHADER);
          gl.shaderSource(sh, src);
          gl.compileShader(sh);
          out.ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
          out.log = gl.getShaderInfoLog(sh);
          out.length = src.length;
        } catch (e) { out.error = String(e && e.message ? e.message : e); }
        document.getElementById('__glSlot').textContent = JSON.stringify(out);
      })();
    `;
    document.body.appendChild(script);
    const raw = document.getElementById("__glSlot").textContent;
    document.getElementById("__glSlot").remove();
    return raw ? JSON.parse(raw) : { ran: false };
  });
}
