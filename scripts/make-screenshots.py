"""Генератор локализованных скриншотов для Chrome Web Store (1280x800).

Мини-окно на кадре — отдельный документ во фрейме: в нём настоящий
extension/pip/pip.css и разметка из scripts/shots/parts.js, повторяющая
то, что строит extension/content. Фрейм нужен ради ширины: медиазапросы
pip.css должны считаться от размера мини-окна, а не от страницы 1280px.

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
for name in ("base.css", "window.css", "parts.js"):
    shutil.copy(SHOTS / name, WORK / name)

# Высота полосы с адресом, которую Chrome рисует над окном document PiP.
CHROME_STRIP_HEIGHT = 34


def ui(lang, key, fallback=""):
    """Подпись интерфейса из настоящего messages.json нужного языка."""
    data = json.loads((LOCALES / lang / "messages.json").read_text())
    return data.get(key, {}).get("message", fallback)


SCENE_HEAD = """<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="base.css">
</head><body><div class="scene">
"""

SCENE_FOOT = """<div class="brandline">Float<i>Player</i> — {brand}</div>
</div></body></html>"""

WINDOW_PAGE = """<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="pip.css"><link rel="stylesheet" href="window.css">
</head><body>
<script>window.L = {ui};</script>
<script src="parts.js"></script>
<script>{script}</script>
</body></html>"""


def caption(t, key):
    return (
        f'<div class="caption">'
        f'<span class="eyebrow">{t[key + "_eyebrow"]}</span>'
        f'<h2>{t[key + "_h"]}</h2><p>{t[key + "_p"]}</p></div>'
    )


def note(text, style, extra=""):
    return f'<div class="note {extra}" style="{style}">{text}</div>'


def build(lang):
    t = CAPTIONS[lang]
    # Подписи внутри интерфейса — из локалей расширения, а не из captions.json:
    # на кадре должны быть ровно те слова, которые пользователь увидит.
    strings = json.dumps(
        {
            "sleepOff": ui(lang, "sleepOff", "off"),
            "sleepMinutes": ui(lang, "sleepMinutes", "min"),
            "queueTitle": ui(lang, "queueTitle", "Queue"),
        },
        ensure_ascii=False,
    )

    counter = [0]

    def window(script, left, top, width, height, clean=False):
        """Пишет документ мини-окна и возвращает его рамку на сцене."""
        counter[0] += 1
        name = f"{lang}-w{counter[0]}.html"
        (WORK / name).write_text(
            WINDOW_PAGE.format(lang=lang, ui=strings, script=script)
        )
        strip = (
            ""
            if clean
            else '<div class="pipwin-chrome">youtube.com<span class="spacer">— ▢ ✕</span></div>'
        )
        cls = "pipwin pipwin--clean" if clean else "pipwin"
        return f"""<div class="{cls}" style="left:{left}px; top:{top}px; width:{width}px;">
  {strip}
  <iframe class="pipwin-body" src="{name}" style="width:{width}px; height:{height}px" scrolling="no"></iframe>
</div>"""

    video_title = json.dumps(t["videoTitle"], ensure_ascii=False)
    related_titles = json.dumps(
        [t["relatedTitle"].format(i=i + 1) for i in range(8)], ensure_ascii=False
    )

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
        SCENE_HEAD.format(lang=lang)
        + caption(t, "s1")
        + f"""<div class="desk" style="left:72px; top:250px; width:720px; height:470px;">
  <div class="desk-bar"><div class="desk-dot"></div><div class="desk-dot"></div><div class="desk-dot"></div></div>
  <div class="desk-body">{desk_lines}</div>
