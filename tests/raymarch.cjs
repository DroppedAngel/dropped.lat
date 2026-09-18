// Reproduce the shader's ray march and report the accumulated disk light for a set of
// rays, so the emission scale can be reasoned about with real numbers.
const INCL = parseFloat(process.argv[2] || "0.66");
const EYE = 26;
const DISK_IN = 2.75;
const DISK_OUT = 20.0;
const STEPS = 900;
const HALF_EXTENT = parseFloat(process.argv[3] || "1.22");
const ASPECT = 1280 / 720;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const m = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / m, a[1] / m, a[2] / m];
};
const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const eye = [0, Math.sin(INCL) * EYE, Math.cos(INCL) * EYE];
const forward = norm([-eye[0], -eye[1], -eye[2]]);
// Mirror the shader: World Y collapses the basis at high elevation, so Z is used instead.
const reference = Math.abs(forward[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
const right = norm(cross(reference, forward));
const up = norm(cross(forward, right));

function trace(sx, sy) {
  const x = sx * ASPECT * HALF_EXTENT;
  const y = sy * HALF_EXTENT;
  let dir = norm([
    forward[0] + right[0] * x + up[0] * y,
    forward[1] + right[1] * x + up[1] * y,
    forward[2] + right[2] * x + up[2] * y,
  ]);
  let pos = eye.slice();
  const h2 = (() => {
    const h = cross(eye, dir);
    return dot(h, h);
  })();

  let colour = 0;
  let transmittance = 1;
  let diskSamples = 0;
  let captured = false;
  let peakDensity = 0;
  let firstDiskRadius = null;

  for (let i = 0; i < STEPS; i += 1) {
    const r = Math.hypot(pos[0], pos[1], pos[2]);
    if (r < 1.0) {
      captured = true;
      colour = 0;
      break;
    }

    let step = Math.min(Math.max(r * 0.055, 0.012), 0.62);
    if (r < DISK_OUT + 2) step *= 0.36;
    if (r < DISK_OUT + 0.5) {
      const localFlare = 0.12 + r * 0.05;
      step = Math.min(step, localFlare * 0.35);
    }

    const r2 = Math.max(dot(pos, pos), 1e-6);
    const k0 = (-1.5 * h2) / Math.pow(r2, 2.5);
    const a0 = [k0 * pos[0], k0 * pos[1], k0 * pos[2]];

    const pv = [pos[0] + dir[0] * step, pos[1] + dir[1] * step, pos[2] + dir[2] * step];
    const p2 = Math.max(dot(pv, pv), 1e-6);
    const k1 = (-1.5 * h2) / Math.pow(p2, 2.5);
    const a1 = [k1 * pv[0], k1 * pv[1], k1 * pv[2]];

    dir = norm([
      dir[0] + 0.5 * (a0[0] + a1[0]) * step,
      dir[1] + 0.5 * (a0[1] + a1[1]) * step,
      dir[2] + 0.5 * (a0[2] + a1[2]) * step,
    ]);
    pos = [pos[0] + dir[0] * step, pos[1] + dir[1] * step, pos[2] + dir[2] * step];

    const rXZ = Math.hypot(pos[0], pos[2]);
    if (rXZ < DISK_OUT) {
      const flare = 0.12 + rXZ * 0.05;
      const vertical = Math.exp(-Math.pow(pos[1] / flare, 2));
      const band =
        smoothstep(DISK_IN, DISK_IN * 1.06, rXZ) *
        (1 - smoothstep(DISK_OUT * 0.30, DISK_OUT * 0.72, rXZ));
      const density = vertical * band;
      if (density > 0.0005) {
        diskSamples += 1;
        if (firstDiskRadius === null) firstDiskRadius = +rXZ.toFixed(2);
        peakDensity = Math.max(peakDensity, density);
        const g = Math.pow(Math.max(rXZ, DISK_IN), -0.85);
        const emission = density * (1.1 + 1.9 * Math.pow(0.5, 1.2)) * g;
        colour += transmittance * emission * step * 120.0;
        transmittance *= Math.exp(-density * step * 0.004);
      }
    }

    if (r > EYE + 6) break;
  }

  return {
    screen: [sx, sy],
    colour: +colour.toFixed(3),
    diskSamples,
    captured,
    peakDensity: +peakDensity.toFixed(3),
    firstDiskRadius,
    finalTransmittance: +transmittance.toFixed(3),
  };
}

const rays = [
  [0, 0],
  [0, 0.2],
  [0, 0.35],
  [0.25, 0.3],
  [0.5, 0.4],
  [0, 0.5],
  [0.3, 0.0],
];
rays.forEach(([sx, sy]) => console.log(JSON.stringify(trace(sx, sy))));
