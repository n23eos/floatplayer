"""Генератор локализованных скриншотов для Chrome Web Store (1280x800)."""
import pathlib, subprocess, sys
from PIL import Image

SHOTS = pathlib.Path(__file__).parent
OUT = pathlib.Path(sys.argv[1])  # каталог назначения проекта
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TEXT = {
    "en": {
        "sleepOff": "off",
        "sbSkip": "Skip sponsor segment → 12:34",
        "brand": "Picture in Picture for YouTube",
        "s1_h": "Keep watching while you work",
        "s1_p": "The YouTube player moves into a real always-on-top window — playback never restarts.",
        "s2_h": "Every control you actually need",
        "s2_p": "A-B loop, 0.25–3x speed, 0–300% volume, sleep timer — in one hover panel.",
        "s2_n1": "<b>A-B loop</b> — repeat any fragment: click A, click B, click to reset.",
        "s2_n2": "<b>Volume to 300%</b> — louder than YouTube's own maximum.",
        "s2_n3": "<b>Sleep timer</b> — presets or your own value; the interface hides while it counts down.",
        "s2_n4": "<b>±30 s and prev/next</b> right under the video.",
        "s3_h": "Sponsor segments, marked and skippable",
        "s3_p": "Community SponsorBlock data highlights in-video sponsor reads — one click jumps past them.",
        "s3_n": "<b>Green segment</b> on the progress strip = a sponsor read.",
        "s4_h": "Switch videos without leaving the window",
        "s4_p": "The arrow on the right slides out your recommendations — pick the next video right here.",
        "s4_title": "Recommended video title number {i} shown right inside the floating window",
        "s5_h": "Shorts too — vertical, with auto-advance",
        "s5_p": "A button above Like pops the short out; when it ends the next one starts by itself.",
        "s5_n1": "<b>Compact panel</b> fitted to the narrow window.",
        "s5_n2": "<b>◀ ▶</b> scroll the Shorts feed straight from the window.",
    },
    "ru": {
        "sleepOff": "выкл",
        "sbSkip": "Пропустить интеграцию → 12:34",
        "brand": "Picture in Picture для YouTube",
        "s1_h": "Смотрите, пока работаете",
        "s1_p": "Плеер YouTube переезжает в настоящее окно поверх всех окон — воспроизведение не прерывается.",
        "s2_h": "Все нужные регуляторы в одной панели",
        "s2_p": "A-B повтор, скорость 0.25–3x, громкость 0–300%, таймер сна — по наведению мыши.",
        "s2_n1": "<b>A-B повтор</b> — зациклить фрагмент: клик A, клик B, клик — сброс.",
        "s2_n2": "<b>Громкость до 300%</b> — громче максимума самого YouTube.",
        "s2_n3": "<b>Таймер сна</b> — пресеты или своё значение; пока идёт отсчёт, интерфейс скрыт.",
        "s2_n4": "<b>±30 сек и пред./след.</b> прямо под видео.",
        "s3_h": "Спонсорские вставки видно и можно пропустить",
        "s3_p": "Данные сообщества SponsorBlock подсвечивают интеграции внутри видео — клик перепрыгивает их.",
        "s3_n": "<b>Зелёный сегмент</b> на полоске прогресса — спонсорская вставка.",
        "s4_h": "Переключайте видео, не выходя из окна",
        "s4_p": "Стрелка справа выдвигает колонку рекомендаций — следующий ролик выбирается здесь же.",
        "s4_title": "Название рекомендованного видео номер {i}, показанное прямо в мини-окне",
        "s5_h": "Шортсы — вертикально и с автопереходом",
        "s5_p": "Кнопка над «лайком» выносит шортс; когда он доигрывает, включается следующий.",
        "s5_n1": "<b>Компактная панель</b> под узкое окно.",
        "s5_n2": "<b>◀ ▶</b> листают ленту шортсов прямо из окна.",
    },

    "es": {
        "sleepOff": "no", "sbSkip": "Saltar el patrocinio → 12:34",
        "brand": "Picture in Picture para YouTube",
        "s1_h": "Sigue viendo mientras trabajas",
        "s1_p": "El reproductor de YouTube pasa a una ventana siempre visible: la reproducción no se reinicia.",
        "s2_h": "Todos los controles que de verdad hacen falta",
        "s2_p": "Bucle A-B, velocidad 0.25–3x, volumen 0–300 %, temporizador: en un solo panel.",
        "s2_n1": "<b>Bucle A-B</b>: repite cualquier fragmento — clic en A, clic en B, clic para borrar.",
        "s2_n2": "<b>Volumen hasta 300 %</b>: más alto que el máximo de YouTube.",
        "s2_n3": "<b>Temporizador</b>: valores fijos o el tuyo; la interfaz se oculta mientras cuenta.",
        "s2_n4": "<b>±30 s y anterior/siguiente</b> justo debajo del vídeo.",
        "s3_h": "Patrocinios marcados y saltables",
        "s3_p": "Los datos de la comunidad SponsorBlock marcan los anuncios dentro del vídeo: un clic y ya está.",
        "s3_n": "<b>Segmento verde</b> en la barra = mención patrocinada.",
        "s4_h": "Cambia de vídeo sin volver a la pestaña",
        "s4_p": "La flecha de la derecha despliega tus recomendaciones: elige el siguiente aquí mismo.",
        "s4_title": "Título del vídeo recomendado número {i}, dentro de la ventana flotante",
        "s5_h": "Shorts también: vertical y automático",
        "s5_p": "Un botón encima de «Me gusta» lo saca; al terminar, el siguiente empieza solo.",
        "s5_n1": "<b>Panel compacto</b> ajustado a la ventana estrecha.",
        "s5_n2": "<b>◀ ▶</b> recorren el feed de Shorts desde la ventana.",
    },
    "pt_BR": {
        "sleepOff": "não", "sbSkip": "Pular o patrocínio → 12:34",
        "brand": "Picture in Picture para o YouTube",
        "s1_h": "Continue assistindo enquanto trabalha",
        "s1_p": "O player do YouTube vai para uma janela sempre à frente — a reprodução não recomeça.",
        "s2_h": "Todos os controles que realmente faltavam",
        "s2_p": "Repetição A-B, velocidade 0.25–3x, volume 0–300%, timer: tudo em um painel.",
        "s2_n1": "<b>Repetição A-B</b>: repita qualquer trecho — clique em A, clique em B, clique para limpar.",
        "s2_n2": "<b>Volume até 300%</b>: mais alto que o máximo do próprio YouTube.",
        "s2_n3": "<b>Timer</b>: valores prontos ou o seu; a interface some enquanto ele corre.",
        "s2_n4": "<b>±30 s e anterior/próximo</b> logo abaixo do vídeo.",
        "s3_h": "Patrocínios marcados e puláveis",
        "s3_p": "Os dados da comunidade SponsorBlock marcam os merchans dentro do vídeo — um clique e pronto.",
        "s3_n": "<b>Trecho verde</b> na barra = merchan do patrocinador.",
        "s4_h": "Troque de vídeo sem voltar para a aba",
        "s4_p": "A seta da direita abre suas recomendações: escolha o próximo aqui mesmo.",
        "s4_title": "Título do vídeo recomendado número {i}, dentro da janela flutuante",
        "s5_h": "Shorts também: vertical e automático",
        "s5_p": "Um botão acima do «Gostei» destaca o Short; ao acabar, o próximo começa sozinho.",
        "s5_n1": "<b>Painel compacto</b> ajustado à janela estreita.",
        "s5_n2": "<b>◀ ▶</b> percorrem o feed de Shorts pela janela.",
    },
    "de": {
        "sleepOff": "aus", "sbSkip": "Sponsor überspringen → 12:34",
        "brand": "Picture in Picture für YouTube",
        "s1_h": "Weiterschauen, während du arbeitest",
        "s1_p": "Der YouTube-Player wandert in ein Fenster im Vordergrund — die Wiedergabe startet nicht neu.",
        "s2_h": "Alle Regler, die wirklich fehlen",
        "s2_p": "A-B-Schleife, Tempo 0,25–3x, Lautstärke 0–300 %, Sleeptimer — in einem Bedienfeld.",
        "s2_n1": "<b>A-B-Schleife</b>: jeden Abschnitt wiederholen — Klick auf A, Klick auf B, Klick zum Löschen.",
        "s2_n2": "<b>Lautstärke bis 300 %</b> — lauter als YouTubes eigenes Maximum.",
        "s2_n3": "<b>Sleeptimer</b>: Vorgaben oder eigener Wert; währenddessen bleibt die Oberfläche verborgen.",
        "s2_n4": "<b>±30 s sowie vor/zurück</b> direkt unter dem Video.",
        "s3_h": "Sponsor-Abschnitte sichtbar und überspringbar",
        "s3_p": "Daten der SponsorBlock-Community markieren Werbeblöcke im Video — ein Klick genügt.",
        "s3_n": "<b>Grüner Abschnitt</b> auf der Leiste = Sponsorenblock.",
        "s4_h": "Videos wechseln, ohne zum Tab zurückzugehen",
        "s4_p": "Der Pfeil rechts fährt die Empfehlungen aus: das nächste Video direkt hier wählen.",
        "s4_title": "Titel des empfohlenen Videos Nummer {i}, direkt im schwebenden Fenster",
        "s5_h": "Shorts ebenfalls — hochkant und automatisch",
        "s5_p": "Eine Schaltfläche über „Gefällt mir“ löst den Short heraus; danach startet der nächste von selbst.",
        "s5_n1": "<b>Kompaktes Bedienfeld</b> passend zum schmalen Fenster.",
        "s5_n2": "<b>◀ ▶</b> blättern den Shorts-Feed direkt im Fenster.",
    },
    "ja": {
        "sleepOff": "オフ", "sbSkip": "スポンサー部分をスキップ → 12:34",
        "brand": "YouTube用ピクチャーインピクチャー",
        "s1_h": "作業しながら見続けられます",
        "s1_p": "YouTubeのプレーヤーが最前面のウィンドウへ移動。再生は途切れません。",
        "s2_h": "本当に必要な操作がすべて",
        "s2_p": "A-Bリピート、速度0.25〜3x、音量0〜300%、スリープタイマーを1つのパネルに。",
        "s2_n1": "<b>A-Bリピート</b>：好きな範囲を繰り返し。Aをクリック、Bをクリック、もう一度で解除。",
        "s2_n2": "<b>音量は最大300%</b>。YouTube本来の最大より大きくできます。",
        "s2_n3": "<b>スリープタイマー</b>：定型値でも自由入力でも。作動中はUIが隠れます。",
        "s2_n4": "<b>±30秒と前後の移動</b>が動画のすぐ下に。",
        "s3_h": "スポンサー部分が見えて、飛ばせる",
        "s3_p": "SponsorBlockコミュニティのデータが動画内の宣伝を示し、ワンクリックで先へ進めます。",
        "s3_n": "シークバーの<b>緑の区間</b>がスポンサー部分です。",
        "s4_h": "タブに戻らず動画を切り替え",
        "s4_p": "右端の矢印でおすすめ一覧が開き、次の動画をその場で選べます。",
        "s4_title": "フローティングウィンドウ内に表示されるおすすめ動画のタイトル {i}",
        "s5_h": "ショートも縦画面で自動再生",
        "s5_p": "「高く評価」の上のボタンでショートを切り出し。終われば次が自動で始まります。",
        "s5_n1": "<b>コンパクトなパネル</b>が狭いウィンドウに収まります。",
        "s5_n2": "<b>◀ ▶</b> でウィンドウからショートを送れます。",
    },
    "fr": {
        "sleepOff": "off", "sbSkip": "Passer le sponsor → 12:34",
        "brand": "Picture in Picture pour YouTube",
        "s1_h": "Continuez à regarder pendant que vous travaillez",
        "s1_p": "Le lecteur YouTube passe dans une fenêtre au premier plan — la lecture ne redémarre pas.",
        "s2_h": "Toutes les commandes qui manquaient vraiment",
        "s2_p": "Boucle A-B, vitesse 0,25–3x, volume 0–300 %, minuterie : dans un seul panneau.",
        "s2_n1": "<b>Boucle A-B</b> : répétez un passage — clic sur A, clic sur B, clic pour effacer.",
        "s2_n2": "<b>Volume jusqu'à 300 %</b> — plus fort que le maximum de YouTube.",
        "s2_n3": "<b>Minuterie</b> : valeurs prêtes ou la vôtre ; l'interface se cache pendant le décompte.",
        "s2_n4": "<b>±30 s et précédent/suivant</b> juste sous la vidéo.",
        "s3_h": "Passages sponsorisés visibles et évitables",
        "s3_p": "Les données de la communauté SponsorBlock signalent les pubs intégrées — un clic suffit.",
        "s3_n": "<b>Segment vert</b> sur la barre = passage sponsorisé.",
        "s4_h": "Changez de vidéo sans revenir à l'onglet",
        "s4_p": "La flèche de droite déroule vos recommandations : choisissez la suivante ici même.",
        "s4_title": "Titre de la vidéo recommandée numéro {i}, affiché dans la fenêtre flottante",
        "s5_h": "Les Shorts aussi — verticaux et enchaînés",
        "s5_p": "Un bouton au-dessus de « J'aime » sort le Short ; à la fin, le suivant démarre seul.",
        "s5_n1": "<b>Panneau compact</b> adapté à la fenêtre étroite.",
        "s5_n2": "<b>◀ ▶</b> font défiler le fil Shorts depuis la fenêtre.",
    },
    "id": {
        "sleepOff": "mati", "sbSkip": "Lewati segmen sponsor → 12:34",
        "brand": "Picture in Picture untuk YouTube",
        "s1_h": "Tetap menonton sambil bekerja",
        "s1_p": "Pemutar YouTube pindah ke jendela yang selalu di atas — pemutaran tidak diulang dari awal.",
        "s2_h": "Semua kendali yang memang dibutuhkan",
        "s2_p": "Pengulangan A-B, kecepatan 0,25–3x, volume 0–300%, pengatur waktu: dalam satu panel.",
        "s2_n1": "<b>Pengulangan A-B</b>: ulangi bagian mana pun — klik A, klik B, klik untuk menghapus.",
        "s2_n2": "<b>Volume sampai 300%</b> — lebih keras dari batas maksimum YouTube.",
        "s2_n3": "<b>Pengatur waktu tidur</b>: nilai siap pakai atau milikmu; antarmuka tersembunyi saat berjalan.",
        "s2_n4": "<b>±30 dtk dan sebelumnya/berikutnya</b> tepat di bawah video.",
        "s3_h": "Segmen sponsor terlihat dan bisa dilewati",
        "s3_p": "Data komunitas SponsorBlock menandai iklan di dalam video — satu klik dan lewat.",
        "s3_n": "<b>Segmen hijau</b> di bilah progres = bagian sponsor.",
        "s4_h": "Ganti video tanpa kembali ke tab",
        "s4_p": "Panah di kanan membuka rekomendasi: pilih video berikutnya di sini juga.",
        "s4_title": "Judul video rekomendasi nomor {i} yang tampil di dalam jendela mengambang",
        "s5_h": "Shorts juga — vertikal dan otomatis",
        "s5_p": "Tombol di atas «Suka» mengeluarkan Short; setelah selesai, berikutnya mulai sendiri.",
        "s5_n1": "<b>Panel ringkas</b> yang pas untuk jendela sempit.",
        "s5_n2": "<b>◀ ▶</b> menggulir feed Shorts langsung dari jendela.",
    },
}

HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="pip.css">
<style>
  .ytfp-bar {{ opacity: 1 !important; transform: none !important; }}
  .ytfp-nav {{ opacity: 1 !important; pointer-events: auto !important; }}
  .ytfp-related-toggle {{ opacity: 1 !important; }}
  html, body {{ background: #0d0d0f; }}
  .sbskip {{ position:absolute; bottom:88px; left:58%; transform:translateX(-50%); z-index:10001;
    border:0; border-radius:4px; padding:8px 12px; background:rgba(15,15,15,0.9); color:#fff;
    font-family:"Roboto",Arial,sans-serif; font-size:13px; white-space:nowrap; }}
  .thumb {{ width:86px; aspect-ratio:16/9; border-radius:6px; }}
</style></head><body><div class="scene">
<script>window.L = {{ sleepOff: "{sleepOff}" }};</script>
"""

FOOT = """<div class="brandline">Float<b>Player</b> — {brand}</div>
<script src="parts.js"></script>
<script>{script}</script>
</div></body></html>"""


def caption(t, h, p):
    return f'<div class="caption"><h2>{t[h]}</h2><p>{t[p]}</p></div>'


def build(lang):
    t = TEXT[lang]
    pages = {}

    pages["01"] = HEAD.format(**t) + caption(t, "s1_h", "s1_p") + """
<div class="desk"><div class="desk-bar"><div class="desk-dot"></div><div class="desk-dot"></div><div class="desk-dot"></div></div>
<div class="desk-body">""" + "".join(
        f'<div class="line" style="width:{w}%"></div>'
        for w in (64, 88, 47, 76, 59, 83, 38, 70, 52, 80, 44)
    ) + """</div></div>
<div class="pipwin" style="left:600px; top:330px; width:600px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">▣ ✕</span></div>
  <div class="pipwin-body" style="height:338px" id="b"></div>
</div>""" + FOOT.format(brand=t["brand"], script=(
        'document.getElementById("b").innerHTML = '
        "'<div class=\"videoish\"></div>' + bar() + nav() + progress({pos:62});"))

    pages["02"] = HEAD.format(**t) + caption(t, "s2_h", "s2_p") + f"""
<div class="pipwin" style="left:190px; top:210px; width:900px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">▣ ✕</span></div>
  <div class="pipwin-body" style="height:470px" id="b"></div>
</div>
<div class="note" style="left:196px; top:300px;">{t['s2_n1']}</div>
<div class="note" style="right:200px; top:300px;">{t['s2_n2']}</div>
<div class="note" style="left:196px; bottom:185px;">{t['s2_n3']}</div>
<div class="note" style="right:200px; bottom:185px;">{t['s2_n4']}</div>""" + FOOT.format(
        brand=t["brand"], script=(
            'document.getElementById("b").innerHTML = '
            "'<div class=\"videoish\"></div>' + bar({sleep:\"30\", countdown:\"24:18\"}) + nav() + progress({pos:41});"))

    pages["03"] = HEAD.format(**t) + caption(t, "s3_h", "s3_p") + f"""
<div class="pipwin" style="left:230px; top:200px; width:820px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">▣ ✕</span></div>
  <div class="pipwin-body" style="height:462px" id="b"></div>
</div>
<div class="note" style="left:236px; bottom:120px;">{t['s3_n']}</div>""" + FOOT.format(
        brand=t["brand"], script=(
            'document.getElementById("b").innerHTML = '
            "'<div class=\"videoish\"></div>' + bar() + "
            f"'<button class=\"sbskip\">{t['sbSkip']}</button>' + "
            "progress({pos:58, seg:[56,12]});"))

    titles = ";".join(
        f'r.push(`{t["s4_title"].format(i=i + 1)}`)' for i in range(6)
    )
    pages["04"] = HEAD.format(**t) + caption(t, "s4_h", "s4_p") + """
<div class="pipwin" style="left:230px; top:200px; width:820px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">▣ ✕</span></div>
  <div class="pipwin-body" style="height:462px" id="b"></div>
</div>""" + FOOT.format(brand=t["brand"], script=f"""
const grads = ["#3b4a63,#22293a","#5a3b52,#2c2030","#3d5a4a,#1f2e26","#5a4f3b,#302a20","#42375a,#241f30","#5a3b3b,#2e2020"];
const r = []; {titles};
const rows = grads.map((g,i) => `<button class="ytfp-related-item">
  <div class="thumb" style="background:linear-gradient(135deg, ${{g}})"></div>
  <span class="ytfp-related-title">${{r[i]}}</span></button>`).join("");
document.getElementById("b").innerHTML =
  '<div class="videoish"></div>' + bar() + progress({{pos:33}}) +
  `<div class="ytfp-related-root">
     <button class="ytfp-related-toggle ytfp-related-toggle--open">›</button>
     <div class="ytfp-related-panel ytfp-related-panel--open"><div class="ytfp-related-list">${{rows}}</div></div>
   </div>`;""")

    pages["05"] = HEAD.format(**t) + caption(t, "s5_h", "s5_p") + f"""
<div class="pipwin" style="left:460px; top:160px; width:368px;">
  <div class="pipwin-chrome">youtube.com<span class="spacer">▣ ✕</span></div>
  <div class="pipwin-body" style="height:556px" id="b"></div>
</div>
<div class="note" style="left:150px; top:330px;">{t['s5_n1']}</div>
<div class="note" style="right:150px; top:330px;">{t['s5_n2']}</div>""" + FOOT.format(
        brand=t["brand"], script=(
            'document.getElementById("b").innerHTML = '
            "'<div class=\"videoish\"></div>' + bar({narrow:true}) + nav() + progress({pos:47});"))

    return pages


for lang in TEXT:
    target = OUT / lang
    target.mkdir(parents=True, exist_ok=True)
    for name, html in build(lang).items():
        page = SHOTS / f"gen-{lang}-{name}.html"
        page.write_text(html)
        raw = SHOTS / f"raw-{lang}-{name}.png"
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--window-size=1280,800", f"--screenshot={raw}", f"file://{page}"],
                       capture_output=True)
        # 24-битный PNG без альфа-канала
        Image.open(raw).convert("RGB").save(target / f"{name}.png", format="PNG", optimize=True)
        print(f"{lang}/{name}.png")