</div>"""
        + window(
            f"render([titleBar({{videoTitle: {video_title}}}), reactions(),"
            "  bottomBar({}), progress({pos: 62})]);",
            578, 330, 630, 354,
        )
        + SCENE_FOOT.format(brand=t["brand"])
    )

    # 02 — полный режим: панель, боковая колонка и выноски по краям.
    notes_02 = "".join(
        note(t[key], style)
        for key, style in (
            ("s2_n1", "left:72px; top:292px;"),
            ("s2_n2", "left:72px; top:432px;"),
            ("s2_n3", "left:72px; top:572px;"),
            ("s2_n4", "right:72px; top:292px;"),
            ("s2_n5", "right:72px; top:432px;"),
            ("s2_n6", "right:72px; top:572px;"),
        )
    )
    pages["02"] = (
        SCENE_HEAD.format(lang=lang)
        + caption(t, "s2")
        + window(
            f"render([titleBar({{videoTitle: {video_title}}}), reactions(),"
            "  relatedPanel(" + related_titles + "),"
            "  bottomBar({speed: '1.5', boost: 220, night: 'warm', sleep: {minutes: '30', countdown: '24:18'}}),"
            "  progress({pos: 41, seg: [56, 13]})]);",
            320, 268, 640, 360,
        )
        + notes_02
        + SCENE_FOOT.format(brand=t["brand"])
    )

    # 03 — два режима окна рядом: с панелью и чистое видео.
    full_label = ui(lang, "optWindowModeFull", "Full (with panel)")
    clean_label = ui(lang, "optWindowModeClean", "Clean video (no strip)")
    pages["03"] = (
        SCENE_HEAD.format(lang=lang)
        + caption(t, "s3")
        + f'<div class="modelabel" style="left:120px; top:282px;">1 — {full_label}</div>'
        + f'<div class="modelabel" style="left:740px; top:282px;">2 — {clean_label}</div>'
        + window(
            f"render([titleBar({{videoTitle: {video_title}}}), reactions(),"
            "  bottomBar({boost: 180}), progress({pos: 52})]);",
            120, 310, 420, 236,
        )
        + window("render([]);", 740, 310, 420, 236, clean=True)
        + note(t["s3_full"], "left:120px; top:600px;", "note--wide")
        + note(t["s3_clean"], "left:740px; top:600px;", "note--wide")
        + SCENE_FOOT.format(brand=t["brand"])
    )

    # 04 — шортсы: вертикальное окно, капсула над панелью, листание ленты.
    notes_04 = "".join(
        note(t[key], style, "note--col")
        for key, style in (
            ("s4_n1", "left:72px; top:300px;"),
            ("s4_n2", "left:72px; top:432px;"),
            ("s4_n3", "left:72px; top:564px;"),
        )
    )
    pages["04"] = (
        SCENE_HEAD.format(lang=lang)
        + caption(t, "s4")
        + window(
            f"render([titleBar({{videoTitle: {json.dumps(t['shortTitle'], ensure_ascii=False)}}}),"
            "  shortsBottomBar({boost: 130}), progress({pos: 58, chapters: []})]);"
            "document.querySelector('.videoish').classList.add('videoish--portrait');",
            830, 108, 312, 555,
        )
        + notes_04
        + SCENE_FOOT.format(brand=t["brand"])
    )

    # 05 — поиск шортсов по слову: поле над капсулой, лупа горит.
    notes_05 = "".join(
        note(t[key], style, "note--col")
        for key, style in (
            ("s5_n1", "left:72px; top:330px;"),
            ("s5_n2", "left:72px; top:470px;"),
        )
    )
    query = json.dumps(t["s5_query"], ensure_ascii=False)
    pages["05"] = (
        SCENE_HEAD.format(lang=lang)
        + caption(t, "s5")
        + window(
            f"render([titleBar({{videoTitle: {json.dumps(t['shortTitleFound'], ensure_ascii=False)}}}),"
            f"  shortsBottomBar({{boost: 130, query: {query}, searchActive: true}}),"
            "  progress({pos: 22, chapters: []})]);"
            "document.querySelector('.videoish').classList.add('videoish--portrait');",
            830, 108, 312, 555,
        )
        + notes_05
        + SCENE_FOOT.format(brand=t["brand"])
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
