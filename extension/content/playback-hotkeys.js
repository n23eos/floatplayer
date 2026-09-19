"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.playbackHotkeys = (() => {
  function attach(pipDocument,{getVideo,isShorts=false,onPrev,onNext,refreshBoost=()=>{}}) {
    function onKeyDown(event) {
      const speedStep = YTFP.settings.get().speedStep;
      const speedRange = YTFP.utils.speedSliderRange(YTFP.SPEED_MIN,YTFP.SPEED_MAX,speedStep);
      const tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || event.target?.closest?.("button, summary, [role=slider], [contenteditable=true]")) {
        return; // стрелки на слайдере двигают слайдер, не видео
      }
      const currentVideo = getVideo();
      if (!currentVideo) {
        return;
      }
      // Не event.key напрямую: на нелатинской раскладке он приходит другой
      // («л» вместо «k»), и окно оставалось без половины клавиш. Список
      // обрабатываемых клавиш и разбор раскладки — в utils.hotkeyFromEvent;
      // всё остальное (f, c, i) уходит к YouTube без изменений.
      const hotkey = YTFP.utils.hotkeyFromEvent(event);
      if (hotkey === null) {
        return;
      }
      // Плеер переехал в это окно вместе со слушателями YouTube, и они
      // обрабатывают те же клавиши. Без этого пробел давал двойное
      // переключение: пауза от YouTube и тут же снятие от нас.
      event.stopPropagation();
      // Цифры 0–9 — прыжок к N×10% видео (как на самом YouTube).
      if (/^[0-9]$/.test(hotkey)) {
        if (YTFP.playerApi.isAdShowing()) {
          return; // реклама не мотается
        }
        const target = YTFP.utils.digitSeekTime(currentVideo.duration, Number(hotkey));
        if (target !== null) {
          currentVideo.currentTime = target;
        }
        return;
      }
      switch (hotkey) {
        case " ":
        case "k":
          event.preventDefault();
          if (currentVideo.paused) {
            YTFP.sleepTimer?.resume();
            currentVideo.play().catch(() => {});
          } else {
            currentVideo.pause();
          }
          break;
        // Границы берём из getSeekRange: у прямого эфира длительности нет,
        // а мотать надо в пределах DVR-буфера.
        case "ArrowLeft":
        case "ArrowRight": {
          if (YTFP.playerApi.isAdShowing()) {
            break; // реклама не мотается
          }
          const bounds = YTFP.playerApi.getSeekRange(currentVideo);
          if (!bounds) {
            break;
          }
          const step = hotkey === "ArrowRight"
            ? YTFP.SEEK_STEP_SECONDS
            : -YTFP.SEEK_STEP_SECONDS;
          currentVideo.currentTime = YTFP.utils.clamp(
            currentVideo.currentTime + step,
            bounds.start,
            bounds.end
          );
          break;
        }
        case "m":
          currentVideo.muted = !currentVideo.muted;
          break;
        case "ArrowUp":
        case "ArrowDown": {
          event.preventDefault();
          // В шортсах стрелки листают ленту — как на самой странице YouTube.
          // Громкость там остаётся на ползунке панели и на клавише m.
          if (isShorts) {
            const go = hotkey === "ArrowDown" ? onNext : onPrev;
            if (go) {
              go();
            }
            break;
          }
          // Громкость ±10% через тот же тракт, что и слайдер (0–300%).
          const VOLUME_KEY_STEP_PERCENT = 10;
          const delta = hotkey === "ArrowUp" ? VOLUME_KEY_STEP_PERCENT : -VOLUME_KEY_STEP_PERCENT;
          const nextPercent = YTFP.audioBoost.getBoostPercent() + delta;
          const ok = YTFP.audioBoost.setBoostPercent(currentVideo, nextPercent);
          if (ok) {
            // Синхронизируем слайдер и подпись с фактическим значением.
            refreshBoost();
          }
          break;
        }
        case "<":
        case ">": {
          const direction = hotkey === ">" ? 1 : -1;
          // Границы те же, что у ползунка: иначе клавиши доводили бы
          // скорость до значения, которого на ползунке нет.
          currentVideo.playbackRate = YTFP.utils.nextSpeed(
            currentVideo.playbackRate,
            speedStep,
            direction,
            speedRange.min,
            speedRange.max
          );
          break;
        }
        default:
          break;
      }
    }
    pipDocument.addEventListener("keydown",onKeyDown,true);
    return { cleanup() { pipDocument.removeEventListener("keydown",onKeyDown,true); } };
  }
  return {attach};
})();
