// Pure display operations shared by the viewer and numerical tests.
export const NORMALIZATION_METHOD = 'linear_srgb_luminance_p99_to_0.9_v1';
export const decode = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
export const encode = v => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055;

export function normalizePixels(input) {
  const luminance = [], linear = new Float64Array(input.length);
  for (let i = 0; i < input.length; i += 4) {
    for (let c = 0; c < 3; c++) linear[i + c] = decode(input[i + c] / 255);
    luminance.push(.2126 * linear[i] + .7152 * linear[i + 1] + .0722 * linear[i + 2]);
  }
  luminance.sort((a, b) => a - b);
  const percentile = luminance[Math.floor(.99 * (luminance.length - 1))] || 0;
  const denominator = percentile || luminance[luminance.length - 1] || 0;
  const gain = denominator > 0 ? .9 / denominator : 1;
  const output = new Uint8ClampedArray(input.length);
  let clipped = 0;
  for (let i = 0; i < input.length; i += 4) {
    let saturated = false;
    for (let c = 0; c < 3; c++) {
      const value = linear[i + c] * gain;
      saturated ||= value > 1;
      output[i + c] = Math.round(255 * encode(Math.min(1, value)));
    }
    output[i + 3] = input[i + 3];
    if (saturated) clipped++;
  }
  return {pixels: output, gain, percentile, clipped_fraction: clipped / (input.length / 4)};
}

export function clampView(view) {
  const z = Math.max(1, Math.min(4, view.zoom));
  const limit = .5 / z;
  return {zoom: z, x: Math.max(limit, Math.min(1 - limit, view.x)),
    y: Math.max(limit, Math.min(1 - limit, view.y))};
}

export function zoomAt(view, zoom, u = .5, v = .5) {
  const z = Math.max(1, Math.min(4, zoom));
  return clampView({zoom: z, x: view.x + (u - .5) * (1 / view.zoom - 1 / z),
    y: view.y + (v - .5) * (1 / view.zoom - 1 / z)});
}

export function transform(view) {
  return `translate(${100 * (.5 - view.zoom * view.x)}%, ${100 * (.5 - view.zoom * view.y)}%) scale(${view.zoom})`;
}
