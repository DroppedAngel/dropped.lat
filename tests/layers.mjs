// Determine whether the black frame comes from the WebGL canvas or from the CSS
// overlays stacked above it (.atmosphere, .vignette, .grain).
export default async function run(page) {
  await page.waitForTimeout(4600);

  await (await page.$("#scene")).screenshot({ path: "tests/layer-canvas.png" });

  await page.evaluate(() => {
    for (const cls of ["atmosphere", "vignette", "grain"]) {
      document.querySelectorAll("." + cls).forEach((node) => {
        node.dataset.prevDisplay = node.style.display;
        node.style.display = "none";
      });
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "tests/layer-no-overlays.png" });

  const info = await page.evaluate(() => {
    const canvas = document.getElementById("scene");
    const cs = getComputedStyle(canvas);
    return {
      canvasOpacity: cs.opacity,
      canvasFilter: cs.filter,
      canvasVisibility: cs.visibility,
      canvasZ: cs.zIndex,
      atmosphereBackground: getComputedStyle(document.querySelector(".atmosphere")).display,
    };
  });

  return { wrote: ["tests/layer-canvas.png", "tests/layer-no-overlays.png"], info };
}
