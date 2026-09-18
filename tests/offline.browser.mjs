// Verify the unavailable-service treatment: grey resting state, red on hover, and
// that activating a known-dead endpoint does not attempt to open it.
export default async function run(page) {
  await page.waitForTimeout(2600); // let the reachability probes settle

  const resting = await page.evaluate(() => {
    const label = document.querySelector(".node-label");
    return {
      offlineCount: document.querySelectorAll(".node-label.is-offline").length,
      labelText: label.textContent,
      color: getComputedStyle(label).color,
      reason: document.querySelector(".label-reason")
        ? getComputedStyle(document.querySelector(".label-reason")).display
        : "missing",
    };
  });

  // The label chips sit in a pointer-events:none overlay and their hover state is set by
  // the canvas raycast, not by CSS :hover, so Playwright's .hover() can never satisfy it.
  // The class itself is what the styling hangs off, so toggle it directly and read the
  // computed style: that tests the CSS contract without depending on the 3D pick path.
  const hovered = await page.evaluate(() => {
    const label = document.querySelector(".node-label.is-offline");
    if (!label) return { hovered: false, error: "no offline label" };
    label.classList.add("is-hovered");
    // .node-label carries a 0.2s colour transition, so a value read immediately after
    // adding the class is mid-animation. Wait out the transition before reading.
    return new Promise((resolve) => {
      setTimeout(() => {
        const bullet = label.querySelector(".label-bullet");
        const reason = label.querySelector(".label-reason");
        resolve({
          hovered: true,
          classes: label.className,
          borderColor: getComputedStyle(label).borderTopColor,
          color: getComputedStyle(label).color,
          reasonDisplay: reason ? getComputedStyle(reason).display : "missing",
          bulletBg: bullet ? getComputedStyle(bullet).backgroundColor : null,
        });
      }, 450);
    });
  });

  // Clicking a search result for a dead endpoint must NOT call window.open.
  const activation = await page.evaluate(async () => {
    window.__openedByTest = 0;
    const original = window.open;
    window.open = () => {
      window.__openedByTest += 1;
      return {};
    };
    document.getElementById("searchButton").click();
    const input = document.getElementById("searchInput");
    input.value = "rad";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const result = document.querySelector('[data-search-id="radarr"]');
    if (!result) {
      window.open = original;
      return { found: false };
    }
    result.click();
    await new Promise((r) => setTimeout(r, 300));
    window.open = original;
    return {
      found: true,
      openCalls: window.__openedByTest,
      notice: document.getElementById("notice").textContent,
      linkState: document.getElementById("linkState").textContent,
    };
  });

  return { resting, hovered, activation };
}
