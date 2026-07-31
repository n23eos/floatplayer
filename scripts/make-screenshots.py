"""Генератор локализованных скриншотов для Chrome Web Store (1280x800).

Кадры собираются из настоящей разметки мини-окна (scripts/shots/parts.js)
и настоящего extension/pip/pip.css, поэтому не могут разойтись с продуктом.
Подписи интерфейса берутся из _locales, подписи-заголовки — из captions.json.

Запуск:  python3 scripts/make-screenshots.py store/assets/screenshots
"""
import json
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "scripts" / "shots"
LOCALES = ROOT / "extension" / "_locales"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "store/assets/screenshots")

CAPTIONS = json.loads((SHOTS / "captions.json").read_text())

# Рабочий каталог рендера: сюда кладём копию pip.css и временные страницы.
WORK = SHOTS / "build"
WORK.mkdir(exist_ok=True)
shutil.copy(ROOT / "extension" / "pip" / "pip.css", WORK / "pip.css")
shutil.copy(SHOTS / "base.css", WORK / "base.css")
shutil.copy(SHOTS / "parts.js", WORK / "parts.js")


def ui(lang, key, fallback=""):
    """Подпись интерфейса из настоящего messages.json нужного языка."""
    data = json.loads((LOCALES / lang / "messages.json").read_text())
    return data.get(key, {}).get("message", fallback)


HEAD = """<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="pip.css"><link rel="stylesheet" href="base.css">
</head><body><div class="scene">
<script>window.L = {ui};</script>
"""

FOOT = """<div class="brandline">Float<i>Player</i> — {brand}</div>
<script src="parts.js"></script>
<script>{script}</script>
</div></body></html>"""


def caption(t, key):
    return (
        f'<div class="caption">'
        f'<span class="eyebrow">{t[key + "_eyebrow"]}</span>'
        f'<h2>{t[key + "_h"]}</h2><p>{t[key + "_p"]}</p></div>'
    )


def window(left, top, width, height, body_id="b"):
    """Рамка мини-окна: полоса с адресом и пустое тело под разметку панели."""
    return f"""<div class="pipwin" style="left:{left}px; top:{top}px; width:{width}px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">— ▢ ✕</span></div>
  <div class="pipwin-body" style="height:{height}px" id="{body_id}"></div>
</div>"""


