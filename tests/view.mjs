// Capture the settled view and a centre crop for visual comparison against the
// reference. Screenshots go through the real composer path, unlike the pixel probes,
// so they are the trustworthy signal for what the user actually sees.
export default async function run(page) {
  await page.waitForTimeout(4600); // let the intro settle
  await (await page.$("#scene")).screenshot({ path: "tests/view-full.png" });

  const box = await page.evaluate(() => {
    const r = document.getElementById("scene").getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width * 0.2),
      y: Math.round(r.top + r.height * 0.12),
      width: Math.round(r.width * 0.6),
      height: Math.round(r.height * 0.76),
    };
  });
  await page.screenshot({ path: "tests/view-crop.png", clip: box });

  return { wrote: ["tests/view-full.png", "tests/view-crop.png"] };
}
