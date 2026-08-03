"""Иконки расширения по спецификации Chrome Web Store.

128x128: рисунок 96x96 по центру, по 16 px прозрачных полей с каждой стороны.
16/48: те же формы без полей — на малых размерах важен каждый пиксель.
Рисуем с 8-кратным суперсэмплингом, потом уменьшаем — даёт чистое сглаживание.
"""
import pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "extension" / "icons"
SS = 8  # коэффициент суперсэмплинга

RED_TOP = (255, 45, 45)
RED_BOTTOM = (198, 0, 0)
WHITE = (255, 255, 255)


def vertical_gradient(size, top, bottom):
    """Полотно с вертикальным градиентом — плоское, без объёма и перспективы."""
    gradient = Image.new("RGB", (1, size), top)
    pixels = gradient.load()
    for y in range(size):
        t = y / max(1, size - 1)
        pixels[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return gradient.resize((size, size), Image.NEAREST)


def draw_icon(px, padding_ratio, with_window):
    """Одна иконка стороной px. padding_ratio — доля прозрачных полей."""
    big = px * SS
    pad = round(big * padding_ratio)
    art = big - pad * 2  # сторона самого рисунка

    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))

    # Скруглённый квадрат-подложка (маска + градиент).
    radius = round(art * 0.235)
    mask = Image.new("L", (art, art), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, art - 1, art - 1], radius=radius, fill=255)
    plate = vertical_gradient(art, RED_TOP, RED_BOTTOM).convert("RGBA")
    plate.putalpha(mask)
    canvas.paste(plate, (pad, pad), plate)

    draw = ImageDraw.Draw(canvas)

    # Тонкий светлый кант: отделяет иконку от тёмного фона, без «свечения».
    rim = max(1, round(art * 0.018))
    draw.rounded_rectangle(
        [pad, pad, pad + art - 1, pad + art - 1],
        radius=radius, outline=(255, 255, 255, 64), width=rim
    )

    # Треугольник play — фронтально, по центру оптической оси.
    cx, cy = pad + art / 2, pad + art / 2
    h = art * 0.38                      # высота треугольника
    w = h * 0.86                        # ширина
    shift = art * 0.005                 # оптическая компенсация вправо
    if with_window:
        cy -= art * 0.085               # освобождаем место под мини-окно
    draw.polygon(
        [(cx - w / 2 + shift, cy - h / 2),
         (cx - w / 2 + shift, cy + h / 2),
         (cx + w / 2 + shift, cy)],
        fill=WHITE
    )

    # Мини-окно поверх — тот самый смысл «поверх всех окон».
    if with_window:
        ww, wh = art * 0.37, art * 0.24
        wx = pad + art - ww - art * 0.11
        wy = pad + art - wh - art * 0.115
        wr = round(wh * 0.22)
        border = max(2, round(art * 0.035))
        # Вырезаем «дырку» под окном, чтобы белая рамка читалась на красном.
        draw.rounded_rectangle([wx, wy, wx + ww, wy + wh], radius=wr, fill=WHITE)
        draw.rounded_rectangle(
            [wx + border, wy + border, wx + ww - border, wy + wh - border],
            radius=max(1, wr - border // 2), fill=(150, 0, 0, 255)
        )

    small = canvas.resize((px, px), Image.LANCZOS)
    # LANCZOS оставляет по краю пиксели с почти нулевой альфой — гасим их,
    # иначе прозрачные поля формально «съедаются» на 1-2 px.
    alpha = small.split()[-1].point(lambda a: 0 if a < 12 else a)
    small.putalpha(alpha)
    return small


# 128 — по спецификации: рисунок 96x96 (75%) + по 16 px полей (12.5% с каждой стороны).
draw_icon(128, padding_ratio=0.125, with_window=True).save(OUT / "icon128.png")
# 48 — небольшие поля, чтобы не липнуть к краям UI.
draw_icon(48, padding_ratio=0.06, with_window=True).save(OUT / "icon48.png")
# 16 — без полей и без мелкой детали: на таком размере окно превратится в кашу.
draw_icon(16, padding_ratio=0.0, with_window=False).save(OUT / "icon16.png")

for name in ("icon16.png", "icon48.png", "icon128.png"):
    img = Image.open(OUT / name)
    bbox = img.split()[-1].getbbox()  # границы непрозрачной области
    print(f"{name}: {img.size[0]}x{img.size[1]} {img.mode} | рисунок {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} "
          f"| поля слева/сверху {bbox[0]}/{bbox[1]}")
