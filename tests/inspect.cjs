// Inspect the black-hole quad's material and intro state to find why the frame is black.
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");

const approach = html.match(/uApproach:\s*\{\s*value:\s*([\d.]+)\s*\}/);
console.log("uApproach initial   :", approach ? approach[1] : "NOT FOUND");

const duration = html.match(/INTRO_DURATION\s*=\s*([\d.]+)/);
console.log("INTRO_DURATION      :", duration ? duration[1] : "NOT FOUND");

console.log("updateIntro called  :", /updateIntro\(delta\)/.test(html));
console.log("is-intro class add  :", html.includes('classList.add("is-intro")'));
console.log("quad transparent    :", /transparent:\s*true/.test(html));
console.log("quad depthWrite     :", /depthWrite:\s*false/.test(html));

// The alpha expression actually shipped.
const alphaLines = html
  .split("\n")
  .filter((line) => /gl_FragColor|clamp\(swallowed/.test(line));
console.log("\nfragment output lines:");
alphaLines.forEach((line) => console.log("  " + line.trim()));

// Confirm the marcher still exits early; a stray break would kill all emission.
const loopBreaks = html.split("\n").filter((l) => /^\s*break;\s*$/.test(l));
console.log("\nbreak statements in shader source:", loopBreaks.length);
