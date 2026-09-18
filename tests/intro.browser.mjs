// Verify the intro approach: it should start wide, settle to the framed view, expose a
// skip control while running, and disappear once settled.
//
// uApproach lives on the shader uniform, which patchright's isolated world cannot read,
// so this checks the observable effects the driver produces instead.
export default async function run(page) {
  const atLoad = await page.evaluate(() => ({
    isIntro: document.body.classList.contains("is-intro"),
    skipExists: !!document.getElementById("introSkip"),
    skipOpacity: getComputedStyle(document.getElementById("introSkip")).opacity,
  }));

  // Let the sweep run to completion (INTRO_DURATION is 3.4s).
  await page.waitForTimeout(4600);

  return {
    atLoad,
    afterSettle: await page.evaluate(() => ({
      isIntro: document.body.classList.contains("is-intro"),
      skipOpacity: getComputedStyle(document.getElementById("introSkip")).opacity,
      skipPointerEvents: getComputedStyle(document.getElementById("introSkip")).pointerEvents,
      labels: document.querySelectorAll(".node-label").length,
      fatal: !!document.querySelector(".fatal"),
    })),
  };
}
