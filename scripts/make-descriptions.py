"""Описания для листинга Chrome Web Store на шести языках."""
import pathlib

OUT = pathlib.Path("/Users/nickeo23/code_projects/Chrome_youtube_player/store/descriptions")
OUT.mkdir(parents=True, exist_ok=True)

SHORT = {
"es": "YouTube siempre visible: mini-reproductor limpio, Shorts automáticos, bucle A-B, velocidad y volumen hasta 300 %.",
"pt_BR": "YouTube sempre à frente: mini player limpo, Shorts automáticos, repetição A-B, velocidade e volume até 300%.",
"de": "YouTube immer im Vordergrund: schlanker Mini-Player, Shorts automatisch, A-B-Schleife, Tempo, Lautstärke bis 300 %.",
"ja": "YouTubeを常に最前面に。余計な表示のないミニプレーヤー、ショート自動再生、A-Bリピート、速度、音量300%。",
"fr": "YouTube toujours au premier plan : mini-lecteur épuré, Shorts enchaînés, boucle A-B, vitesse, volume jusqu'à 300 %.",
"id": "YouTube selalu di atas: pemutar mini yang bersih, Shorts otomatis, pengulangan A-B, kecepatan, volume 300%.",
}

LONG = {
"es": """FloatPlayer mantiene YouTube por encima de todo lo demás. Un clic en el botón
del reproductor —o Alt+P— y el vídeo pasa a una pequeña ventana siempre visible
con sus propios controles. Escribe código, responde correos, edita una hoja de
cálculo: el vídeo sigue a la vista sobre cualquier aplicación.

Es una ventana Document Picture-in-Picture de verdad, no un popup. Nunca queda
detrás de la ventana en la que estás trabajando.


EL VÍDEO NO EMPIEZA DE NUEVO

La mayoría de las extensiones «PiP» abren un segundo reproductor con el archivo
de vídeo: pierdes el punto donde estabas, tus ajustes y los subtítulos.

FloatPlayer traslada el propio reproductor de YouTube a la ventana. El mismo
flujo, el mismo segundo, la calidad que ya tenías, los mismos subtítulos, la
misma posición en la lista y el mismo historial. Al cerrar la ventana, el
reproductor vuelve a la página exactamente donde estaba. Nada se recarga.

Los anuncios no se bloquean ni se saltan: la extensión juega con las reglas de
YouTube.


LO QUE EL PICTURE-IN-PICTURE NATIVO NO HACE

El PiP integrado de Chrome ofrece un botón de reproducción y poco más.
FloatPlayer añade lo que de verdad falta:

- avance y retroceso: clic o arrastre en la barra, zonas de ±10 s sobre el
  vídeo, botones de ±30 s debajo
- velocidad de 0,25x a 3x con un deslizador
- volumen de 0 a 300 %: desde el silencio hasta tres veces el máximo de
  YouTube, ideal para vídeos grabados bajo
- bucle A-B para practicar una frase, un riff o un paso de baile
- temporizador que pausa el vídeo de verdad, hasta 12 horas
- copiar el enlace, vídeo anterior y siguiente, y hasta 20 recomendaciones en
  una columna desplegable
- compatibilidad con Shorts, que el PiP nativo no admite
- una ventana realmente limpia, sin interfaz de YouTube dentro

Todo se oculta hasta que mueves el ratón, así que casi siempre ves solo el
vídeo. Durante un anuncio, una franja blanca aparte indica cuánto queda y la
roja se congela en tu posición real.


PATROCINIOS MARCADOS Y SALTABLES

Que quede claro: los anuncios propios de YouTube no se tocan. Esto es para las
menciones patrocinadas integradas en el vídeo por el autor.

Los segmentos señalados por la comunidad SponsorBlock se pintan de verde en la
barra y, dentro de uno, aparece el botón «Saltar el patrocinio». Solo se envía
el ID del vídeo a sponsor.ajay.app —nada sobre ti— y la función se puede
desactivar.


SHORTS, DE VERDAD

Un botón encima de «Me gusta» abre el Short en una ventana vertical 9:16, sin
bandas negras ni recortes. Cuando termina, el siguiente empieza solo, y las
flechas inferiores recorren el feed desde la propia ventana.


LA VENTANA SE COMPORTA COMO ESPERAS

Arrástrala desde cualquier punto: mantén pulsado sobre el vídeo y muévela; los
botones siguen siendo pulsables. Se abre con la proporción exacta del vídeo,
vuelve a ella tras redimensionarla a mano y recuerda el tamaño por separado
para vídeos horizontales y para Shorts verticales.

Solo vídeo, garantizado: la interfaz de YouTube dentro de la ventana se elimina
con una lista blanca que deja pasar el vídeo, los subtítulos y el indicador de
carga, y nada más.


ATAJOS Y AJUSTES

Desde cualquier ventana de Chrome: Alt+P abre o cierra (⌥P en Mac), Alt+K
pausa, Alt+J y Alt+L saltan 5 segundos. Dentro de la ventana: espacio o K
pausa, las flechas saltan 5 segundos, M silencia. Todo reasignable en
chrome://extensions/shortcuts.

Los ajustes cubren el estilo de ventana, PiP automático, SponsorBlock, paso de
avance, Shorts automáticos, panel compacto, paso de velocidad, volumen máximo e
idioma. Se aplican al instante.


PRIVACIDAD

Sin cuentas, sin registro, sin rastreo, sin analíticas, sin anuncios. No se
recoge nada ni se envía nada, salvo el ID del vídeo para SponsorBlock y solo
mientras esa función esté activada.


LIMITACIONES HONESTAS

- Requiere Chrome 116 o superior; en versiones anteriores se usa el PiP nativo.
- La franja de Chrome con la dirección del sitio no se puede quitar: es un
  requisito antiphishing para toda ventana Document PiP. Se oculta sola al
  apartar el cursor, y el modo «vídeo limpio» no la tiene.
- La transparencia y el clic a través no están disponibles en la API de Chrome.
- Una sola ventana PiP por navegador y su posición no se puede fijar por
  programa: son límites del navegador.
- Durante los anuncios de YouTube no se puede avanzar: el vídeo principal no
  está cargado en ese momento.""",

"pt_BR": """O FloatPlayer mantém o YouTube à frente de tudo. Um clique no botão do player —
ou Alt+P — e o vídeo vai para uma janelinha sempre à frente, com controles
próprios. Escreva código, responda e-mails, edite uma planilha: o vídeo continua
visível sobre qualquer aplicativo.

É uma janela Document Picture-in-Picture de verdade, não um popup. Ela nunca
some atrás da janela em que você está trabalhando.


O VÍDEO NÃO RECOMEÇA

A maioria das extensões «PiP» abre um segundo player com o arquivo de vídeo:
você perde o ponto em que estava, suas configurações e as legendas.

O FloatPlayer move o próprio player do YouTube para a janela. Mesmo stream,
mesmo segundo, a qualidade que você já tinha, as mesmas legendas, a mesma
posição na playlist e o mesmo histórico. Ao fechar a janela, o player volta para
a página exatamente onde estava. Nada recarrega.

Os anúncios não são bloqueados nem pulados: a extensão joga pelas regras do
YouTube.


O QUE O PICTURE-IN-PICTURE NATIVO NÃO FAZ

O PiP embutido do Chrome dá um botão de play e mais nada. O FloatPlayer
acrescenta o que realmente falta:

- avançar e voltar: clique ou arraste na barra, zonas de ±10 s sobre o vídeo,
  botões de ±30 s abaixo dele
- velocidade de 0,25x a 3x num controle deslizante
- volume de 0 a 300%: do silêncio até três vezes o máximo do YouTube, ótimo
  para vídeos gravados baixo
- repetição A-B para treinar uma frase, um riff ou um passo de dança
- timer que realmente pausa o vídeo, até 12 horas
- copiar o link, vídeo anterior e próximo, e até 20 recomendações numa coluna
- suporte a Shorts, que o PiP nativo simplesmente não tem
- uma janela de fato limpa, sem interface do YouTube dentro

Tudo se esconde até você mexer o mouse, então quase o tempo todo você vê apenas
o vídeo. Durante um anúncio, uma faixa branca separada mostra quanto falta e a
vermelha congela na sua posição real.


PATROCÍNIOS MARCADOS E PULÁVEIS

Deixando claro: os anúncios do próprio YouTube não são tocados. Isto é sobre os
merchans inseridos no vídeo pelo criador.

Os trechos marcados pela comunidade SponsorBlock ficam verdes na barra e, dentro
de um deles, aparece o botão «Pular o patrocínio». Só o ID do vídeo é enviado ao
sponsor.ajay.app — nada sobre você — e o recurso pode ser desligado.


SHORTS DE VERDADE

Um botão acima do «Gostei» abre o Short numa janela vertical 9:16, sem barras
pretas nem cortes. Quando ele acaba, o próximo começa sozinho, e as setas de
baixo percorrem o feed direto da janela.


A JANELA SE COMPORTA COMO VOCÊ ESPERA

Arraste de qualquer ponto: segure sobre o vídeo e mova; os botões continuam
clicáveis. Ela abre na proporção exata do vídeo, volta a ela depois que você
redimensiona na mão e guarda o tamanho separadamente para vídeos horizontais e
Shorts verticais.

Só vídeo, garantido: a interface do YouTube dentro da janela é removida por uma
lista branca que permite o vídeo, as legendas e o indicador de carregamento —
nada além disso.


ATALHOS E CONFIGURAÇÕES

De qualquer janela do Chrome: Alt+P abre ou fecha (⌥P no Mac), Alt+K pausa,
Alt+J e Alt+L pulam 5 segundos. Dentro da janela: espaço ou K pausa, setas pulam
5 segundos, M tira o som. Tudo reconfigurável em chrome://extensions/shortcuts.

As configurações cobrem estilo da janela, PiP automático, SponsorBlock, passo do
avanço, Shorts automáticos, painel compacto, passo de velocidade, volume máximo
e idioma. Aplicam-se na hora.


PRIVACIDADE

Sem contas, sem login, sem rastreamento, sem analytics, sem anúncios. Nada é
coletado e nada é enviado, exceto o ID do vídeo para o SponsorBlock — e só
enquanto esse recurso estiver ligado.


LIMITAÇÕES HONESTAS

- Requer Chrome 116 ou mais recente; em versões antigas usa-se o PiP nativo.
- A faixa do Chrome com o endereço do site não pode ser removida: é uma
  exigência antiphishing para toda janela Document PiP. Ela some sozinha quando
  o cursor sai, e o modo «vídeo limpo» não a tem.
- Transparência e clique através não existem na API do Chrome.
- Uma janela PiP por navegador, e a posição dela não pode ser definida por
  programa: são limites do navegador.
- Durante os anúncios do YouTube não dá para avançar: o vídeo principal não está
  carregado naquele momento.""",

"de": """FloatPlayer hält YouTube über allem anderen. Ein Klick auf die Schaltfläche im
Player — oder Alt+P — und das Video wandert in ein kleines Fenster im
Vordergrund, mit eigenen Bedienelementen. Code schreiben, Mails beantworten,
Tabellen pflegen: Das Video bleibt über jeder Anwendung sichtbar.

Das ist ein echtes Document-Picture-in-Picture-Fenster, kein Popup. Es rutscht
nie hinter das Fenster, in dem du gerade arbeitest.


DAS VIDEO BEGINNT NICHT VON VORN

Die meisten „PiP“-Erweiterungen öffnen einen zweiten Player mit der reinen
Videodatei: Du verlierst die Stelle, deine Einstellungen und die Untertitel.

FloatPlayer verschiebt den echten YouTube-Player ins Fenster. Gleicher Stream,
gleiche Sekunde, die Qualität, die du schon hattest, dieselben Untertitel,
dieselbe Position in der Playlist, derselbe Verlauf. Schließt du das Fenster,
rutscht der Player exakt dorthin zurück, wo er war. Nichts lädt neu.

Werbung wird weder blockiert noch übersprungen: Die Erweiterung hält sich an
YouTubes Regeln.


WAS DAS EINGEBAUTE PICTURE-IN-PICTURE NICHT KANN

Chromes eigenes PiP bietet eine Wiedergabetaste und sonst nichts. FloatPlayer
ergänzt, was wirklich fehlt:

- Spulen: Klick oder Ziehen auf der Leiste, ±10-s-Zonen auf dem Video,
  ±30-s-Schaltflächen darunter
- Tempo von 0,25x bis 3x per Regler
- Lautstärke von 0 bis 300 %: von Stille bis dreimal so laut wie YouTubes
  eigenes Maximum, ideal für leise aufgenommene Videos
- A-B-Schleife, um eine Phrase, ein Riff oder eine Bewegung zu üben
- Sleeptimer, der das Video wirklich pausiert, bis zu 12 Stunden
- Link kopieren, vorheriges und nächstes Video sowie bis zu 20 Empfehlungen in
  einer ausfahrbaren Spalte
- Shorts-Unterstützung, die das native PiP gar nicht bietet
- ein wirklich aufgeräumtes Fenster ohne YouTube-Oberfläche darin

Alles bleibt verborgen, bis du die Maus bewegst — meistens siehst du also nur
das Video. Während Werbung läuft, zeigt ein separater weißer Streifen, wie viel
davon übrig ist, und der rote friert an deiner echten Position ein.


SPONSOR-ABSCHNITTE SICHTBAR UND ÜBERSPRINGBAR

Zur Klarstellung: YouTubes eigene Werbung wird nicht angetastet. Es geht um
Sponsorenblöcke, die Creator selbst ins Video schneiden.

Von der SponsorBlock-Community gemeldete Abschnitte erscheinen grün auf der
Leiste, und darin taucht die Schaltfläche „Sponsor überspringen“ auf. An
sponsor.ajay.app geht nur die Video-ID — nichts über dich — und die Funktion
lässt sich abschalten.


SHORTS, RICHTIG UNTERSTÜTZT

Eine eigene Schaltfläche über „Gefällt mir“ öffnet den Short in einem
hochkanten 9:16-Fenster, ohne schwarze Balken und ohne Beschnitt. Ist er zu
Ende, startet der nächste von selbst, und die unteren Pfeile blättern den Feed
direkt im Fenster.


DAS FENSTER VERHÄLT SICH WIE ERWARTET

Zieh es an beliebiger Stelle: auf dem Video gedrückt halten und bewegen — die
Schaltflächen bleiben klickbar. Es öffnet sich im exakten Seitenverhältnis des
Videos, kehrt nach manuellem Verändern dorthin zurück und merkt sich die Größe
getrennt für querformatige Videos und hochkante Shorts.

Nur Video, garantiert: Die YouTube-Oberfläche im Fenster wird über eine
Positivliste entfernt, die Video, Untertitel und Ladeanzeige durchlässt — sonst
nichts.


TASTENKÜRZEL UND EINSTELLUNGEN

Aus jedem Chrome-Fenster: Alt+P öffnet und schließt (⌥P auf dem Mac), Alt+K
pausiert, Alt+J und Alt+L springen 5 Sekunden. Im Fenster: Leertaste oder K
pausiert, Pfeile springen 5 Sekunden, M schaltet stumm. Alles änderbar unter
chrome://extensions/shortcuts.

Die Einstellungen umfassen Fensterstil, Auto-PiP, SponsorBlock, Sprungweite,
Shorts-Automatik, kompaktes Bedienfeld, Tempo-Schrittweite, Lautstärkegrenze und
Sprache. Änderungen wirken sofort.


DATENSCHUTZ

Keine Konten, keine Anmeldung, kein Tracking, keine Analytics, keine Werbung. Es
wird nichts erhoben und nichts verschickt — außer der Video-ID für SponsorBlock,
und auch nur, solange diese Funktion aktiv ist.


EHRLICHE EINSCHRÄNKUNGEN

- Erfordert Chrome 116 oder neuer; ältere Versionen greifen auf das native PiP
  zurück.
- Der schmale Chrome-Streifen mit der Website-Adresse lässt sich nicht
  entfernen: Das ist eine Anti-Phishing-Vorgabe für jedes Document-PiP-Fenster.
  Er blendet sich von selbst aus, sobald der Cursor weg ist; im Modus „Nur
  Video“ gibt es ihn gar nicht.
- Transparenz und Klick-durch bietet die Chrome-API nicht.
- Ein PiP-Fenster pro Browser, und seine Position lässt sich nicht per Programm
  setzen — beides sind Browser-Grenzen.
- Während YouTube-Werbung ist Spulen nicht möglich: Das Hauptvideo ist in diesem
  Moment gar nicht geladen.""",

"ja": """FloatPlayerはYouTubeを常にいちばん前に表示します。プレーヤーのボタンを1回押すか
Alt+Pを押すだけで、動画が独自の操作パネルを備えた小さな最前面ウィンドウに移りま
す。コードを書きながら、メールに返信しながら、表計算を編集しながら——動画はどの
アプリの上にも見えたままです。

これはポップアップではなく、本物のDocument Picture-in-Pictureウィンドウです。作
業中のウィンドウの背後に回り込むことはありません。


動画は最初から再生し直されません

多くの「PiP」拡張機能は生の動画ファイルで2つ目のプレーヤーを開きます。再生位置も
設定も字幕も失われます。

FloatPlayerはYouTubeのプレーヤー自体をウィンドウへ移動します。同じストリーム、同
じ再生位置、それまでと同じ画質、同じ字幕、同じ再生リストの位置、同じ視聴履歴。ウ
ィンドウを閉じれば、プレーヤーは元の場所にそのまま戻ります。読み込み直しは起きま
せん。

広告はブロックもスキップもしません。YouTubeのルールに従って動作します。


標準のピクチャーインピクチャーにできないこと

Chrome標準のPiPには再生ボタンしかありません。FloatPlayerは本当に足りないものを補
います。

- シーク：バーのクリックとドラッグ、動画上の±10秒エリア、その下の±30秒ボタン
- 再生速度0.25倍〜3倍のスライダー
- 音量0〜300%：無音から、YouTube本来の最大の3倍まで。録音が小さい動画に最適
- A-Bリピート：フレーズやリフ、動きの練習に
- 実際に一時停止するスリープタイマー（最長12時間）
- リンクのコピー、前後の動画への移動、最大20件のおすすめを表示する引き出しパネル
- ショート対応（標準のPiPは非対応）
- YouTubeのUIが一切入らない、本当にすっきりしたウィンドウ

マウスを動かすまで操作系は隠れているので、ほとんどの時間は動画だけが見えます。広
告の再生中は別の白いバーが残り時間を示し、赤いバーは本編の位置で止まったままにな
ります。


スポンサー部分は見えて、飛ばせます

念のため：YouTube自体の広告には手を触れません。ここで扱うのは、投稿者が動画内に組
み込んだスポンサー紹介です。

SponsorBlockコミュニティが報告した区間はシークバー上で緑色に表示され、その区間内
では「スポンサー部分をスキップ」ボタンが現れます。sponsor.ajay.appへ送られるのは
動画IDだけで、あなたに関する情報は送られません。機能はオフにできます。


ショートも本格対応

「高く評価」の上にある専用ボタンで、ショートを9:16の縦ウィンドウに切り出せます。
黒帯も見切れもありません。再生が終わると次が自動で始まり、下部の矢印でウィンドウ
からフィードを送れます。


ウィンドウは期待どおりに動きます

どこをつかんでも移動できます。動画の上で押したまま動かすだけで、ボタンは押せるま
まです。ウィンドウは動画の縦横比ちょうどで開き、手で変形させても元の比率に戻り、
横向き動画と縦向きショートでサイズを別々に記憶します。

動画だけを表示することを保証します。ウィンドウ内のYouTubeのUIはホワイトリスト方式
で取り除かれ、動画・字幕・読み込み表示だけが残ります。


ショートカットと設定

Chromeのどのウィンドウからでも：Alt+Pで開閉（Macは⌥P）、Alt+Kで一時停止、Alt+Jと
Alt+Lで5秒移動。ウィンドウ内では：スペースまたはKで一時停止、矢印で5秒移動、Mでミ
ュート。すべてchrome://extensions/shortcutsで変更できます。

設定ではウィンドウの表示、自動PiP、SponsorBlock、スキップ秒数、ショートの自動再
生、コンパクトパネル、速度の刻み、音量上限、言語を選べます。変更は即座に反映され
ます。


プライバシー

アカウントもログインも追跡も解析も広告もありません。何も収集せず、どこにも送信し
ません。例外はSponsorBlock用の動画IDのみで、その機能を有効にしている間だけです。


正直な制限

- Chrome 116以降が必要です。それより古い場合は標準のPiPになります。
- サイトのアドレスが載るChromeの細い帯は消せません。すべてのDocument PiPウィンド
  ウに課されるフィッシング対策の仕様です。カーソルを離せば自動的に隠れ、「動画の
  み」モードなら最初からありません。
- 透明化やクリックの通過はChromeのAPIにありません。
- PiPウィンドウはブラウザーにつき1つ、位置はプログラムから指定できません。いずれ
  もブラウザー側の制限です。
- YouTubeの広告中はシークできません。その瞬間は本編が読み込まれていないためです。""",

"fr": """FloatPlayer garde YouTube au-dessus de tout le reste. Un clic sur le bouton du
lecteur — ou Alt+P — et la vidéo passe dans une petite fenêtre toujours au
premier plan, avec ses propres commandes. Écrivez du code, répondez à vos
mails, modifiez un tableur : la vidéo reste visible par-dessus n'importe quelle
application.

C'est une véritable fenêtre Document Picture-in-Picture, pas un popup. Elle ne
passe jamais derrière la fenêtre dans laquelle vous travaillez.


LA VIDÉO NE REPART PAS DE ZÉRO

La plupart des extensions « PiP » ouvrent un second lecteur avec le fichier
vidéo brut : vous perdez votre position, vos réglages et les sous-titres.

FloatPlayer déplace le lecteur YouTube lui-même dans la fenêtre. Même flux,
même seconde, la qualité que vous aviez déjà, les mêmes sous-titres, la même
position dans la playlist, le même historique. À la fermeture, le lecteur
revient exactement à sa place dans la page. Rien ne se recharge.

Les publicités ne sont ni bloquées ni sautées : l'extension respecte les règles
de YouTube.


CE QUE LE PICTURE-IN-PICTURE NATIF NE SAIT PAS FAIRE

Le PiP intégré de Chrome offre un bouton de lecture et rien d'autre.
FloatPlayer ajoute ce qui manque vraiment :

- la navigation : clic ou glissement sur la barre, zones de ±10 s sur la vidéo,
  boutons de ±30 s en dessous
- la vitesse de 0,25x à 3x avec un curseur
- le volume de 0 à 300 % : du silence jusqu'à trois fois le maximum de YouTube,
  parfait pour les vidéos enregistrées trop bas
- la boucle A-B pour travailler une phrase, un riff ou un pas de danse
- une minuterie qui met vraiment la vidéo en pause, jusqu'à 12 heures
- copier le lien, vidéo précédente et suivante, et jusqu'à 20 recommandations
  dans une colonne dépliable
- la prise en charge des Shorts, que le PiP natif refuse tout simplement
- une fenêtre réellement propre, sans interface YouTube à l'intérieur

Tout reste masqué jusqu'à ce que vous bougiez la souris : la plupart du temps,
vous ne voyez que la vidéo. Pendant une publicité, une barre blanche distincte
indique ce qu'il en reste et la rouge se fige à votre vraie position.


PASSAGES SPONSORISÉS VISIBLES ET ÉVITABLES

Pour être clair : les publicités de YouTube ne sont jamais touchées. Il s'agit
des placements que le créateur intègre lui-même dans la vidéo.

Les passages signalés par la communauté SponsorBlock apparaissent en vert sur la
barre, et un bouton « Passer le sponsor » s'affiche à l'intérieur. Seul
l'identifiant de la vidéo est envoyé à sponsor.ajay.app — rien qui vous
concerne — et la fonction peut être désactivée.


LES SHORTS, VRAIMENT PRIS EN CHARGE

Un bouton dédié au-dessus de « J'aime » ouvre le Short dans une fenêtre
verticale au format 9:16, sans bandes noires ni recadrage. À la fin, le suivant
démarre tout seul, et les flèches du bas font défiler le fil depuis la fenêtre.


LA FENÊTRE SE COMPORTE COMME PRÉVU

Déplacez-la depuis n'importe quel point : maintenez le clic sur la vidéo et
bougez — les boutons restent cliquables. Elle s'ouvre au format exact de la
vidéo, y revient après un redimensionnement manuel et retient sa taille
séparément pour les vidéos horizontales et les Shorts verticaux.

Rien que la vidéo, garanti : l'interface YouTube à l'intérieur est supprimée par
une liste blanche qui ne laisse passer que la vidéo, les sous-titres et
l'indicateur de chargement.


RACCOURCIS ET RÉGLAGES

Depuis n'importe quelle fenêtre Chrome : Alt+P ouvre ou ferme (⌥P sur Mac),
Alt+K met en pause, Alt+J et Alt+L sautent 5 secondes. Dans la fenêtre : espace
ou K met en pause, les flèches sautent 5 secondes, M coupe le son. Tout est
réassignable dans chrome://extensions/shortcuts.

Les réglages couvrent le style de fenêtre, le PiP automatique, SponsorBlock, le
pas d'avance, l'enchaînement des Shorts, le panneau compact, le pas de vitesse,
le volume maximal et la langue. Les changements s'appliquent immédiatement.


CONFIDENTIALITÉ

Pas de compte, pas de connexion, pas de pistage, pas d'analytique, pas de
publicité. Rien n'est collecté ni envoyé, hormis l'identifiant de la vidéo pour
SponsorBlock — et uniquement tant que cette fonction est activée.


LIMITES ASSUMÉES

- Nécessite Chrome 116 ou plus récent ; les versions antérieures basculent sur
  le PiP natif.
- Le fin bandeau Chrome avec l'adresse du site ne peut pas être retiré : c'est
  une exigence anti-hameçonnage pour toute fenêtre Document PiP. Il se masque
  seul quand le curseur s'éloigne, et le mode « vidéo seule » n'en a pas.
- La transparence et le clic traversant n'existent pas dans l'API Chrome.
- Une seule fenêtre PiP par navigateur, et sa position ne peut pas être définie
  par programme : ce sont des limites du navigateur.
- Pendant les publicités YouTube, la navigation est impossible : la vidéo
  principale n'est pas chargée à ce moment-là.""",

"id": """FloatPlayer menjaga YouTube tetap di atas segalanya. Satu klik pada tombol di
pemutar — atau Alt+P — dan video pindah ke jendela kecil yang selalu di atas,
lengkap dengan kendalinya sendiri. Menulis kode, membalas email, mengedit
spreadsheet: videonya tetap terlihat di atas aplikasi apa pun.

Ini jendela Document Picture-in-Picture yang sesungguhnya, bukan popup. Ia tidak
pernah tenggelam di belakang jendela yang sedang Anda pakai bekerja.


VIDEO TIDAK DIULANG DARI AWAL

Kebanyakan ekstensi «PiP» membuka pemutar kedua dengan berkas video mentah:
posisi tontonan, setelan, dan subtitle Anda hilang.

FloatPlayer memindahkan pemutar YouTube yang asli ke dalam jendela. Aliran yang
sama, detik yang sama, kualitas yang sudah Anda pakai, subtitle yang sama, posisi
playlist yang sama, riwayat yang sama. Saat jendela ditutup, pemutar kembali ke
halaman persis di tempatnya. Tidak ada yang dimuat ulang.

Iklan tidak diblokir dan tidak dilewati: ekstensi ini bermain sesuai aturan
YouTube.


YANG TIDAK BISA DILAKUKAN PICTURE-IN-PICTURE BAWAAN

PiP bawaan Chrome hanya memberi tombol putar. FloatPlayer menambahkan yang
benar-benar kurang:

- melompat waktu: klik atau seret bilah progres, zona ±10 dtk di atas video,
  tombol ±30 dtk di bawahnya
- kecepatan 0,25x sampai 3x lewat penggeser
- volume 0 sampai 300%: dari senyap hingga tiga kali maksimum YouTube sendiri,
  cocok untuk video yang direkam pelan
- pengulangan A-B untuk melatih frasa, riff, atau gerakan
- pengatur waktu tidur yang benar-benar menjeda video, sampai 12 jam
- salin tautan, video sebelumnya dan berikutnya, serta hingga 20 rekomendasi
  dalam kolom geser
- dukungan Shorts, yang sama sekali tidak ditangani PiP bawaan
- jendela yang benar-benar bersih, tanpa antarmuka YouTube di dalamnya

Semuanya tersembunyi sampai Anda menggerakkan tetikus, jadi hampir sepanjang
waktu yang terlihat hanya video. Saat iklan berjalan, bilah putih terpisah
menunjukkan sisanya dan bilah merah membeku di posisi asli Anda.


SEGMEN SPONSOR TERLIHAT DAN BISA DILEWATI

Perlu ditegaskan: iklan YouTube sendiri tidak disentuh. Ini tentang bagian
sponsor yang disisipkan kreator ke dalam videonya.

Segmen yang dilaporkan komunitas SponsorBlock ditandai hijau pada bilah progres,
dan di dalamnya muncul tombol «Lewati segmen sponsor». Hanya ID video yang
dikirim ke sponsor.ajay.app — tidak ada apa pun tentang Anda — dan fiturnya bisa
dimatikan.


SHORTS, DIDUKUNG SEPENUHNYA

Tombol khusus di atas «Suka» membuka Short di jendela vertikal 9:16, tanpa bilah
hitam dan tanpa terpotong. Setelah selesai, berikutnya mulai sendiri, dan panah
di bawah menggulir feed langsung dari jendela.


JENDELA BEKERJA SEPERTI YANG ANDA HARAPKAN

Seret dari mana saja: tekan dan tahan di atas video lalu gerakkan — tombol tetap
bisa diklik. Jendela terbuka tepat pada rasio video, kembali ke rasio itu setelah
Anda ubah ukurannya secara manual, dan mengingat ukuran secara terpisah untuk
video mendatar dan Shorts tegak.

Hanya video, dijamin: antarmuka YouTube di dalam jendela dihapus dengan daftar
putih yang hanya mengizinkan video, subtitle, dan indikator pemuatan.


PINTASAN DAN SETELAN

Dari jendela Chrome mana pun: Alt+P membuka atau menutup (⌥P di Mac), Alt+K
menjeda, Alt+J dan Alt+L melompat 5 detik. Di dalam jendela: spasi atau K
menjeda, panah melompat 5 detik, M membisukan. Semuanya bisa diubah di
chrome://extensions/shortcuts.

Setelan mencakup gaya jendela, PiP otomatis, SponsorBlock, langkah lompatan,
Shorts otomatis, panel ringkas, langkah kecepatan, batas volume, dan bahasa.
Perubahan berlaku seketika.


PRIVASI

Tanpa akun, tanpa login, tanpa pelacakan, tanpa analitik, tanpa iklan. Tidak ada
yang dikumpulkan dan tidak ada yang dikirim, kecuali ID video untuk SponsorBlock
— dan hanya selama fitur itu Anda biarkan aktif.


BATASAN YANG JUJUR

- Membutuhkan Chrome 116 atau lebih baru; versi lama akan memakai PiP bawaan.
- Bilah tipis Chrome berisi alamat situs tidak bisa dihilangkan: itu ketentuan
  antiphishing untuk setiap jendela Document PiP. Ia menghilang sendiri saat
  kursor menjauh, dan mode «video saja» tidak memilikinya.
- Transparansi dan klik tembus tidak tersedia di API Chrome.
- Satu jendela PiP per browser, dan posisinya tidak bisa ditentukan lewat
  program: keduanya batasan browser.
- Selama iklan YouTube, melompat waktu tidak berfungsi: video utama belum dimuat
  saat itu.""",
}

for lang, text in LONG.items():
    (OUT / f"{lang}.txt").write_text(text.strip() + "\n")
    short = SHORT[lang]
    (OUT / f"{lang}-short.txt").write_text(short + "\n")
    flag = "OK" if len(short) <= 132 else "СЛИШКОМ ДЛИННО"
    print(f"{lang:6} описание {len(text):5} симв. | краткое {len(short):3}/132 {flag}")