def build(lang):
    t = CAPTIONS[lang]
    # Подписи внутри интерфейса — из локалей расширения, а не из captions.json:
    # на кадре должны быть ровно те слова, которые пользователь увидит.
    strings = {
        "sleepOff": ui(lang, "sleepOff", "off"),
        "sleepMinutes": ui(lang, "sleepMinutes", "min"),
        "queueTitle": ui(lang, "queueTitle", "Queue"),
    }
    head = HEAD.format(lang=lang, ui=json.dumps(strings, ensure_ascii=False))
    foot = lambda script: FOOT.format(brand=t["brand"], script=script)
    video_title = json.dumps(t["videoTitle"], ensure_ascii=False)

    pages = {}

    # 01 — окно поверх рабочего окна: главное обещание расширения.
    desk_lines = "".join(
        f'<div class="line{" line--accent" if accent else ""}" style="width:{w}%"></div>'
        for w, accent in (
            (64, False), (88, False), (47, True), (76, False), (59, False),
            (83, False), (38, False), (70, False), (52, True), (80, False),
        )
    )
    pages["01"] = (
        head
        + caption(t, "s1")
        + f"""<div class="desk" style="left:72px; top:250px; width:720px; height:470px;">
  <div class="desk-bar"><div class="desk-dot"></div><div class="desk-dot"></div><div class="desk-dot"></div></div>
  <div class="desk-body">{desk_lines}</div>
</div>"""
        + window(578, 330, 630, 340)
        + foot(
            'document.getElementById("b").innerHTML = '
            '\'<div class="videoish"></div>\' + '
            f"topStack({{videoTitle: {video_title}}}) + nav() + progress({{pos: 62}});"
        )
    )

    # 02 — панель крупно, с выносками по углам.
    pages["02"] = (
        head
        + caption(t, "s2")
        + window(320, 292, 640, 344)
        + f"""<div class="note" style="left:72px; top:308px;">{t['s2_n1']}</div>
<div class="note" style="right:72px; top:308px;">{t['s2_n2']}</div>
<div class="note" style="left:72px; top:492px;">{t['s2_n3']}</div>
<div class="note" style="right:72px; top:492px;">{t['s2_n4']}</div>"""
        + foot(
            'document.getElementById("b").innerHTML = '
            '\'<div class="videoish"></div>\' + '
            f"topStack({{videoTitle: {video_title}, speed: '1.5', boost: 220, sleep: '30', countdown: '24:18'}}) + "
            "nav() + progress({pos: 41});"
        )
    )

    # 03 — сегмент SponsorBlock на полоске и кнопка пропуска.
    sb_label = json.dumps(ui(lang, "sbSkip", "Skip sponsor segment") + " → 12:34", ensure_ascii=False)
    pages["03"] = (
        head
        + caption(t, "s3")
        + window(392, 262, 700, 404)
        + f"""<div class="note" style="left:72px; top:466px;">{t['s3_n']}</div>"""
        + foot(
            'document.getElementById("b").innerHTML = '
            '\'<div class="videoish"></div>\' + '
            f"topStack({{videoTitle: {video_title}}}) + sbSkip({sb_label}) + "
            "progress({pos: 58, seg: [56, 13]});"
        )
    )

    # 04 — выдвинутая колонка: очередь сверху, рекомендации ниже.
    titles = ";".join(
        f"r.push({json.dumps(t['s4_title'].format(i=i + 1), ensure_ascii=False)})"
        for i in range(8)
    )
    pages["04"] = (
        head
        + caption(t, "s4")
        + window(230, 258, 820, 420)
        + foot(f"""
const grads = ["#3b4a63,#22293a","#5a3b52,#2c2030","#3d5a4a,#1f2e26","#5a4f3b,#302a20","#42375a,#241f30","#5a3b3b,#2e2020"];
const r = []; {titles};
const card = (g, text, extra) => `<div class="ytfp-related-item ${{extra}}">
  <div class="thumb" style="background:linear-gradient(135deg, ${{g}})"></div>
  <span class="ytfp-related-title">${{text}}</span></div>`;
const queued = grads.slice(0, 2).map((g, i) => card(g, r[i], "ytfp-queue-item")).join("");
const rows = grads.map((g, i) => card(g, r[i + 2], "")).join("");
document.getElementById("b").innerHTML =
  '<div class="videoish"></div>' + topStack({{videoTitle: {video_title}}}) + progress({{pos: 33}}) +
  `<button class="ytfp-related-toggle ytfp-related-toggle--open">›</button>
   <div class="ytfp-related-panel ytfp-related-panel--open">
     <div class="ytfp-queue"><div class="ytfp-queue-header">${{window.L.queueTitle}}</div>
       <div class="ytfp-related-list">${{queued}}</div></div>
     <div class="ytfp-related-list">${{rows}}</div>
   </div>`;""")
    )

    # 05 — вертикальное окно шортсов с узкой панелью.
    pages["05"] = (
        head
        + caption(t, "s5")
        + window(474, 206, 376, 476)
        + f"""<div class="note" style="left:72px; top:392px;">{t['s5_n1']}</div>
<div class="note" style="right:72px; top:392px;">{t['s5_n2']}</div>"""
        + foot(
            'document.getElementById("b").innerHTML = '
            '\'<div class="videoish"></div>\' + '
            f"topStack({{narrow: true, videoTitle: {video_title}}}) + nav() + progress({{pos: 47}});"
        )
    )

    return pages


def render(lang, name, html):
    page = WORK / f"{lang}-{name}.html"
    page.write_text(html)
    raw = WORK / f"{lang}-{name}.raw.png"
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-color-profile=srgb", "--window-size=1280,800",
         f"--screenshot={raw}", f"file://{page}"],
        capture_output=True,
        check=False,
    )
    if not raw.exists():
        raise SystemExit(f"Chrome did not render {lang}/{name}")
    target = OUT / lang
    target.mkdir(parents=True, exist_ok=True)
    # 24-битный PNG без альфа-канала — требование Chrome Web Store.
    Image.open(raw).convert("RGB").save(target / f"{name}.png", format="PNG", optimize=True)
    print(f"{lang}/{name}.png")


languages = sys.argv[2:] or sorted(CAPTIONS)
for lang in languages:
    for name, html in build(lang).items():
        render(lang, name, html)
