"""Описания листинга: турецкий, хинди, корейский, итальянский, польский, украинский."""
import pathlib

OUT = pathlib.Path("/Users/nickeo23/code_projects/Chrome_youtube_player/store/descriptions")
OUT.mkdir(parents=True, exist_ok=True)

SHORT = {
"tr": "YouTube her zaman üstte: sade mini oynatıcı, otomatik Shorts, A-B döngüsü, hız ve %300'e kadar ses.",
"hi": "YouTube हमेशा सबसे ऊपर: साफ़ मिनी-प्लेयर, ऑटो Shorts, A-B लूप, स्पीड और 300% तक वॉल्यूम।",
"ko": "YouTube를 항상 위에: 군더더기 없는 미니 플레이어, Shorts 자동 재생, A-B 반복, 속도, 음량 300%.",
"it": "YouTube sempre in primo piano: mini-player pulito, Shorts automatici, loop A-B, velocità e volume fino al 300%.",
"pl": "YouTube zawsze na wierzchu: czysty mini-odtwarzacz, automatyczne Shorts, pętla A-B, prędkość i głośność do 300%.",
"uk": "YouTube поверх усіх вікон: чистий міні-плеєр, авто-Shorts, A-B повтор, швидкість і гучність до 300%.",
}

LONG = {
"tr": """FloatPlayer, YouTube'u her şeyin üstünde tutar. Oynatıcıdaki düğmeye tek tıklama
— ya da Alt+P — ve video, kendi kontrollerine sahip küçük bir pencereye geçer.
Kod yazın, e-postalara yanıt verin, tabloyu düzenleyin: video her uygulamanın
üstünde görünmeye devam eder.

Bu bir açılır pencere değil, gerçek bir Document Picture-in-Picture penceresidir.
Çalıştığınız pencerenin arkasına asla düşmez.


VİDEO BAŞTAN BAŞLAMAZ

Çoğu «PiP» eklentisi ham video dosyasıyla ikinci bir oynatıcı açar: kaldığınız
yeri, ayarlarınızı ve altyazıları kaybedersiniz.

FloatPlayer, YouTube oynatıcısının kendisini pencereye taşır. Aynı akış, aynı
saniye, zaten kullandığınız kalite, aynı altyazılar, oynatma listesindeki aynı
konum ve aynı izleme geçmişi. Pencereyi kapattığınızda oynatıcı sayfadaki tam
yerine geri döner. Hiçbir şey yeniden yüklenmez.

Reklamlar engellenmez ve atlanmaz: eklenti YouTube'un kurallarına uyar.


YERLEŞİK PICTURE-IN-PICTURE'IN YAPAMADIKLARI

Chrome'un yerleşik PiP'i yalnızca bir oynat düğmesi sunar. FloatPlayer gerçekten
eksik olanları ekler:

- ileri geri sarma: çubuğa tıklama ve sürükleme, video üzerinde ±10 sn bölgeleri,
  altında ±30 sn düğmeleri
- 0,25x ile 3x arası hız, kaydırıcıyla
- %0 ile %300 arası ses: sessizlikten YouTube'un kendi azamisinin üç katına
  kadar, kısık kaydedilmiş videolar için
- bir cümleyi, bir riff'i ya da bir hareketi çalışmak için A-B döngüsü
- videoyu gerçekten duraklatan uyku zamanlayıcısı, 12 saate kadar
- bağlantıyı kopyalama, önceki ve sonraki video, açılır sütunda 20 öneriye kadar
- yerleşik PiP'in hiç ele almadığı Shorts desteği
- içinde YouTube arayüzü bulunmayan, gerçekten sade bir pencere

Fareyi oynatana kadar her şey gizlidir; yani çoğu zaman yalnızca videoyu
görürsünüz. Reklam oynarken ayrı bir beyaz şerit ne kadar kaldığını gösterir,
kırmızı olan ise gerçek konumunuzda donar.


SPONSOR BÖLÜMLERİ GÖRÜNÜR VE ATLANABİLİR

Açık olalım: YouTube'un kendi reklamlarına dokunulmaz. Bu, içerik üreticisinin
videoya kendi eklediği sponsor bölümleriyle ilgilidir.

SponsorBlock topluluğunun bildirdiği bölümler çubukta yeşil görünür ve içindeyken
«Sponsor bölümünü atla» düğmesi çıkar. sponsor.ajay.app adresine yalnızca video
kimliği gönderilir — sizinle ilgili hiçbir şey — ve özellik kapatılabilir.


SHORTS, GERÇEKTEN DESTEKLENİYOR

«Beğen» düğmesinin üstündeki özel düğme, Short'u 9:16 dikey bir pencerede açar;
siyah bant ve kırpma yok. Bittiğinde sıradaki kendiliğinden başlar, alttaki oklar
akışı doğrudan pencereden gezdirir.


PENCERE BEKLEDİĞİNİZ GİBİ DAVRANIR

Herhangi bir yerinden sürükleyin: videonun üstünde basılı tutup hareket ettirin —
düğmeler tıklanabilir kalır. Pencere videonun tam en-boy oranında açılır, elle
boyutlandırdıktan sonra o orana geri döner ve boyutu yatay videolar ile dikey
Shorts için ayrı ayrı hatırlar.

Yalnızca video, garanti: penceredeki YouTube arayüzü, videoya, altyazılara ve
yükleme göstergesine izin veren bir beyaz listeyle kaldırılır — başka hiçbir şeye.


KISAYOLLAR VE AYARLAR

Herhangi bir Chrome penceresinden: Alt+P açar veya kapatır (Mac'te ⌥P), Alt+K
duraklatır, Alt+J ve Alt+L 5 saniye atlar. Pencerede: boşluk veya K duraklatır,
oklar 5 saniye atlar, M sesi keser. Tümü chrome://extensions/shortcuts adresinden
değiştirilebilir.

Ayarlar pencere stilini, otomatik PiP'i, SponsorBlock'u, atlama adımını, Shorts
otomatik geçişini, sıkışık paneli, hız adımını, ses üst sınırını ve dili kapsar.
Değişiklikler anında uygulanır.


GİZLİLİK

Hesap yok, oturum açma yok, izleme yok, analitik yok, reklam yok. Hiçbir şey
toplanmaz ve gönderilmez; tek istisna, yalnızca o özelliği açık bıraktığınız
sürece SponsorBlock için gönderilen video kimliğidir.


DÜRÜST SINIRLAR

- Chrome 116 veya üzeri gerekir; daha eski sürümlerde yerleşik PiP'e düşülür.
- Sitenin adresini taşıyan ince Chrome şeridi kaldırılamaz: her Document PiP
  penceresi için kimlik avına karşı bir gerekliliktir. İmleç uzaklaşınca kendi
  kendine gizlenir, «sade video» modunda ise hiç yoktur.
- Saydamlık ve tıklamanın geçmesi Chrome API'sinde mevcut değildir.
- Tarayıcı başına tek PiP penceresi ve konumu programla belirlenemez — ikisi de
  tarayıcı sınırıdır.
- YouTube reklamları sırasında sarma çalışmaz: o anda ana video yüklü değildir.""",

"hi": """FloatPlayer यूट्यूब को बाकी सब चीज़ों के ऊपर रखता है। प्लेयर के बटन पर एक क्लिक —
या Alt+P — और वीडियो अपने कंट्रोल के साथ एक छोटी-सी विंडो में चला जाता है, जो
हमेशा सबसे ऊपर रहती है। कोड लिखिए, ईमेल का जवाब दीजिए, स्प्रेडशीट संभालिए: वीडियो
हर ऐप्लिकेशन के ऊपर दिखता रहता है।

यह असली Document Picture-in-Picture विंडो है, कोई पॉपअप नहीं। जिस विंडो में आप काम
कर रहे हैं, यह कभी उसके पीछे नहीं जाती।


वीडियो दोबारा शुरू नहीं होता

ज़्यादातर «PiP» एक्सटेंशन कच्ची वीडियो फ़ाइल के साथ दूसरा प्लेयर खोलते हैं: आप
अपनी जगह, अपनी सेटिंग्स और सबटाइटल खो देते हैं।

FloatPlayer यूट्यूब के असली प्लेयर को ही विंडो में ले जाता है। वही स्ट्रीम, वही
सेकंड, वही क्वालिटी जो पहले से थी, वही सबटाइटल, प्लेलिस्ट में वही जगह और वही
हिस्ट्री। विंडो बंद करते ही प्लेयर पेज पर ठीक अपनी जगह लौट आता है। कुछ भी दोबारा
लोड नहीं होता।

विज्ञापन न ब्लॉक किए जाते हैं, न छोड़े जाते हैं: एक्सटेंशन यूट्यूब के नियमों से चलता है।


बिल्ट-इन पिक्चर-इन-पिक्चर जो नहीं कर पाता

Chrome का अपना PiP सिर्फ़ एक प्ले बटन देता है। FloatPlayer वही जोड़ता है जिसकी
सच में कमी है:

- आगे-पीछे जाना: बार पर क्लिक या ड्रैग, वीडियो पर ±10 सेकंड के ज़ोन, नीचे ±30
  सेकंड के बटन
- 0.25x से 3x तक स्पीड, स्लाइडर से
- 0 से 300% तक वॉल्यूम: बिल्कुल शांत से लेकर यूट्यूब की अपनी अधिकतम आवाज़ से तीन
  गुना तक — धीमी रिकॉर्ड हुई वीडियो के लिए
- किसी वाक्य, रिफ़ या स्टेप का अभ्यास करने के लिए A-B लूप
- स्लीप टाइमर जो सचमुच वीडियो रोक देता है, 12 घंटे तक
- लिंक कॉपी, पिछला और अगला वीडियो, और खुलने वाले कॉलम में 20 तक सुझाव
- Shorts सपोर्ट, जिसे बिल्ट-इन PiP छूता तक नहीं
- वाक़ई साफ़ विंडो, जिसमें यूट्यूब का इंटरफ़ेस नहीं होता

जब तक आप माउस नहीं हिलाते, सब कुछ छिपा रहता है — यानी ज़्यादातर समय सिर्फ़ वीडियो
दिखता है। विज्ञापन के दौरान अलग सफ़ेद पट्टी बताती है कि कितना बचा है, और लाल पट्टी
आपकी असली जगह पर रुकी रहती है।


स्पॉन्सर हिस्से दिखते भी हैं और छोड़े भी जा सकते हैं

स्पष्ट कर दें: यूट्यूब के अपने विज्ञापनों को छुआ नहीं जाता। बात उन प्रोमो की है
जिन्हें क्रिएटर ख़ुद वीडियो में जोड़ता है।

SponsorBlock समुदाय द्वारा बताए गए हिस्से बार पर हरे दिखते हैं, और उनके भीतर
«स्पॉन्सर हिस्सा छोड़ें» बटन आता है। sponsor.ajay.app को सिर्फ़ वीडियो ID भेजी
जाती है — आपके बारे में कुछ नहीं — और यह सुविधा बंद की जा सकती है।


SHORTS, पूरी तरह से

«पसंद» बटन के ऊपर एक अलग बटन Short को 9:16 वाली खड़ी विंडो में खोलता है — न काली
पट्टियाँ, न कटाई। ख़त्म होते ही अगला अपने आप शुरू होता है, और नीचे के तीर विंडो से
ही फ़ीड आगे बढ़ाते हैं।


विंडो वैसे ही चलती है जैसी उम्मीद है

इसे कहीं से भी खींचिए: वीडियो पर दबाए रखकर हिलाइए — बटन तब भी दबते रहते हैं। विंडो
वीडियो के सटीक अनुपात में खुलती है, हाथ से आकार बदलने के बाद उसी अनुपात में लौटती
है, और आकार क्षैतिज वीडियो तथा खड़ी Shorts के लिए अलग-अलग याद रखती है।

सिर्फ़ वीडियो, गारंटी के साथ: विंडो के भीतर यूट्यूब का इंटरफ़ेस एक श्वेत-सूची से
हटाया जाता है जो सिर्फ़ वीडियो, सबटाइटल और लोडिंग संकेत को रहने देती है।


शॉर्टकट और सेटिंग्स

किसी भी Chrome विंडो से: Alt+P खोलता या बंद करता है (Mac पर ⌥P), Alt+K रोकता है,
Alt+J और Alt+L 5 सेकंड कूदते हैं। विंडो के भीतर: स्पेस या K रोकता है, तीर 5 सेकंड
कूदते हैं, M आवाज़ बंद करता है। सब कुछ chrome://extensions/shortcuts पर बदला जा
सकता है।

सेटिंग्स में विंडो की शैली, ऑटो-PiP, SponsorBlock, स्किप की अवधि, Shorts का
ऑटो-प्ले, संक्षिप्त पैनल, स्पीड का चरण, अधिकतम वॉल्यूम और भाषा शामिल हैं। बदलाव
तुरंत लागू होते हैं।


निजता

न खाते, न लॉगिन, न ट्रैकिंग, न एनालिटिक्स, न विज्ञापन। कुछ भी इकट्ठा नहीं किया
जाता और कहीं नहीं भेजा जाता — सिवाय SponsorBlock के लिए वीडियो ID के, और वह भी
तभी तक जब तक आप वह सुविधा चालू रखते हैं।


ईमानदार सीमाएँ

- Chrome 116 या नया चाहिए; पुराने संस्करणों में बिल्ट-इन PiP चलेगा।
- साइट का पता दिखाने वाली Chrome की पतली पट्टी हटाई नहीं जा सकती: यह हर Document
  PiP विंडो के लिए फ़िशिंग-रोधी शर्त है। कर्सर हटते ही वह ख़ुद छिप जाती है, और
  «सिर्फ़ वीडियो» मोड में वह होती ही नहीं।
- पारदर्शिता और क्लिक-थ्रू Chrome API में उपलब्ध नहीं हैं।
- हर ब्राउज़र में एक ही PiP विंडो, और उसकी जगह प्रोग्राम से तय नहीं की जा सकती —
  दोनों ब्राउज़र की सीमाएँ हैं।
- यूट्यूब के विज्ञापनों के दौरान आगे-पीछे नहीं जाया जा सकता: उस समय मुख्य वीडियो
  लोड ही नहीं होता।""",

"ko": """FloatPlayer는 YouTube를 항상 맨 앞에 둡니다. 플레이어의 버튼을 한 번 클릭하거나
Alt+P를 누르면, 영상이 자체 조작 패널을 갖춘 작은 항상 위 창으로 옮겨갑니다.
코드를 쓰든, 메일에 답하든, 스프레드시트를 다루든 영상은 어떤 앱 위에서도 계속
보입니다.

이것은 팝업이 아니라 진짜 Document Picture-in-Picture 창입니다. 작업 중인 창 뒤로
밀려나는 일이 없습니다.


영상이 처음부터 다시 시작되지 않습니다

대부분의 「PiP」 확장 프로그램은 원본 영상 파일로 두 번째 플레이어를 엽니다. 보던
위치도, 설정도, 자막도 사라집니다.

FloatPlayer는 YouTube 플레이어 자체를 창으로 옮깁니다. 같은 스트림, 같은 시점,
이미 쓰던 화질, 같은 자막, 재생목록의 같은 위치, 같은 시청 기록. 창을 닫으면
플레이어는 페이지의 원래 자리로 그대로 돌아갑니다. 다시 로드되지 않습니다.

광고는 차단하지도 건너뛰지도 않습니다. 이 확장 프로그램은 YouTube의 규칙을
지킵니다.


기본 PiP가 하지 못하는 것

Chrome 기본 PiP에는 재생 버튼밖에 없습니다. FloatPlayer는 정말 필요한 것들을
더합니다.

- 탐색: 진행 바 클릭과 드래그, 영상 위 ±10초 영역, 그 아래 ±30초 버튼
- 0.25배속에서 3배속까지 슬라이더
- 음량 0~300%: 무음부터 YouTube 자체 최대의 세 배까지, 작게 녹음된 영상에 유용
- 문장이나 리프, 동작을 연습하기 위한 A-B 반복
- 실제로 영상을 일시정지하는 취침 타이머(최대 12시간)
- 링크 복사, 이전·다음 영상, 슬라이드로 열리는 최대 20개의 추천 목록
- 기본 PiP가 아예 지원하지 않는 Shorts
- YouTube UI가 전혀 들어오지 않는 진짜 깔끔한 창

마우스를 움직이기 전까지는 모두 숨겨져 있어, 대부분의 시간에는 영상만 보입니다.
광고가 재생되는 동안에는 별도의 흰색 막대가 남은 분량을 보여 주고, 빨간 막대는
실제 시청 위치에 멈춰 있습니다.


스폰서 구간, 보이고 건너뛸 수 있습니다

분명히 해 두자면 YouTube 자체 광고는 건드리지 않습니다. 여기서 말하는 것은
크리에이터가 영상 안에 직접 넣은 스폰서 소개입니다.

SponsorBlock 커뮤니티가 표시한 구간은 진행 바에 초록색으로 나타나고, 그 구간
안에서는 「스폰서 구간 건너뛰기」 버튼이 보입니다. sponsor.ajay.app으로 전송되는
것은 영상 ID뿐이며, 사용자에 관한 정보는 전혀 보내지 않습니다. 기능은 끌 수
있습니다.


Shorts도 제대로

「좋아요」 위의 전용 버튼이 Shorts를 9:16 세로 창으로 꺼냅니다. 검은 여백도 잘림도
없습니다. 재생이 끝나면 다음 영상이 자동으로 시작되고, 아래쪽 화살표로 창에서
바로 피드를 넘길 수 있습니다.


창은 기대한 대로 움직입니다

어디를 잡아도 옮길 수 있습니다. 영상 위에서 누른 채 움직이면 되고, 버튼은 그대로
눌립니다. 창은 영상의 정확한 비율로 열리고, 손으로 크기를 바꿔도 그 비율로
돌아오며, 가로 영상과 세로 Shorts의 크기를 따로 기억합니다.

영상만 보이는 것을 보장합니다. 창 안의 YouTube UI는 영상과 자막, 로딩 표시만
허용하는 화이트리스트로 제거됩니다.


단축키와 설정

어떤 Chrome 창에서든: Alt+P로 열고 닫기(Mac은 ⌥P), Alt+K로 일시정지, Alt+J와
Alt+L로 5초 이동. 창 안에서는 스페이스나 K로 일시정지, 화살표로 5초 이동, M으로
음소거. 모두 chrome://extensions/shortcuts에서 변경할 수 있습니다.

설정에서는 창 스타일, 자동 PiP, SponsorBlock, 건너뛰기 간격, Shorts 자동 재생,
간결한 패널, 속도 간격, 최대 음량, 언어를 고를 수 있습니다. 변경은 즉시
반영됩니다.


개인정보

계정도 로그인도 추적도 분석도 광고도 없습니다. 아무것도 수집하지 않고 어디에도
보내지 않습니다. 예외는 SponsorBlock을 위한 영상 ID뿐이며, 그 기능을 켜 둔 동안에
한합니다.


솔직한 한계

- Chrome 116 이상이 필요하며, 이전 버전에서는 기본 PiP로 대체됩니다.
- 사이트 주소가 표시되는 Chrome의 얇은 막대는 제거할 수 없습니다. 모든 Document
  PiP 창에 적용되는 피싱 방지 요건입니다. 커서가 멀어지면 스스로 사라지고,
  「영상만」 모드에는 아예 없습니다.
- 투명도와 클릭 통과는 Chrome API에서 제공하지 않습니다.
- 브라우저당 PiP 창은 하나이며 위치는 프로그램으로 지정할 수 없습니다. 둘 다
  브라우저의 제약입니다.
- YouTube 광고 중에는 탐색이 되지 않습니다. 그 순간에는 본 영상이 로드되어 있지
  않기 때문입니다.""",

"it": """FloatPlayer tiene YouTube sopra tutto il resto. Un clic sul pulsante nel lettore
— o Alt+P — e il video passa in una piccola finestra sempre in primo piano, con
i suoi comandi. Scrivi codice, rispondi alle mail, sistema un foglio di calcolo:
il video resta visibile sopra qualsiasi applicazione.

È una vera finestra Document Picture-in-Picture, non un popup. Non finisce mai
dietro la finestra in cui stai lavorando.


IL VIDEO NON RIPARTE DA CAPO

La maggior parte delle estensioni «PiP» apre un secondo lettore con il file
video: perdi il punto in cui eri, le tue impostazioni e i sottotitoli.

FloatPlayer sposta nella finestra il lettore YouTube vero e proprio. Stesso
flusso, stesso secondo, la qualità che avevi già, gli stessi sottotitoli, la
stessa posizione nella playlist e la stessa cronologia. Chiudendo la finestra il
lettore torna nella pagina esattamente dov'era. Nulla si ricarica.

Le pubblicità non vengono bloccate né saltate: l'estensione rispetta le regole di
YouTube.


COSA NON SA FARE IL PICTURE-IN-PICTURE NATIVO

Il PiP integrato di Chrome offre un pulsante di riproduzione e nient'altro.
FloatPlayer aggiunge ciò che manca davvero:

- lo spostamento nel tempo: clic o trascinamento sulla barra, zone da ±10 s sul
  video, pulsanti da ±30 s sotto di esso
- velocità da 0,25x a 3x con un cursore
- volume da 0 a 300%: dal silenzio fino a tre volte il massimo di YouTube,
  utile per i video registrati bassi
- loop A-B per esercitarsi su una frase, un riff o un passo di danza
- un timer che mette davvero in pausa il video, fino a 12 ore
- copia del link, video precedente e successivo e fino a 20 consigliati in una
  colonna a scomparsa
- il supporto agli Shorts, che il PiP nativo non gestisce affatto
- una finestra davvero pulita, senza interfaccia di YouTube all'interno

Tutto resta nascosto finché non muovi il mouse, quindi quasi sempre vedi solo il
video. Durante una pubblicità una barra bianca separata mostra quanto ne resta e
quella rossa si congela sulla tua posizione reale.


SEGMENTI SPONSORIZZATI VISIBILI E SALTABILI

Per essere chiari: le pubblicità di YouTube non vengono toccate. Si parla degli
inserti sponsorizzati che il creator monta dentro al video.

I segmenti segnalati dalla comunità SponsorBlock diventano verdi sulla barra e
al loro interno compare il pulsante «Salta lo sponsor». A sponsor.ajay.app viene
inviato solo l'ID del video — nulla che ti riguardi — e la funzione si può
disattivare.


SHORTS, SUPPORTATI SUL SERIO

Un pulsante dedicato sopra «Mi piace» apre lo Short in una finestra verticale
9:16, senza bande nere né ritagli. Quando finisce parte da solo il successivo, e
le frecce in basso scorrono il feed direttamente dalla finestra.


LA FINESTRA SI COMPORTA COME TI ASPETTI

Trascinala da qualsiasi punto: tieni premuto sul video e muovi — i pulsanti
restano cliccabili. Si apre nelle proporzioni esatte del video, ci torna dopo un
ridimensionamento manuale e ricorda le dimensioni separatamente per i video
orizzontali e per gli Shorts verticali.

Solo video, garantito: l'interfaccia di YouTube dentro la finestra viene rimossa
da una lista bianca che lascia passare il video, i sottotitoli e l'indicatore di
caricamento, e nient'altro.


SCORCIATOIE E IMPOSTAZIONI

Da qualunque finestra di Chrome: Alt+P apre o chiude (⌥P su Mac), Alt+K mette in
pausa, Alt+J e Alt+L saltano di 5 secondi. Nella finestra: spazio o K per la
pausa, frecce per 5 secondi, M per il muto. Tutto riassegnabile su
chrome://extensions/shortcuts.

Le impostazioni coprono stile della finestra, PiP automatico, SponsorBlock, passo
dell'avanzamento, Shorts automatici, pannello compatto, passo della velocità,
volume massimo e lingua. Le modifiche si applicano subito.


PRIVACY

Nessun account, nessun accesso, nessun tracciamento, nessuna analitica, nessuna
pubblicità. Non viene raccolto nulla e non viene inviato nulla, tranne l'ID del
video per SponsorBlock e solo finché lasci attiva quella funzione.


LIMITI DICHIARATI

- Serve Chrome 116 o successivo; sulle versioni precedenti si ripiega sul PiP
  nativo.
- La sottile striscia di Chrome con l'indirizzo del sito non è rimovibile: è un
  requisito antiphishing per ogni finestra Document PiP. Si nasconde da sola
  quando il cursore si allontana, e la modalità «solo video» non ce l'ha.
- Trasparenza e clic passante non esistono nell'API di Chrome.
- Una sola finestra PiP per browser, e la sua posizione non è impostabile da
  programma: sono limiti del browser.
- Durante le pubblicità di YouTube non si può spostare la riproduzione: in quel
  momento il video principale non è caricato.""",

"pl": """FloatPlayer trzyma YouTube nad wszystkim innym. Jedno kliknięcie przycisku w
odtwarzaczu — albo Alt+P — i wideo przenosi się do małego okna zawsze na
wierzchu, z własnymi przyciskami. Pisz kod, odpowiadaj na maile, poprawiaj
arkusz: obraz pozostaje widoczny nad każdą aplikacją.

To prawdziwe okno Document Picture-in-Picture, a nie popup. Nigdy nie chowa się
za oknem, w którym pracujesz.


WIDEO NIE ZACZYNA SIĘ OD NOWA

Większość rozszerzeń «PiP» otwiera drugi odtwarzacz z surowym plikiem wideo:
tracisz miejsce, w którym byłeś, swoje ustawienia i napisy.

FloatPlayer przenosi do okna sam odtwarzacz YouTube. Ten sam strumień, ta sama
sekunda, jakość, którą już miałeś, te same napisy, to samo miejsce na playliście
i ta sama historia. Po zamknięciu okna odtwarzacz wraca na stronę dokładnie tam,
gdzie był. Nic się nie przeładowuje.

Reklamy nie są blokowane ani pomijane: rozszerzenie gra według zasad YouTube.


CZEGO NIE POTRAFI WBUDOWANY PICTURE-IN-PICTURE

Wbudowany PiP w Chrome daje przycisk odtwarzania i nic więcej. FloatPlayer
dokłada to, czego naprawdę brakuje:

- przewijanie: kliknięcie i przeciąganie po pasku, strefy ±10 s na samym wideo,
  przyciski ±30 s pod nim
- prędkość od 0,25x do 3x na suwaku
- głośność od 0 do 300%: od ciszy po trzykrotność maksimum samego YouTube, w sam
  raz do cicho nagranych filmów
- pętla A-B do ćwiczenia frazy, riffu albo kroku
- wyłącznik czasowy, który naprawdę wstrzymuje wideo, do 12 godzin
- kopiowanie linku, poprzedni i następny film oraz do 20 propozycji w wysuwanej
  kolumnie
- obsługa Shorts, której wbudowany PiP w ogóle nie ma
- naprawdę czyste okno, bez interfejsu YouTube w środku

Wszystko jest ukryte, dopóki nie ruszysz myszą, więc przez większość czasu
widzisz tylko obraz. W trakcie reklamy osobny biały pasek pokazuje, ile jej
zostało, a czerwony zatrzymuje się na twojej prawdziwej pozycji.


FRAGMENTY SPONSOROWANE WIDOCZNE I DO POMINIĘCIA

Dla jasności: reklam samego YouTube rozszerzenie nie rusza. Chodzi o wstawki
sponsorskie, które twórca sam montuje w filmie.

Fragmenty zgłoszone przez społeczność SponsorBlock są zaznaczone na zielono na
pasku, a w ich obrębie pojawia się przycisk «Pomiń sponsora». Do
sponsor.ajay.app trafia wyłącznie identyfikator filmu — nic o tobie — a całą
funkcję można wyłączyć.


SHORTS, PORZĄDNIE OBSŁUŻONE

Osobny przycisk nad «Lubię to» otwiera Shorta w pionowym oknie 9:16, bez czarnych
pasów i bez przycinania. Gdy się kończy, następny startuje sam, a dolne strzałki
przewijają feed prosto z okna.


OKNO ZACHOWUJE SIĘ TAK, JAK SIĘ SPODZIEWASZ

Przeciągaj je z dowolnego miejsca: przytrzymaj na wideo i przesuń — przyciski
nadal da się klikać. Okno otwiera się w dokładnych proporcjach filmu, wraca do
nich po ręcznej zmianie rozmiaru i zapamiętuje wielkość osobno dla filmów
poziomych i pionowych Shorts.

Tylko wideo, gwarantowane: interfejs YouTube wewnątrz okna usuwa biała lista,
która przepuszcza obraz, napisy i wskaźnik ładowania — i nic poza tym.


SKRÓTY I USTAWIENIA

Z dowolnego okna Chrome: Alt+P otwiera i zamyka (⌥P na Macu), Alt+K wstrzymuje,
Alt+J i Alt+L przeskakują o 5 sekund. W oknie: spacja lub K wstrzymuje, strzałki
przeskakują o 5 sekund, M wycisza. Wszystko można zmienić na stronie
chrome://extensions/shortcuts.

Ustawienia obejmują styl okna, auto-PiP, SponsorBlock, krok przewijania,
automatyczne Shorts, kompaktowy panel, krok prędkości, limit głośności i język.
Zmiany działają od razu.


PRYWATNOŚĆ

Bez kont, bez logowania, bez śledzenia, bez analityki, bez reklam. Nic nie jest
zbierane i nic nie jest wysyłane, poza identyfikatorem filmu na potrzeby
SponsorBlock — i tylko dopóki zostawisz tę funkcję włączoną.


UCZCIWE OGRANICZENIA

- Wymaga Chrome 116 lub nowszego; na starszych wersjach zadziała wbudowany PiP.
- Cienkiego paska Chrome z adresem witryny nie da się usunąć: to wymóg
  antyphishingowy dla każdego okna Document PiP. Chowa się sam, gdy kursor
  odjedzie, a tryb «samo wideo» nie ma go wcale.
- Przezroczystości i klikania na wylot nie ma w API Chrome.
- Jedno okno PiP na przeglądarkę, a jego pozycji nie da się ustawić programowo —
  to ograniczenia przeglądarki.
- W trakcie reklam YouTube przewijanie nie działa: główny film nie jest wtedy
  wczytany.""",

"uk": """FloatPlayer тримає YouTube поверх усього іншого. Один клік по кнопці в плеєрі —
або Alt+P — і відео переїжджає в маленьке вікно поверх усіх вікон із власними
елементами керування. Пишіть код, розбирайте пошту, правте таблицю: відео
лишається на видноті поверх будь-якої програми.

Це справжнє вікно Document Picture-in-Picture, а не popup. Воно ніколи не
провалюється за те вікно, у якому ви працюєте.


ВІДЕО НЕ ПОЧИНАЄТЬСЯ СПОЧАТКУ

Більшість «PiP»-розширень відкривають другий плеєр із сирим відеофайлом: ви
втрачаєте місце, на якому зупинилися, свої налаштування й субтитри.

FloatPlayer переносить у вікно сам плеєр YouTube. Той самий потік, та сама
секунда, та якість, що вже була, ті самі субтитри, те саме місце в плейлисті й
та сама історія переглядів. Закриваєте вікно — плеєр повертається на сторінку
рівно туди, де стояв. Нічого не перезавантажується.

Рекламу не блокуємо і не пропускаємо: розширення грає за правилами YouTube.


ЧОГО НЕ ВМІЄ ВБУДОВАНИЙ PICTURE-IN-PICTURE

Штатний PiP у Chrome дає кнопку паузи й більше нічого. FloatPlayer додає те,
чого справді бракує:

- перемотування: клік і перетягування по смузі, зони ±10 с на самому відео,
  кнопки ±30 с під ним
- швидкість від 0,25x до 3x повзунком
- гучність від 0 до 300%: від тиші до втричі гучніше за максимум самого YouTube,
  для тихо записаних роликів
- A-B повтор, щоб відпрацювати фразу, риф чи рух
- таймер сну, який справді ставить відео на паузу, до 12 годин
- копіювання посилання, перехід до попереднього й наступного відео та до 20
  рекомендацій у висувній колонці
- підтримка Shorts, за які штатний PiP узагалі не береться
- по-справжньому чисте вікно без інтерфейсу YouTube усередині

Усе приховане, доки ви не рухаєте мишею, тож майже весь час видно лише відео.
Поки триває реклама, окрема біла смужка показує, скільки її лишилося, а червона
завмирає на вашій справжній позиції.


СПОНСОРСЬКІ ВСТАВКИ ВИДНО, І ЇХ МОЖНА ПРОПУСТИТИ

Одразу застереження: рекламу самого YouTube розширення не чіпає. Ідеться про
спонсорські вставки, які автор вмонтував у відео.

Сегменти, розмічені спільнотою SponsorBlock, підсвічуються зеленим на смузі
прогресу, а всередині з'являється кнопка «Пропустити спонсора». На
sponsor.ajay.app надсилається лише ID відео — нічого про вас — і всю функцію
можна вимкнути.


SHORTS — ПОВНОЦІННО

Окрема кнопка над «вподобайкою» відкриває Short у вертикальному вікні 9:16 —
без чорних полів і без обрізання. Ролик завершився — сам вмикається наступний,
а нижні стрілки гортають стрічку просто з вікна.


ВІКНО ПОВОДИТЬСЯ ТАК, ЯК ВИ ОЧІКУЄТЕ

Тягніть його за будь-яке місце: затиснули мишу на відео й повели — кнопки при
цьому лишаються клікабельними. Вікно відкривається точно в пропорціях відео,
повертається до них після ручного розтягування й запам'ятовує розмір окремо для
горизонтальних відео та вертикальних Shorts.

Лише відео, гарантовано: інтерфейс YouTube усередині вікна прибрано «білим
списком», який пропускає відео, субтитри та індикатор завантаження — і більше
нічого.


ГАРЯЧІ КЛАВІШІ ТА НАЛАШТУВАННЯ

З будь-якого вікна Chrome: Alt+P відкриває й закриває (⌥P на Mac), Alt+K ставить
паузу, Alt+J та Alt+L перемотують на 5 секунд. Усередині вікна: пробіл або K —
пауза, стрілки — 5 секунд, M — звук. Усе перепризначається на сторінці
chrome://extensions/shortcuts.

Налаштування охоплюють стиль вікна, авто-PiP, SponsorBlock, крок перемотування,
автоперехід Shorts, компактні панелі, крок швидкості, максимальну гучність і
мову. Зміни застосовуються одразу.


КОНФІДЕНЦІЙНІСТЬ

Ні акаунтів, ні входу, ні стеження, ні аналітики, ні реклами. Нічого не
збирається й нікуди не надсилається, окрім ID відео для SponsorBlock — і лише
доки ця функція увімкнена.


ЧЕСНІ ОБМЕЖЕННЯ

- Потрібен Chrome 116 або новіший; на старіших буде штатний PiP.
- Тонку смужку Chrome з адресою сайту прибрати не можна: це антифішингова вимога
  для будь-якого вікна Document PiP. Вона сама зникає, коли курсор іде, а в
  режимі «лише відео» її немає взагалі.
- Прозорості та кліку крізь вікно в Chrome API немає.
- Одне PiP-вікно на браузер, і позицію вікна не можна задати програмно — це
  обмеження браузера.
- Під час реклами YouTube перемотування не працює: основне відео в цей момент не
  завантажене.""",
}

for lang, text in LONG.items():
    (OUT / f"{lang}.txt").write_text(text.strip() + "\n")
    short = SHORT[lang]
    (OUT / f"{lang}-short.txt").write_text(short + "\n")
    flag = "OK" if len(short) <= 132 else "СЛИШКОМ ДЛИННО"
    print(f"{lang:6} описание {len(text):5} симв. | краткое {len(short):3}/132 {flag}")
