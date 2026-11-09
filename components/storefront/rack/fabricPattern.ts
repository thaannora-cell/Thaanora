// Drawn fabric backgrounds from the prototype: a woven pattern in the accent colour, and an embroidered hem.

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export function fabricBackground(colour: string, accent: string, printed: boolean): React.CSSProperties {
  const size = 36;
  const h = size / 2;
  const motif = printed
    ? `<circle cx='${h}' cy='${h}' r='${size / 6}' fill='none' stroke='${accent}' stroke-width='1.2' opacity='.7'/>` +
      `<circle cx='${h}' cy='${h}' r='${size / 18}' fill='${accent}' opacity='.85'/>` +
      `<circle cx='0' cy='0' r='2.4' fill='${accent}' opacity='.5'/><circle cx='${size}' cy='${size}' r='2.4' fill='${accent}' opacity='.5'/>`
    : `<path d='M${h} 3 L${size - 3} ${h} L${h} ${size - 3} L3 ${h}Z' fill='none' stroke='${accent}' stroke-width='1' opacity='.55'/>` +
      `<circle cx='${h}' cy='${h}' r='2' fill='${accent}' opacity='.85'/>`;
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${motif}</svg>`;
  return {
    backgroundColor: colour,
    backgroundImage:
      "linear-gradient(90deg,rgba(0,0,0,.14),rgba(255,255,255,.06) 30%,rgba(0,0,0,.08) 55%,rgba(255,255,255,.05) 80%,rgba(0,0,0,.14))," +
      svgUrl(tile),
  };
}

export function hemBackground(accent: string): React.CSSProperties {
  const tile =
    `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='46'>` +
    `<path d='M0 8 L11 18 L22 8' fill='none' stroke='${accent}' stroke-width='1.4'/>` +
    `<circle cx='11' cy='25' r='2' fill='${accent}'/><path d='M0 34 H22' stroke='${accent}' stroke-width='1'/></svg>`;
  return { backgroundColor: "rgba(0,0,0,.2)", backgroundImage: svgUrl(tile) };
}
