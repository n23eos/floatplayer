"""Кадр со страницей настроек для лендинга (docs/assets/screenshot-6-options.png).

Страница берётся настоящая, из extension/options, и открывается в iframe на том
же фоне, что и остальные кадры магазина. chrome.* в обычной вкладке нет, поэтому
рядом кладём заглушку с теми значениями настроек, которые хотим показать.

Запуск:  python3 scripts/make-options-shot.py
"""
import pathlib
import shutil
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "scripts" / "shots"
WORK = SHOTS / "build" / "options"
OUT = ROOT / "docs" / "assets" / "screenshot-6-options.png"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

WORK.mkdir(parents=True, exist_ok=True)
for name in ("options.html", "options.css", "options.js"):
    shutil.copy(ROOT / "extension" / "options" / name, WORK / name)

# В обычной вкладке headless Chrome тема всегда светлая, а кадр должен быть
# тёмным, как остальные. Снимаем условие с media-запроса — цвета при этом
# остаются продуктовыми, из той же самой таблицы стилей.
css = WORK / "options.css"
css.write_text(css.read_text().replace("@media (prefers-color-scheme: dark) {", "@media all {"))
shutil.copytree(ROOT / "extension" / "icons", WORK.parent / "icons", dirs_exist_ok=True)
shutil.copy(SHOTS / "base.css", WORK.parent / "base.css")

STUB = """// Заглушка chrome API: страница настроек рассчитана на расширение.
const store = {
  autoPip: true, windowMode: "document", sponsorSkip: true, sponsorAutoSkip: false,
  sponsorCategories: ["sponsor", "selfpromo", "interaction"], shortsAutoNext: true,
  compactMode: true, speedStep: 0.25, skipStepSeconds: 30, volumeBoostMax: 300
};
window.chrome = {
  i18n: { getMessage: () => "" },
  runtime: { getManifest: () => ({ version: "%(version)s" }) },
  storage: {
    sync: { get: async (d) => ({ ...d, ...store }), set: async (p) => Object.assign(store, p) },
    onChanged: { addListener: () => {} }
  }
};
"""

version = __import__("json").loads(
    (ROOT / "extension" / "manifest.json").read_text()
)["version"]
(WORK / "stub.js").write_text(STUB % {"version": version})

# Заглушку подключаем до options.js — иначе тот упадёт на первом же chrome.*.
page = WORK / "options.html"
html = page.read_text().replace(
    '<script src="options.js">', '<script src="stub.js"></script>\n  <script src="options.js">', 1
)
page.write_text(html)

SCENE = """<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="base.css">
<style>
  /* Страница настроек живёт в iframe: так на кадр попадает ровно то, что
     увидит пользователь, без копирования вёрстки. */
  .sheet {
    position: absolute; left: 50%%; top: 150px; transform: translateX(-50%%);
    width: 620px; height: 596px; z-index: 4;
    border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 14px; overflow: hidden;
    background: #0f0f0f; box-shadow: 0 34px 90px rgba(0, 0, 0, 0.62);
  }
  .sheet iframe { display: block; width: 620px; height: 900px; border: 0; }
  /* Страница длиннее кадра: нижний край растворяем, чтобы обрез читался как
     приём, а не как случайно отрезанная строка. */
  .sheet::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 120px;
    background: linear-gradient(to bottom, rgba(15, 15, 15, 0), #0f0f0f 88%%);
  }
</style></head><body><div class="scene">
<div class="caption" style="left: 50%%; top: 52px; width: 860px; transform: translateX(-50%%); text-align: center;">
  <span class="eyebrow">%(eyebrow)s</span>
  <h2 style="margin-bottom: 0">%(head)s</h2>
</div>
<div class="sheet"><iframe src="options/options.html" scrolling="no"></iframe></div>
<div class="brandline">Float<i>Player</i> — %(brand)s</div>
</div></body></html>"""

scene = WORK.parent / "options-scene.html"
scene.write_text(SCENE % {
    "eyebrow": "Settings",
    "head": "Everything in one place",
    "brand": "Picture in Picture for YouTube",
})

raw = WORK.parent / "options.raw.png"
subprocess.run(
    [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
     "--force-color-profile=srgb", "--window-size=1280,800",
     f"--screenshot={raw}", f"file://{scene}"],
    capture_output=True,
    check=False,
)
if not raw.exists():
    raise SystemExit("Chrome did not render the options page")
Image.open(raw).convert("RGB").save(OUT, format="PNG", optimize=True)
print(OUT.relative_to(ROOT))
