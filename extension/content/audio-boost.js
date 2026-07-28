"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Усиление громкости выше 100% и аудио-пресеты через Web Audio API.
// Граф: source -> lowshelf (бас) -> peaking (голос) -> compressor (ночь) -> gain -> выход.
// В нейтральном состоянии фильтры прозрачны (gain 0 дБ, компрессор ratio 1).
// Граф создаётся лениво при первом использовании и живёт до конца страницы:
// createMediaElementSource нельзя "отцепить" от <video> и нельзя создать
// второй раз для того же элемента. Поэтому контекст живёт в мире страницы,
// даже когда <video> перенесён в PiP-окно, — Chrome сохраняет маршрутизацию
// звука (один процесс/агент-кластер); при сбое setBoostPercent вернёт false
// и UI покажет «н/д».
YTFP.audioBoost = (() => {
  let context = null;
  let gainNode = null;
  let bassNode = null;
  let voiceNode = null;
  let compressorNode = null;
  let connectedVideo = null;
  let currentPreset = "off";

  // Параметры фильтров по пресетам. У каждого пресета полный набор значений,
  // чтобы переключение всегда приводило граф в известное состояние.
  const NEUTRAL = {
    bassGain: 0,
    voiceGain: 0,
    compressor: { threshold: 0, ratio: 1, attack: 0.003, release: 0.25 }
  };
  const PRESETS = {
    off: NEUTRAL,
    // Ночной режим: компрессор поджимает громкие пики (взрывы, музыка),
    // тихие диалоги остаются слышны на малой громкости.
    night: {
      bassGain: -3,
      voiceGain: 2,
      compressor: { threshold: -40, ratio: 8, attack: 0.003, release: 0.25 }
    },
    // Усиление голоса: подъём речевых частот, срез гула снизу.
    voice: {
      bassGain: -6,
      voiceGain: 7,
      compressor: NEUTRAL.compressor
    },
    // Бас: подъём нижней полки.
    bass: {
      bassGain: 7,
      voiceGain: 0,
      compressor: NEUTRAL.compressor
    }
  };

  function ensureGraph(video) {
    if (connectedVideo === video && gainNode) {
      return true;
    }
    if (connectedVideo && connectedVideo !== video) {
      // Другой <video> подключить нельзя — источник привязан навсегда.
      // На YouTube элемент один и переживает навигацию, так что это не проблема.
      return false;
    }
    try {
      context = new AudioContext();
      const source = context.createMediaElementSource(video);

      bassNode = context.createBiquadFilter();
      bassNode.type = "lowshelf";
      bassNode.frequency.value = 120;

      voiceNode = context.createBiquadFilter();
      voiceNode.type = "peaking";
      voiceNode.frequency.value = 2500;
      voiceNode.Q.value = 1;

      compressorNode = context.createDynamicsCompressor();

      gainNode = context.createGain();

      source.connect(bassNode);
      bassNode.connect(voiceNode);
      voiceNode.connect(compressorNode);
      compressorNode.connect(gainNode);
      gainNode.connect(context.destination);

      connectedVideo = video;
      applyPresetValues(currentPreset);
      return true;
    } catch (error) {
      console.warn("[YTFP] Audio boost unavailable:", error);
      context = null;
      gainNode = null;
      bassNode = null;
      voiceNode = null;
      compressorNode = null;
      return false;
    }
  }

  function resumeContext() {
    // AudioContext стартует в suspended до жеста пользователя — возобновляем.
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  function applyPresetValues(presetName) {
    const preset = PRESETS[presetName] || NEUTRAL;
    if (!bassNode) {
      return;
    }
    bassNode.gain.value = preset.bassGain;
    voiceNode.gain.value = preset.voiceGain;
    compressorNode.threshold.value = preset.compressor.threshold;
    compressorNode.ratio.value = preset.compressor.ratio;
    compressorNode.attack.value = preset.compressor.attack;
    compressorNode.release.value = preset.compressor.release;
  }

  /**
   * Устанавливает громкость в процентах: 0 — тишина, 100 — как у YouTube,
   * выше 100 — усиление (до volumeBoostMax). Возвращает true при успехе.
   */
  function setBoostPercent(video, percent) {
    if (!video) {
      return false;
    }
    const max = YTFP.settings.get().volumeBoostMax;
    const clamped = YTFP.utils.clamp(percent, 0, max);
    if (clamped === 100 && !gainNode) {
      // Значение нейтральное и граф ещё не создан — не трогаем аудио-путь.
      return true;
    }
    if (!ensureGraph(video)) {
      return false;
    }
    resumeContext();
    gainNode.gain.value = clamped / 100;
    return true;
  }

  function getBoostPercent() {
    return gainNode ? Math.round(gainNode.gain.value * 100) : 100;
  }

  /**
   * Включает аудио-пресет ("off" | "night" | "voice" | "bass").
   * Возвращает true при успехе (или если пресет "off" и граф не нужен).
   */
  function setPreset(video, presetName) {
    // hasOwn, а не in: иначе "toString" и прочие методы прототипа прошли бы
    // проверку и уронили applyPresetValues на undefined-полях.
    currentPreset = Object.hasOwn(PRESETS, presetName) ? presetName : "off";
    if (currentPreset === "off" && !gainNode) {
      // Нейтральный пресет и граф ещё не создан — не трогаем аудио-путь.
      return true;
    }
    if (!video || !ensureGraph(video)) {
      return false;
    }
    resumeContext();
    applyPresetValues(currentPreset);
    return true;
  }

  function getPreset() {
    return currentPreset;
  }

  return { setBoostPercent, getBoostPercent, setPreset, getPreset };
})();
