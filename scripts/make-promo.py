"""Промо-графика Chrome Web Store в стиле кадров магазина.

Собирает малый тайл 440x280 и большое рекламное изображение (marquee) 1400x560
на том же фоне и из той же разметки мини-окна, что и скриншоты, — оформление
берётся из настоящего extension/pip/pip.css плюс scripts/shots/base.css.

Запуск:  python3 scripts/make-promo.py
"""
import pathlib
import shutil
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "scripts" / "shots"
WORK = SHOTS / "build"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TARGETS = (ROOT / "store" / "assets", ROOT / "docs" / "assets")

WORK.mkdir(parents=True, exist_ok=True)
shutil.copy(ROOT / "extension" / "pip" / "pip.css", WORK / "pip.css")
shutil.copy(SHOTS / "base.css", WORK / "base.css")
shutil.copy(SHOTS / "parts.js", WORK / "parts.js")
shutil.copytree(ROOT / "extension" / "icons", WORK / "icons", dirs_exist_ok=True)

# Общая шапка страницы. Размер сцены задаётся под каждый формат: в base.css он
# зафиксирован под кадр 1280x800.
HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="pip.css"><link rel="stylesheet" href="base.css">
<style>
  html, body, .scene {{ width: {w}px; height: {h}px; }}
  /* Сетка на фоне рассчитана на большой кадр; на тайле она превратилась бы
     в рябь, поэтому шаг увеличиваем вместе с форматом. */
  .scene::before {{ background-size: {grid}px {grid}px; }}
  .wordmark {{
    font-size: {mark}px; font-weight: 700; letter-spacing: -0.5px; line-height: 1;
  }}
  .wordmark i {{ color: var(--brand); font-style: normal; }}
  {extra}
</style></head><body><div class="scene">
{body}
<script src="parts.js"></script>
<script>{script}</script>
</div></body></html>"""


def render(name, html, out_names, jpeg=False):
    page = WORK / f"promo-{name}.html"
    page.write_text(html)
    raw = WORK / f"promo-{name}.raw.png"
    width, height = SIZES[name]
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-color-profile=srgb", f"--window-size={width},{height}",
         f"--screenshot={raw}", f"file://{page}"],
        capture_output=True,
        check=False,
    )
    if not raw.exists():
        raise SystemExit(f"Chrome did not render {name}")
    image = Image.open(raw).convert("RGB")
    for folder in TARGETS:
        for out in out_names:
            image.save(folder / out, format="PNG", optimize=True)
    # JPEG нужен только магазину: консоль иногда просит именно его.
    if jpeg:
        image.save(TARGETS[0] / out_names[0].replace(".png", ".jpg"),
                   format="JPEG", quality=92, subsampling=0)
    print(", ".join(str((folder / out_names[0]).relative_to(ROOT)) for folder in TARGETS))


SIZES = {"tile": (440, 280), "marquee": (1400, 560)}

# --- Малый тайл 440x280 ----------------------------------------------------
# Виден размером с ноготь, поэтому на нём только знак, название и одно окно.
# Никакого мелкого текста внутри окна: он всё равно не прочитается.
TILE_EXTRA = """
  .tile-left { position: absolute; left: 30px; top: 92px; z-index: 5; }
  .tile-icon { display: block; border-radius: 13px; margin-bottom: 16px; }
  .tile-tagline { margin-top: 9px; color: var(--ink-dim); font-size: 12.5px; }
  /* Окно выходит за правый край: композиция читается как фрагмент сцены,
     а не как уменьшенный скриншот. */
  .tile-win { left: 238px; top: 58px; width: 266px; }
"""

TILE_BODY = """<div class="tile-left">
  <img class="tile-icon" src="icons/icon48.png" width="46" height="46" alt="">
  <div class="wordmark">Float<i>Player</i></div>
  <div class="tile-tagline">Picture in Picture for YouTube</div>
</div>
<div class="pipwin tile-win">
  <div class="pipwin-chrome">youtube.com<span class="spacer">— ▢ ✕</span></div>
  <div class="pipwin-body" style="height:150px" id="b"></div>
</div>"""

TILE_SCRIPT = (
    'document.getElementById("b").innerHTML = '
    '\'<div class="videoish"></div>\' + '
    '\'<div class="ytfp-center-badge ytfp-center-badge--visible">\' + '
    'icon("play", 34) + \'</div>\' + '
    "progress({pos: 58, seg: [62, 14], chapters: [26, 55, 80]});"
)

render(
    "tile",
    HEAD.format(w=440, h=280, grid=44, mark=27, extra=TILE_EXTRA,
                body=TILE_BODY, script=TILE_SCRIPT),
    ["promo-tile-440x280.png"],
)

# --- Marquee 1400x560 ------------------------------------------------------
# Широкая полоса вверху страницы магазина: слева обещание, справа само окно.
MARQUEE_EXTRA = """
  .m-left { position: absolute; left: 82px; top: 96px; width: 566px; z-index: 5; }
  .m-brand {
    display: flex; align-items: center; gap: 11px;
    margin-bottom: 20px; color: #d8d8de;
    font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;
  }
  .m-brand img { border-radius: 8px; }
  .m-head {
    margin: 0 0 14px; font-size: 47px; font-weight: 700;
    line-height: 1.1; letter-spacing: -1px;
  }
  .m-head span { color: var(--brand); }
  .m-sub { margin: 0 0 26px; color: var(--ink-dim); font-size: 18px; line-height: 1.5; }
  .m-chips { display: flex; flex-wrap: wrap; gap: 9px; }
  .m-chip {
    border: 1px solid var(--frame); border-radius: 999px; padding: 8px 16px;
    background: rgba(22, 22, 27, 0.86); color: #d3d3dc; font-size: 13.5px;
  }
  .m-win { left: 680px; top: 96px; width: 660px; }
"""

MARQUEE_BODY = """<div class="m-left">
  <div class="m-brand"><img src="icons/icon48.png" width="30" height="30" alt="">FloatPlayer</div>
  <h1 class="m-head">YouTube that stays<br><span>on top of everything</span></h1>
  <p class="m-sub">A real always-on-top mini-player: A-B loop, 0.25&ndash;3x speed,
  volume to 300%, night mode, sponsor skip and Shorts that advance on their own.</p>
  <div class="m-chips">
    <span class="m-chip">Always on top</span>
    <span class="m-chip">Video only</span>
    <span class="m-chip">Sponsor skip</span>
    <span class="m-chip">Comments &amp; chat</span>
  </div>
</div>
<div class="pipwin m-win">
  <div class="pipwin-chrome">youtube.com<span class="spacer">— ▢ ✕</span></div>
  <div class="pipwin-body" style="height:340px" id="b"></div>
</div>"""

MARQUEE_SCRIPT = (
    'window.L = {sleepOff: "off", sleepMinutes: "min", queueTitle: "Queue"};'
    'document.getElementById("b").innerHTML = '
    '\'<div class="videoish"></div>\' + '
    'topStack({videoTitle: "How the deep ocean shapes the climate — full documentary"}) + '
    "nav() + progress({pos: 58, seg: [62, 13]});"
)

render(
    "marquee",
    HEAD.format(w=1400, h=560, grid=64, mark=30, extra=MARQUEE_EXTRA,
                body=MARQUEE_BODY, script=MARQUEE_SCRIPT),
    ["marquee-1400x560.png"],
    jpeg=True,
)
