"""Генератор локализованных скриншотов для Chrome Web Store (1280x800)."""
import pathlib, subprocess, sys
from PIL import Image

SHOTS = pathlib.Path(__file__).parent
OUT = pathlib.Path(sys.argv[1])  # каталог назначения проекта
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Копируем актуальный pip.css перед рендером: макет обязан совпадать с продуктом.
import shutil
shutil.copy(
    "/Users/nickeo23/code_projects/Chrome_youtube_player/extension/pip/pip.css",
    SHOTS / "pip.css",
)

import json

LOCALES = pathlib.Path("/Users/nickeo23/code_projects/Chrome_youtube_player/extension/_locales")

def msg(lang, key, fallback=""):
    """Строка из настоящего messages.json нужного языка."""
    data = json.loads((LOCALES / lang / "messages.json").read_text())
    return data.get(key, {}).get("message", fallback)

TEXT = {
    "en": {
        "presetNormal": "Normal",
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
        "presetNormal": "Обычный",
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
        "presetNormal": "Normal",
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
        "presetNormal": "Normal",
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
        "presetNormal": "Normal",
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
        "presetNormal": "標準",
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
        "presetNormal": "Normal",
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
        "presetNormal": "Normal",
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

    "tr": {
        "presetNormal": "Normal",
        "sleepOff": "kapalı", "sbSkip": "Sponsor bölümünü atla → 12:34",
        "brand": "YouTube için Picture in Picture",
        "s1_h": "Çalışırken izlemeye devam edin",
        "s1_p": "YouTube oynatıcısı her zaman üstte duran bir pencereye geçer — video baştan başlamaz.",
        "s2_h": "Gerçekten gereken tüm kontroller",
        "s2_p": "A-B döngüsü, 0,25–3x hız, %0–300 ses, uyku zamanlayıcısı — tek panelde.",
        "s2_n1": "<b>A-B döngüsü</b>: istediğiniz bölümü tekrarlayın — A'ya tıkla, B'ye tıkla, temizlemek için tekrar tıkla.",
        "s2_n2": "<b>Ses %300'e kadar</b> — YouTube'un kendi azamisinden yüksek.",
        "s2_n3": "<b>Uyku zamanlayıcısı</b>: hazır değerler ya da kendi süreniz; sayarken arayüz gizlenir.",
        "s2_n4": "<b>±30 sn ve önceki/sonraki</b> videonun hemen altında.",
        "s3_h": "Sponsor bölümleri görünür ve atlanabilir",
        "s3_p": "SponsorBlock topluluğunun verisi video içindeki sponsor tanıtımlarını işaretler — tek tıkla geçin.",
        "s3_n": "Çubuktaki <b>yeşil bölüm</b> = sponsor tanıtımı.",
        "s4_h": "Sekmeye dönmeden video değiştirin",
        "s4_p": "Sağdaki ok önerilerinizi açar — sıradaki videoyu buradan seçin.",
        "s4_title": "Yüzen pencerede gösterilen {i}. önerilen videonun başlığı",
        "s5_h": "Shorts da — dikey ve otomatik",
        "s5_p": "«Beğen» üstündeki düğme Short'u çıkarır; bitince sıradaki kendiliğinden başlar.",
        "s5_n1": "<b>Sıkışık panel</b> dar pencereye göre ayarlı.",
        "s5_n2": "<b>◀ ▶</b> Shorts akışını pencereden gezdirir.",
    },
    "hi": {
        "presetNormal": "सामान्य",
        "sleepOff": "बंद", "sbSkip": "स्पॉन्सर हिस्सा छोड़ें → 12:34",
        "brand": "YouTube के लिए Picture in Picture",
        "s1_h": "काम करते हुए देखते रहिए",
        "s1_p": "YouTube का प्लेयर हमेशा ऊपर रहने वाली विंडो में चला जाता है — वीडियो दोबारा शुरू नहीं होता।",
        "s2_h": "वे सारे कंट्रोल जिनकी सच में ज़रूरत है",
        "s2_p": "A-B लूप, 0.25–3x स्पीड, 0–300% वॉल्यूम, स्लीप टाइमर — एक ही पैनल में।",
        "s2_n1": "<b>A-B लूप</b>: कोई भी हिस्सा दोहराएँ — A पर क्लिक, B पर क्लिक, हटाने के लिए फिर क्लिक।",
        "s2_n2": "<b>वॉल्यूम 300% तक</b> — YouTube की अपनी अधिकतम आवाज़ से ज़्यादा।",
        "s2_n3": "<b>स्लीप टाइमर</b>: तय मान या अपना; गिनती के दौरान इंटरफ़ेस छिपा रहता है।",
        "s2_n4": "<b>±30 सेकंड और पिछला/अगला</b> वीडियो के ठीक नीचे।",
        "s3_h": "स्पॉन्सर हिस्से दिखते हैं और छोड़े जा सकते हैं",
        "s3_p": "SponsorBlock समुदाय का डेटा वीडियो के भीतर के प्रोमो दिखाता है — एक क्लिक और आगे।",
        "s3_n": "प्रोग्रेस बार पर <b>हरा हिस्सा</b> = स्पॉन्सर प्रोमो।",
        "s4_h": "टैब पर लौटे बिना वीडियो बदलिए",
        "s4_p": "दाईं ओर का तीर सुझाव खोलता है — अगला वीडियो यहीं चुनिए।",
        "s4_title": "फ़्लोटिंग विंडो में दिखने वाले सुझाए गए वीडियो नंबर {i} का शीर्षक",
        "s5_h": "Shorts भी — खड़े और अपने आप",
        "s5_p": "«पसंद» के ऊपर का बटन Short निकालता है; ख़त्म होते ही अगला अपने आप चलता है।",
        "s5_n1": "<b>संक्षिप्त पैनल</b> पतली विंडो के अनुसार।",
        "s5_n2": "<b>◀ ▶</b> विंडो से ही Shorts फ़ीड आगे बढ़ाते हैं।",
    },
    "ko": {
        "presetNormal": "기본",
        "sleepOff": "끄기", "sbSkip": "스폰서 구간 건너뛰기 → 12:34",
        "brand": "YouTube용 Picture in Picture",
        "s1_h": "일하면서 계속 보세요",
        "s1_p": "YouTube 플레이어가 항상 위 창으로 옮겨갑니다 — 영상은 처음부터 다시 시작되지 않습니다.",
        "s2_h": "정말 필요한 모든 조작",
        "s2_p": "A-B 반복, 0.25~3배속, 음량 0~300%, 취침 타이머를 한 패널에.",
        "s2_n1": "<b>A-B 반복</b>: 원하는 구간을 반복 — A 클릭, B 클릭, 다시 클릭하면 해제.",
        "s2_n2": "<b>음량 최대 300%</b> — YouTube 자체 최대보다 크게.",
        "s2_n3": "<b>취침 타이머</b>: 기본값 또는 직접 입력; 작동 중에는 UI가 숨습니다.",
        "s2_n4": "<b>±30초와 이전/다음</b>이 영상 바로 아래에.",
        "s3_h": "스폰서 구간이 보이고 건너뛸 수 있습니다",
        "s3_p": "SponsorBlock 커뮤니티 데이터가 영상 속 광고를 표시합니다 — 클릭 한 번이면 끝.",
        "s3_n": "재생 바의 <b>초록 구간</b> = 스폰서 소개.",
        "s4_h": "탭으로 돌아가지 않고 영상 전환",
        "s4_p": "오른쪽 화살표가 추천 목록을 펼칩니다 — 다음 영상을 여기서 고르세요.",
        "s4_title": "플로팅 창 안에 표시되는 추천 영상 제목 {i}",
        "s5_h": "Shorts도 세로 화면으로 자동 재생",
        "s5_p": "「좋아요」 위 버튼이 Shorts를 꺼내고, 끝나면 다음이 자동으로 시작됩니다.",
        "s5_n1": "<b>간결한 패널</b>이 좁은 창에 맞습니다.",
        "s5_n2": "<b>◀ ▶</b>로 창에서 바로 Shorts 피드를 넘깁니다.",
    },
    "it": {
        "presetNormal": "Normale",
        "sleepOff": "off", "sbSkip": "Salta lo sponsor → 12:34",
        "brand": "Picture in Picture per YouTube",
        "s1_h": "Continua a guardare mentre lavori",
        "s1_p": "Il lettore YouTube passa in una finestra sempre in primo piano — la riproduzione non riparte.",
        "s2_h": "Tutti i comandi che servono davvero",
        "s2_p": "Loop A-B, velocità 0,25–3x, volume 0–300%, timer: in un solo pannello.",
        "s2_n1": "<b>Loop A-B</b>: ripeti qualsiasi passaggio — clic su A, clic su B, clic per azzerare.",
        "s2_n2": "<b>Volume fino al 300%</b> — più alto del massimo di YouTube.",
        "s2_n3": "<b>Timer</b>: valori pronti o il tuo; mentre conta l'interfaccia resta nascosta.",
        "s2_n4": "<b>±30 s e precedente/successivo</b> proprio sotto il video.",
        "s3_h": "Segmenti sponsorizzati visibili e saltabili",
        "s3_p": "I dati della comunità SponsorBlock segnalano gli inserti pubblicitari nel video — un clic e via.",
        "s3_n": "<b>Segmento verde</b> sulla barra = inserto sponsorizzato.",
        "s4_h": "Cambia video senza tornare alla scheda",
        "s4_p": "La freccia a destra apre i consigliati: scegli il prossimo proprio qui.",
        "s4_title": "Titolo del video consigliato numero {i} mostrato dentro la finestra flottante",
        "s5_h": "Anche gli Shorts — verticali e in sequenza",
        "s5_p": "Un pulsante sopra «Mi piace» estrae lo Short; alla fine parte da solo il successivo.",
        "s5_n1": "<b>Pannello compatto</b> adattato alla finestra stretta.",
        "s5_n2": "<b>◀ ▶</b> scorrono il feed Shorts dalla finestra.",
    },
    "pl": {
        "presetNormal": "Normalny",
        "sleepOff": "wył.", "sbSkip": "Pomiń sponsora → 12:34",
        "brand": "Picture in Picture dla YouTube",
        "s1_h": "Oglądaj dalej podczas pracy",
        "s1_p": "Odtwarzacz YouTube przenosi się do okna zawsze na wierzchu — wideo nie zaczyna się od nowa.",
        "s2_h": "Wszystkie potrzebne regulacje",
        "s2_p": "Pętla A-B, prędkość 0,25–3x, głośność 0–300%, wyłącznik czasowy — w jednym panelu.",
        "s2_n1": "<b>Pętla A-B</b>: powtórz dowolny fragment — kliknij A, kliknij B, kliknij by wyczyścić.",
        "s2_n2": "<b>Głośność do 300%</b> — więcej niż maksimum samego YouTube.",
        "s2_n3": "<b>Wyłącznik czasowy</b>: gotowe wartości albo własna; podczas odliczania interfejs znika.",
        "s2_n4": "<b>±30 s oraz poprzednie/następne</b> tuż pod wideo.",
        "s3_h": "Fragmenty sponsorowane widoczne i do pominięcia",
        "s3_p": "Dane społeczności SponsorBlock oznaczają wstawki reklamowe w filmie — jedno kliknięcie i dalej.",
        "s3_n": "<b>Zielony fragment</b> na pasku = wstawka sponsorska.",
        "s4_h": "Zmieniaj filmy bez wracania do karty",
        "s4_p": "Strzałka po prawej wysuwa propozycje — następny film wybierzesz tutaj.",
        "s4_title": "Tytuł proponowanego filmu numer {i} pokazany w oknie pływającym",
        "s5_h": "Shorts też — pionowo i automatycznie",
        "s5_p": "Przycisk nad «Lubię to» wysuwa Shorta; po zakończeniu następny startuje sam.",
        "s5_n1": "<b>Kompaktowy panel</b> dopasowany do wąskiego okna.",
        "s5_n2": "<b>◀ ▶</b> przewijają feed Shorts prosto z okna.",
    },
    "uk": {
        "presetNormal": "Звичайний",
        "sleepOff": "вимк.", "sbSkip": "Пропустити спонсора → 12:34",
        "brand": "Picture in Picture для YouTube",
        "s1_h": "Дивіться, поки працюєте",
        "s1_p": "Плеєр YouTube переїжджає у вікно поверх усіх вікон — відтворення не переривається.",
        "s2_h": "Усі потрібні регулятори в одній панелі",
        "s2_p": "A-B повтор, швидкість 0,25–3x, гучність 0–300%, таймер сну — за наведенням миші.",
        "s2_n1": "<b>A-B повтор</b> — зациклити фрагмент: клік A, клік B, клік — скидання.",
        "s2_n2": "<b>Гучність до 300%</b> — гучніше за максимум самого YouTube.",
        "s2_n3": "<b>Таймер сну</b> — пресети або власне значення; поки триває відлік, інтерфейс прихований.",
        "s2_n4": "<b>±30 с і поперед./наст.</b> просто під відео.",
        "s3_h": "Спонсорські вставки видно й можна пропустити",
        "s3_p": "Дані спільноти SponsorBlock підсвічують інтеграції всередині відео — клік перестрибує їх.",
        "s3_n": "<b>Зелений сегмент</b> на смузі прогресу — спонсорська вставка.",
        "s4_h": "Перемикайте відео, не виходячи з вікна",
        "s4_p": "Стрілка справа висуває колонку рекомендацій — наступний ролик обирається тут же.",
        "s4_title": "Назва рекомендованого відео номер {i}, показана просто в міні-вікні",
        "s5_h": "Shorts — вертикально та з автопереходом",
        "s5_p": "Кнопка над «вподобайкою» виносить Short; коли він завершується, вмикається наступний.",
        "s5_n1": "<b>Компактна панель</b> під вузьке вікно.",
        "s5_n2": "<b>◀ ▶</b> гортають стрічку Shorts просто з вікна.",
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
<script>window.L = {{ sleepOff: "{sleepOff}", presetNormal: "{presetNormal}", queueTitle: "{queueTitle}" }};</script>
"""

FOOT = """<div class="brandline">Float<b>Player</b> — {brand}</div>
<script src="parts.js"></script>
<script>{script}</script>
</div></body></html>"""


def caption(t, h, p):
    return f'<div class="caption"><h2>{t[h]}</h2><p>{t[p]}</p></div>'


def build(lang):
    t = dict(TEXT[lang])
    # перебиваем подписи интерфейса значениями из локалей расширения
    t["sleepOff"] = msg(lang, "sleepOff", t["sleepOff"])
    t["presetNormal"] = msg(lang, "presetOff", t.get("presetNormal", "Normal"))
    t["queueTitle"] = msg(lang, "queueTitle", "Queue")
    t["sbSkip"] = msg(lang, "sbSkip", "Skip sponsor segment") + " → 12:34"
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
const queueLabel = window.L.queueTitle; const r = []; {titles};
const rows = grads.map((g,i) => `<div class="ytfp-related-item">
  <div class="thumb" style="background:linear-gradient(135deg, ${{g}})"></div>
  <span class="ytfp-related-title">${{r[i]}}</span>
  <div class="ytfp-queue-add">+</div></div>`).join("");
const queued = grads.slice(0,2).map((g,i) => `<div class="ytfp-related-item ytfp-queue-item">
  <div class="thumb" style="background:linear-gradient(135deg, ${{g}})"></div>
  <span class="ytfp-related-title">${{r[i]}}</span></div>`).join("");
document.getElementById("b").innerHTML =
  '<div class="videoish"></div>' + bar() + progress({{pos:33}}) +
  `<div class="ytfp-related-root">
     <button class="ytfp-related-toggle ytfp-related-toggle--open">›</button>
     <div class="ytfp-related-panel ytfp-related-panel--open">
       <div class="ytfp-queue"><div class="ytfp-queue-header">${{queueLabel}}</div>
         <div class="ytfp-related-list">${{queued}}</div></div>
       <div class="ytfp-related-list">${{rows}}</div></div>
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
