"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.ui = {
  paintSlider(slider) {
    const percent = YTFP.utils.sliderFillPercent(slider.value, slider.min, slider.max);
    slider.style.setProperty("--ytfp-fill", `${percent}%`);
  },
  icon(doc, shape, size = 14) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size)); svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "currentColor"); svg.setAttribute("aria-hidden", "true");
    const path = doc.createElementNS(ns, "path");
    path.setAttribute("d", typeof shape === "string" ? shape : shape.d);
    if (shape.fillRule) path.setAttribute("fill-rule", shape.fillRule);
    svg.append(path); return svg;
  }
};
