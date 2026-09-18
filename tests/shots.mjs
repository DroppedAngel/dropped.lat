// Capture the black hole once the intro has settled, at two sizes, so the disk's
// internal structure and edge falloff can be judged.
export default async function run(page) {
  // Let the intro sweep finish before judging the settled framing.
  await page.waitForTimeout(4600);
  await (await page.$("#scene")).screenshot({ path: "tests/shot-settled.png" });

  // A centre crop region, captured by clipping the page rather than the canvas, so the
  // disk fills more of the frame and its structure is legible.
  const box = await page.evaluate(() => {
    const canvas = document.getElementById("scene");
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width * 0.22),
      y: Math.round(r.top + r.height * 0.16),
      width: Math.round(r.width * 0.56),
      height: Math.round(r.height * 0.68),
    };
  });
  await page.screenshot({ path: "tests/shot-crop.png", clip: box });

  return {
    wrote: ["tests/shot-settled.png", "tests/shot-crop.png"],
    box,
    state: await page.evaluate(() => ({
      isIntro: document.body.classList.contains("is-intro"),
      labels: document.querySelectorAll(".node-label").length,
    })),
  };
}
