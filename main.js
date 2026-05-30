const notes = [
  { name: "ソ3", label: "ソ3 低め", frequency: 196.0 },
  { name: "ラ3", label: "ラ3", frequency: 220.0 },
  { name: "シ3", label: "シ3", frequency: 246.94 },
  { name: "ド4", label: "ド4", frequency: 261.63 },
  { name: "レ4", label: "レ4", frequency: 293.66 },
  { name: "ミ4", label: "ミ4", frequency: 329.63 },
  { name: "ファ4", label: "ファ4", frequency: 349.23 },
  { name: "ソ4", label: "ソ4", frequency: 392.0 },
  { name: "ラ4", label: "ラ4", frequency: 440.0 },
  { name: "シ4", label: "シ4", frequency: 493.88 },
  { name: "ド5", label: "ド5 高め", frequency: 523.25 },
  { name: "レ5", label: "レ5 高め", frequency: 587.33 },
  { name: "ミ5", label: "ミ5 高め", frequency: 659.25 }
];

const songPresets = [
  {
    id: "scale-practice",
    title: "音階練習",
    bpm: 72,
    phrase: "ド4:1 レ4:1 ミ4:1 ファ4:1 ソ4:1 ラ4:1 シ4:1 ド5:2"
  },
  {
    id: "moeroyo-starter",
    title: "燃えろよ燃えろ（確認用）",
    bpm: 96,
    phrase: "ソ4:1 ソ4:1 ミ4:1 ミ4:1 ソ4:1 ソ4:1 ミ4:2 休:0.5 ソ4:1 ラ4:1 ソ4:1 ミ4:1 レ4:2"
  },
  {
    id: "toki-yama-starter",
    title: "遠き山に日は落ちて（確認用）",
    bpm: 72,
    phrase: "ミ4:1.5 レ4:0.5 ド4:1 レ4:1 ミ4:1 ソ4:1 ミ4:2 レ4:1 ド4:1 レ4:1 ミ4:1 レ4:2"
  },
  {
    id: "kyou-no-hi-starter",
    title: "今日の日はさようなら（確認用）",
    bpm: 84,
    phrase: "ソ4:1 ミ4:1 ファ4:1 ソ4:1 ラ4:1 ソ4:1 ミ4:2 ファ4:1 レ4:1 ミ4:1 ファ4:1 ソ4:2"
  }
];

const state = {
  audioContext: null,
  analyser: null,
  mediaStream: null,
  source: null,
  inputGain: null,
  buffer: null,
  animationId: null,
  lastReadAt: 0,
  isListening: false,
  scaleBaseMidi: null,
  scaleLocked: false,
  phrase: {
    isPlaying: false,
    events: [],
    review: [],
    nodes: [],
    currentIndex: -1,
    audioStartAt: 0,
    totalSeconds: 0,
    animationId: null,
    staffLowMidi: 60,
    staffHighMidi: 72
  }
};

const elements = {
  targetSelect: document.querySelector("#target-note"),
  toleranceSelect: document.querySelector("#tolerance"),
  micSensitivity: document.querySelector("#mic-sensitivity"),
  transpose: document.querySelector("#transpose"),
  octaveCorrection: document.querySelector("#octave-correction"),
  songPreset: document.querySelector("#song-preset"),
  phraseBpm: document.querySelector("#phrase-bpm"),
  guideSound: document.querySelector("#guide-sound"),
  guideVolume: document.querySelector("#guide-volume"),
  speakerGuard: document.querySelector("#speaker-guard"),
  phraseInput: document.querySelector("#phrase-input"),
  builderOctave: document.querySelector("#builder-octave"),
  builderBeats: document.querySelector("#builder-beats"),
  noteButtons: document.querySelectorAll("[data-note-button]"),
  undoNote: document.querySelector("#undo-note"),
  clearPhrase: document.querySelector("#clear-phrase"),
  tabButtons: document.querySelectorAll("[data-tab-button]"),
  phraseSteps: document.querySelector("#phrase-steps"),
  staffPreview: document.querySelector("#staff-preview"),
  phraseProgressBar: document.querySelector("#phrase-progress-bar"),
  playPhrase: document.querySelector("#play-phrase"),
  stopPhrase: document.querySelector("#stop-phrase"),
  playTarget: document.querySelector("#play-target"),
  startMic: document.querySelector("#start-mic"),
  stopMic: document.querySelector("#stop-mic"),
  targetName: document.querySelector("#target-name"),
  targetHz: document.querySelector("#target-hz"),
  result: document.querySelector("#result"),
  detail: document.querySelector("#detail"),
  currentNote: document.querySelector("#current-note"),
  currentHz: document.querySelector("#current-hz"),
  volumeLevel: document.querySelector("#volume-level"),
  scaleRows: document.querySelector("#scale-rows"),
  targetMarker: document.querySelector("#target-marker"),
  voiceMarker: document.querySelector("#voice-marker"),
  coachMessage: document.querySelector("#coach-message")
};

function setupNoteOptions() {
  const fragment = document.createDocumentFragment();

  notes.forEach((note) => {
    const option = document.createElement("option");
    option.value = note.frequency;
    option.textContent = `${note.label} (${note.frequency.toFixed(1)} Hz)`;
    option.dataset.name = note.name;
    fragment.appendChild(option);
  });

  elements.targetSelect.appendChild(fragment);
  elements.targetSelect.value = "261.63";
  updateTargetDisplay();
  refreshPhrasePreview();
}

function setupSongPresets() {
  const fragment = document.createDocumentFragment();
  const customOption = document.createElement("option");

  customOption.value = "custom";
  customOption.textContent = "手入力";
  fragment.appendChild(customOption);

  songPresets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.title;
    fragment.appendChild(option);
  });

  elements.songPreset.appendChild(fragment);
  loadSongPreset("scale-practice", false);
}

function loadSongPreset(presetId, showMessage = true) {
  const preset = songPresets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  elements.phraseBpm.value = String(preset.bpm);
  elements.phraseInput.value = preset.phrase;
  elements.songPreset.value = preset.id;
  refreshPhrasePreview();
  updateTargetDisplay();

  if (showMessage) {
    setResult(
      "waiting",
      "音列を入れました",
      "楽譜で高さと長さを確認してから使います。",
      "低い声で試す時は、歌う高さを1オクターブ下にします。"
    );
  }
}

function markCustomPreset() {
  elements.songPreset.value = "custom";
}

function getTargetNote() {
  const selected = elements.targetSelect.selectedOptions[0];
  const frequency = applyTransposeToFrequency(Number(elements.targetSelect.value));

  return {
    name: frequencyToNearestNote(frequency) || selected?.dataset.name || "ド4",
    frequency
  };
}

function updateTargetDisplay() {
  const target = getActiveTargetNote() ?? getTargetNote();
  elements.targetName.textContent = target.name;
  elements.targetHz.textContent = target.frequency ? `${target.frequency.toFixed(1)} Hz` : "--";
  updateScaleForTarget(target.frequency ? target : getTargetNote());
  updateScaleMarkers(target.frequency ? target.frequency : null, null);
}

function getActiveTargetNote() {
  const event = getCurrentPhraseEvent();

  if (!event) {
    return null;
  }

  if (event.isRest) {
    return { name: "休み", frequency: null };
  }

  return {
    name: event.name,
    frequency: event.frequency
  };
}

function getCurrentPhraseEvent() {
  if (!state.phrase.isPlaying || state.phrase.currentIndex < 0) {
    return null;
  }

  return state.phrase.events[state.phrase.currentIndex] ?? null;
}

function setResult(kind, text, detail, coachMessage) {
  elements.result.className = `result ${kind}`;
  elements.result.textContent = text;
  elements.detail.textContent = detail;
  elements.coachMessage.textContent = coachMessage;
}

function resetLiveDisplay() {
  elements.currentNote.textContent = "--";
  elements.currentHz.textContent = "--";
  elements.volumeLevel.style.width = "0%";
  elements.voiceMarker.style.opacity = "0";
  updateScaleMarkers((getActiveTargetNote() ?? getTargetNote()).frequency, null);
}

async function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("このブラウザでは音声機能を使えません。");
    }
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  return state.audioContext;
}

async function playTargetTone() {
  try {
    const audioContext = await ensureAudioContext();
    const target = getActiveTargetNote() ?? getTargetNote();

    if (!target.frequency) {
      return;
    }

    const startAt = audioContext.currentTime;
    createGuideVoice(audioContext, target.frequency, startAt, 1.45, Number(elements.guideVolume.value));
  } catch (error) {
    setResult(
      "waiting",
      "音を出せません",
      error.message,
      "端末の音量やブラウザの音声許可を確認します。"
    );
  }
}

async function startMic() {
  try {
    const audioContext = await ensureAudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: getMicAudioConstraints()
    });

    stopMic(false);

    state.mediaStream = stream;
    state.source = audioContext.createMediaStreamSource(stream);
    state.inputGain = audioContext.createGain();
    state.inputGain.gain.value = Number(elements.micSensitivity.value);
    state.analyser = audioContext.createAnalyser();
    state.analyser.fftSize = 4096;
    state.analyser.smoothingTimeConstant = 0.08;
    state.buffer = new Float32Array(state.analyser.fftSize);
    state.source.connect(state.inputGain).connect(state.analyser);
    state.isListening = true;
    elements.startMic.disabled = true;
    elements.stopMic.disabled = false;
    setResult(
      "waiting",
      "音を探しています",
      "小さい声やハミングで、目標の音に近づけます。",
      "最初は声を大きくしすぎず、自分の声を聴ける大きさで試します。"
    );
    readPitchLoop(performance.now());
    return true;
  } catch (error) {
    elements.startMic.disabled = false;
    elements.stopMic.disabled = true;
    setResult(
      "waiting",
      "マイクを使えません",
      "ブラウザや端末のマイク許可を確認してください。",
      "学校端末では、管理設定でマイクが止まっている場合があります。"
    );
    console.warn(error);
    return false;
  }
}

function getMicAudioConstraints() {
  const guardOn = elements.speakerGuard.value === "on";

  if (guardOn) {
    return {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: false }
    };
  }

  return {
    echoCancellation: { ideal: false },
    noiseSuppression: { ideal: false },
    autoGainControl: { ideal: false }
  };
}

async function handleSpeakerGuardChange() {
  const guardOn = elements.speakerGuard.value === "on";

  if (state.isListening) {
    stopMic(false);
    const micReady = await startMic();

    if (!micReady) {
      return;
    }
  }

  setResult(
    "waiting",
    guardOn ? "本体音対策を使います" : "音程優先に戻しました",
    guardOn
      ? "端末のスピーカー音を拾いにくくする設定でマイクを使います。"
      : "声の高さをできるだけそのまま拾う設定でマイクを使います。",
    guardOn
      ? "反応が不安定な時は、音量を小さめにするか、イヤホンを使います。"
      : "ガイド音を拾う時は、本体音対策を試します。"
  );
}

async function playPhrase() {
  const phrase = buildPhraseFromInput();

  if (!phrase.events.length) {
    setResult(
      "waiting",
      "音列を確認",
      "例のように ド4:1 レ4:1 の形で入力します。",
      "短い音列から試します。"
    );
    return;
  }

  try {
    const audioContext = await ensureAudioContext();

    if (!state.isListening) {
      const micReady = await startMic();

      if (!micReady) {
        return;
      }
    }

    stopPhrase(false);
    state.phrase.isPlaying = true;
    state.phrase.events = phrase.events;
    state.phrase.review = createEmptyPhraseReview(phrase.events);
    state.phrase.currentIndex = -1;
    state.phrase.totalSeconds = phrase.totalSeconds;
    state.phrase.audioStartAt = audioContext.currentTime + 0.12;
    lockScaleToPhrase(phrase.events);
    elements.playPhrase.disabled = true;
    elements.stopPhrase.disabled = false;
    renderPhraseSteps(phrase.events);

    if (elements.guideSound.value === "on") {
      scheduleGuideTones(audioContext, phrase.events, state.phrase.audioStartAt);
    }

    setResult(
      "waiting",
      "フレーズ中",
      "流れている目標音に合わせて、短く歌います。",
      "小さめの声で、音の動きを追います。"
    );
    phraseLoop();
  } catch (error) {
    setResult(
      "waiting",
      "開始できません",
      error.message,
      "ブラウザの音声機能とマイク許可を確認します。"
    );
  }
}

function stopPhrase(showMessage = true) {
  if (state.phrase.animationId) {
    cancelAnimationFrame(state.phrase.animationId);
    state.phrase.animationId = null;
  }

  state.phrase.nodes.forEach((node) => {
    try {
      node.stop();
    } catch (error) {
      // Already stopped nodes can be ignored.
    }
    try {
      node.disconnect();
    } catch (error) {
      // Already disconnected nodes can be ignored.
    }
  });

  state.phrase.nodes = [];
  state.phrase.isPlaying = false;
  state.phrase.currentIndex = -1;
  state.phrase.totalSeconds = 0;
  state.scaleLocked = false;
  elements.playPhrase.disabled = false;
  elements.stopPhrase.disabled = true;
  elements.phraseProgressBar.style.width = "0%";
  markActivePhraseStep(-1);
  updateTargetDisplay();

  if (showMessage) {
    setResult(
      "waiting",
      "フレーズ停止",
      "録音データは保存していません。",
      "必要な部分だけ、短く繰り返します。"
    );
  }
}

function scheduleGuideTones(audioContext, events, startAt) {
  events.forEach((event) => {
    if (event.isRest || !event.frequency) {
      return;
    }

    const noteStart = startAt + event.startSeconds;
    const nodes = createGuideVoice(
      audioContext,
      event.frequency,
      noteStart,
      event.durationSeconds,
      Number(elements.guideVolume.value)
    );
    state.phrase.nodes.push(...nodes);
  });
}

function createGuideVoice(audioContext, frequency, startAt, durationSeconds, volume) {
  const stopAt = startAt + Math.max(0.35, durationSeconds);
  const gain = audioContext.createGain();
  const voices = [
    { ratio: 1, type: "triangle", level: 1 },
    { ratio: 2, type: "sine", level: 0.35 },
    { ratio: 3, type: "sine", level: 0.12 }
  ];
  const nodes = [gain];

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.05);
  gain.gain.setValueAtTime(volume, Math.max(startAt + 0.05, stopAt - 0.12));
  gain.gain.linearRampToValueAtTime(0.0001, stopAt);
  gain.connect(audioContext.destination);

  voices.forEach((voice) => {
    const oscillator = audioContext.createOscillator();
    const voiceGain = audioContext.createGain();

    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(frequency * voice.ratio, startAt);
    voiceGain.gain.setValueAtTime(voice.level, startAt);
    oscillator.connect(voiceGain).connect(gain);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.04);
    nodes.push(oscillator, voiceGain);
  });

  return nodes;
}

function phraseLoop() {
  if (!state.phrase.isPlaying || !state.audioContext) {
    return;
  }

  const elapsed = state.audioContext.currentTime - state.phrase.audioStartAt;

  if (elapsed >= state.phrase.totalSeconds) {
    finalizePhraseReview();
    stopPhrase(false);
    setResult(
      "waiting",
      "フレーズ終了",
      "もう一度試す時は、フレーズ開始を押します。",
      "短いまとまりで繰り返します。"
    );
    return;
  }

  const currentIndex = findCurrentPhraseIndex(elapsed);

  if (currentIndex !== state.phrase.currentIndex) {
    state.phrase.currentIndex = currentIndex;
    markActivePhraseStep(currentIndex);
    updateTargetDisplay();
  }

  const progress = Math.max(0, Math.min(100, (elapsed / state.phrase.totalSeconds) * 100));
  elements.phraseProgressBar.style.width = `${progress}%`;
  state.phrase.animationId = requestAnimationFrame(phraseLoop);
}

function findCurrentPhraseIndex(elapsed) {
  return state.phrase.events.findIndex((event) => {
    return elapsed >= event.startSeconds && elapsed < event.startSeconds + event.durationSeconds;
  });
}

function stopMic(showMessage = true) {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }

  if (state.source) {
    state.source.disconnect();
    state.source = null;
  }

  if (state.inputGain) {
    state.inputGain.disconnect();
    state.inputGain = null;
  }

  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }

  state.analyser = null;
  state.buffer = null;
  state.isListening = false;
  elements.startMic.disabled = false;
  elements.stopMic.disabled = true;
  stopPhrase(false);
  resetLiveDisplay();

  if (showMessage) {
    setResult(
      "waiting",
      "停止しました",
      "録音データは保存していません。",
      "必要な時だけマイクを開始して、短い練習に使います。"
    );
  }
}

function readPitchLoop(timestamp) {
  if (!state.isListening || !state.analyser || !state.buffer) {
    return;
  }

  state.animationId = requestAnimationFrame(readPitchLoop);

  if (timestamp - state.lastReadAt < 95) {
    return;
  }
  state.lastReadAt = timestamp;

  state.analyser.getFloatTimeDomainData(state.buffer);
  const rms = getRms(state.buffer);
  updateVolume(rms);

  const detection = detectPitch(state.buffer, state.audioContext.sampleRate, rms);
  updateDisplayFromDetection(detection, rms);
}

function getRms(buffer) {
  let sum = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }

  return Math.sqrt(sum / buffer.length);
}

function updateVolume(rms) {
  const percent = Math.min(100, Math.round(rms * 820));
  elements.volumeLevel.style.width = `${percent}%`;
}

function detectPitch(input, sampleRate, rms) {
  if (rms < 0.006) {
    return { frequency: null, clarity: 0, reason: "quiet" };
  }

  const minFrequency = 80;
  const maxFrequency = 720;
  const minTau = Math.floor(sampleRate / maxFrequency);
  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), input.length - 2);
  const difference = new Float32Array(maxTau + 1);
  const cmnd = new Float32Array(maxTau + 1);

  for (let tau = minTau; tau <= maxTau; tau += 1) {
    let sum = 0;
    const limit = input.length - tau;

    for (let i = 0; i < limit; i += 1) {
      const delta = input[i] - input[i + tau];
      sum += delta * delta;
    }

    difference[tau] = sum;
  }

  cmnd[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau];
    cmnd[tau] = runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum;
  }

  const threshold = 0.14;
  let tauEstimate = -1;

  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) {
        tau += 1;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    return { frequency: null, clarity: 0, reason: "unstable" };
  }

  const betterTau = refineTau(cmnd, tauEstimate);
  const frequency = sampleRate / betterTau;
  const clarity = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]));

  if (frequency < minFrequency || frequency > maxFrequency || clarity < 0.68) {
    return { frequency: null, clarity, reason: "unstable" };
  }

  return { frequency, clarity, reason: "ok" };
}

function refineTau(values, tau) {
  const left = values[tau - 1] ?? values[tau];
  const center = values[tau];
  const right = values[tau + 1] ?? values[tau];
  const denominator = left + right - 2 * center;

  if (Math.abs(denominator) < 0.000001) {
    return tau;
  }

  return tau + (left - right) / (2 * denominator);
}

function updateDisplayFromDetection(detection, rms) {
  const selectedTarget = getTargetNote();
  const activeTarget = getActiveTargetNote();
  const targetForJudgement = activeTarget ?? selectedTarget;

  if (!detection.frequency) {
    elements.currentNote.textContent = "--";
    elements.currentHz.textContent = "--";
    updateScaleMarkers(targetForJudgement.frequency, null);

    if (detection.reason === "quiet") {
      setResult(
        "waiting",
        "音を探しています",
        "もう少しだけマイクに声を近づけます。",
        "声は大きくしすぎず、一定の高さで短く伸ばします。"
      );
    } else {
      setResult(
        "waiting",
        "もう一回試そう",
        "周りの音が入る時は、少し静かな場所で試します。",
        "ハミングや「ルー」にすると、音の高さを拾いやすくなります。"
      );
    }
    return;
  }

  if (!targetForJudgement.frequency) {
    setResult(
      "waiting",
      "次の音を聴こう",
      "休みのあとは、次の目標音を待ちます。",
      "あわてず、次の音から入ります。"
    );
    return;
  }

  const tolerance = Number(elements.toleranceSelect.value);
  const displayFrequency = applyOctaveCorrection(detection.frequency, targetForJudgement.frequency);
  const cents = frequencyToCents(displayFrequency, targetForJudgement.frequency);
  const noteName = frequencyToNearestNote(displayFrequency);

  elements.currentNote.textContent = noteName;
  elements.currentHz.textContent = `${displayFrequency.toFixed(1)} Hz`;
  updateScaleMarkers(targetForJudgement.frequency, displayFrequency);
  recordPhraseResult(cents, displayFrequency, noteName);

  if (Math.abs(cents) <= tolerance) {
    setResult(
      "close",
      "近い",
      "今のあたりをもう一回、同じ感じで試します。",
      "合った瞬間を短く確かめて、すぐ次の一回に進みます。"
    );
  } else if (cents < 0) {
    setResult(
      "low",
      "少し低い",
      "階段を一段上がる感じで、少しだけ高くします。",
      "手を少し上に動かす感じで、もう一回試します。"
    );
  } else {
    setResult(
      "high",
      "少し高い",
      "声を押し上げず、少しだけ低い場所を探します。",
      "力を抜いて、目標音を聴いてから短くまねます。"
    );
  }
}

function frequencyToCents(frequency, targetFrequency) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

function getTransposeSemitones() {
  return Number(elements.transpose.value) || 0;
}

function applyTransposeToFrequency(frequency) {
  return frequency * 2 ** (getTransposeSemitones() / 12);
}

function applyOctaveCorrection(frequency, targetFrequency) {
  if (elements.octaveCorrection.value !== "on" || !targetFrequency) {
    return frequency;
  }

  const candidates = [frequency / 4, frequency / 2, frequency, frequency * 2, frequency * 4]
    .filter((candidate) => candidate >= 80 && candidate <= 720)
    .map((candidate) => ({
      frequency: candidate,
      distance: Math.abs(frequencyToCents(candidate, targetFrequency))
    }))
    .sort((a, b) => a.distance - b.distance);

  if (!candidates.length) {
    return frequency;
  }

  const rawDistance = Math.abs(frequencyToCents(frequency, targetFrequency));
  const best = candidates[0];

  if (best.frequency !== frequency && best.distance + 180 < rawDistance) {
    return best.frequency;
  }

  return frequency;
}

function frequencyToNearestNote(frequency) {
  const midi = Math.round(frequencyToMidi(frequency));
  return midiToNoteName(midi);
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToNoteName(midi) {
  const noteNames = ["ド", "ド#", "レ", "レ#", "ミ", "ファ", "ファ#", "ソ", "ソ#", "ラ", "ラ#", "シ"];
  const octave = Math.floor(midi / 12) - 1;
  const name = noteNames[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

function updateScaleForTarget(target) {
  if (!target?.frequency) {
    return;
  }

  if (state.scaleLocked) {
    return;
  }

  const targetMidi = Math.round(frequencyToMidi(target.frequency));
  const targetOctave = Math.floor(targetMidi / 12) - 1;
  const baseMidi = (targetOctave + 1) * 12 - 12;

  if (baseMidi === state.scaleBaseMidi) {
    return;
  }

  state.scaleBaseMidi = baseMidi;
  renderScaleRows(baseMidi);
}

function renderScaleRows(baseMidi) {
  const offsets = [24, 23, 21, 19, 17, 16, 14, 12, 11, 9, 7, 5, 4, 2, 0];

  elements.scaleRows.textContent = "";
  elements.scaleRows.style.gridTemplateRows = `repeat(${offsets.length}, 1fr)`;
  offsets.forEach((offset) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    row.className = "scale-row";
    label.textContent = midiToNoteName(baseMidi + offset);
    row.appendChild(label);
    elements.scaleRows.appendChild(row);
  });
}

function updateScaleMarkers(targetFrequency, voiceFrequency) {
  if (targetFrequency) {
    updateScaleForTarget({ frequency: targetFrequency });
    elements.targetMarker.style.top = `${frequencyToScalePercent(targetFrequency)}%`;
    elements.targetMarker.style.opacity = "1";
  } else {
    elements.targetMarker.style.opacity = "0";
  }

  if (voiceFrequency) {
    elements.voiceMarker.style.top = `${frequencyToScalePercent(voiceFrequency)}%`;
    elements.voiceMarker.style.opacity = "1";
  } else {
    elements.voiceMarker.style.opacity = "0";
  }
}

function frequencyToScalePercent(frequency) {
  const baseMidi = state.scaleBaseMidi ?? 60;
  const midi = frequencyToMidi(frequency);
  const percent = 100 - ((midi - baseMidi) / 24) * 100;
  return Math.max(2, Math.min(98, percent));
}

function lockScaleToPhrase(events) {
  const noteMidis = events
    .filter((event) => !event.isRest)
    .map((event) => Math.round(frequencyToMidi(event.frequency)));

  if (!noteMidis.length) {
    return;
  }

  const minMidi = Math.min(...noteMidis);
  const maxMidi = Math.max(...noteMidis);
  let baseMidi = Math.floor((minMidi - 2) / 12) * 12;

  if (maxMidi > baseMidi + 24) {
    baseMidi = Math.floor((maxMidi - 22) / 12) * 12;
  }

  state.scaleBaseMidi = baseMidi;
  state.scaleLocked = true;
  renderScaleRows(baseMidi);
}

function buildPhraseFromInput() {
  const bpm = Math.max(40, Math.min(160, Number(elements.phraseBpm.value) || 72));
  const beatSeconds = 60 / bpm;
  const tokens = elements.phraseInput.value
    .replace(/[、,\n]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  let currentSeconds = 0;
  let currentBeats = 0;
  const events = [];

  tokens.forEach((token) => {
    const parsed = parsePhraseToken(token);

    if (!parsed) {
      return;
    }

    const durationSeconds = parsed.beats * beatSeconds;
    const event = {
      ...parsed,
      index: events.length,
      startBeats: currentBeats,
      startSeconds: currentSeconds,
      durationSeconds
    };
    currentSeconds += durationSeconds;
    currentBeats += parsed.beats;
    events.push(event);
  });

  return {
    bpm,
    events,
    totalSeconds: currentSeconds
  };
}

function parsePhraseToken(token) {
  const [rawName, rawBeats] = token.split(":");
  const beats = Math.max(0.25, Math.min(8, Number(rawBeats) || 1));
  const name = rawName.replace("♯", "#").replace("♭", "b");

  if (["休", "休み", "-", "_"].includes(name)) {
    return { name: "休み", frequency: null, beats, isRest: true };
  }

  const frequency = noteNameToFrequency(name);

  if (!frequency) {
    return null;
  }

  const transposedFrequency = applyTransposeToFrequency(frequency);

  return {
    sourceName: name,
    name: frequencyToNearestNote(transposedFrequency),
    frequency: transposedFrequency,
    beats,
    isRest: false
  };
}

function noteNameToFrequency(name) {
  const match = name.match(/^(ド|レ|ミ|ファ|ソ|ラ|シ)([#b]?)([0-8])$/);

  if (!match) {
    return null;
  }

  const baseSemitones = {
    ド: 0,
    レ: 2,
    ミ: 4,
    ファ: 5,
    ソ: 7,
    ラ: 9,
    シ: 11
  };
  const [, note, accidental, octaveText] = match;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const octave = Number(octaveText);
  const midi = (octave + 1) * 12 + baseSemitones[note] + accidentalOffset;

  return 440 * 2 ** ((midi - 69) / 12);
}

function refreshPhrasePreview() {
  const phrase = buildPhraseFromInput();

  if (!state.phrase.isPlaying) {
    state.phrase.review = createEmptyPhraseReview(phrase.events);
  }

  renderPhraseSteps(phrase.events);
  renderStaffPreview(phrase.events);
}

function renderPhraseSteps(events) {
  elements.phraseSteps.textContent = "";

  events.forEach((event) => {
    const step = document.createElement("span");
    const noteLabel = document.createElement("span");
    const reviewLabel = document.createElement("span");

    step.className = "phrase-step";
    step.dataset.index = String(event.index);
    noteLabel.className = "phrase-note";
    noteLabel.textContent = event.name;
    reviewLabel.className = "phrase-review";
    reviewLabel.textContent = "未";
    step.append(noteLabel, reviewLabel);
    elements.phraseSteps.appendChild(step);
  });
  updatePhraseReviewDisplay();
}

function renderStaffPreview(events) {
  const totalBeats = events.reduce((sum, event) => sum + event.beats, 0) || 1;
  const noteMidis = events
    .filter((event) => !event.isRest)
    .map((event) => Math.round(frequencyToMidi(event.frequency)));
  const lowMidi = noteMidis.length ? Math.min(...noteMidis) - 2 : 60;
  const highMidi = noteMidis.length ? Math.max(...noteMidis) + 2 : 72;
  state.phrase.staffLowMidi = lowMidi;
  state.phrase.staffHighMidi = highMidi;
  elements.staffPreview.textContent = "";

  events.forEach((event) => {
    const note = document.createElement("span");
    const left = 4 + (event.startBeats / totalBeats) * 90;
    note.dataset.index = String(event.index);
    note.style.left = `${left}%`;

    if (event.isRest) {
      note.className = "staff-note rest";
      note.textContent = "休";
      note.style.top = "38%";
    } else {
      note.className = "staff-note";
      note.style.top = `${midiToStaffTop(frequencyToMidi(event.frequency), lowMidi, highMidi)}%`;

      const voiceNote = document.createElement("span");
      voiceNote.className = "staff-voice-note";
      voiceNote.dataset.index = String(event.index);
      voiceNote.style.left = `${left}%`;
      voiceNote.style.top = note.style.top;
      elements.staffPreview.appendChild(voiceNote);
    }

    elements.staffPreview.appendChild(note);
  });
}

function midiToStaffTop(midi, lowMidi, highMidi) {
  const range = Math.max(1, highMidi - lowMidi);
  const percent = 82 - ((midi - lowMidi) / range) * 62;
  return Math.max(10, Math.min(82, percent));
}

function markActivePhraseStep(index) {
  elements.phraseSteps.querySelectorAll(".phrase-step").forEach((step) => {
    step.classList.toggle("active", step.dataset.index === String(index));
  });
}

function createEmptyPhraseReview(events) {
  return events.map((event) => ({
    isRest: event.isRest,
    samples: 0,
    sumCents: 0,
    sumFrequency: 0,
    latestNoteName: "--",
    latestFrequency: null
  }));
}

function recordPhraseResult(cents, frequency, noteName) {
  if (!state.phrase.isPlaying || state.phrase.currentIndex < 0) {
    return;
  }

  const review = state.phrase.review[state.phrase.currentIndex];

  if (!review || review.isRest) {
    return;
  }

  review.samples += 1;
  review.sumCents += cents;
  review.sumFrequency += frequency;
  review.latestNoteName = noteName;
  review.latestFrequency = frequency;
  updatePhraseReviewDisplay();
}

function finalizePhraseReview() {
  updatePhraseReviewDisplay(true);
}

function updatePhraseReviewDisplay(showMissed = false) {
  const tolerance = Number(elements.toleranceSelect.value);

  elements.phraseSteps.querySelectorAll(".phrase-step").forEach((step) => {
    const index = Number(step.dataset.index);
    const review = state.phrase.review[index];
    const reviewLabel = step.querySelector(".phrase-review");
    const voiceNote = elements.staffPreview.querySelector(`.staff-voice-note[data-index="${index}"]`);

    step.classList.remove("review-close", "review-low", "review-high", "review-missed");
    voiceNote?.classList.remove("review-close", "review-low", "review-high", "review-missed", "visible");

    if (!reviewLabel || !review) {
      return;
    }

    if (review.isRest) {
      reviewLabel.textContent = "休";
      return;
    }

    if (!review.samples) {
      reviewLabel.textContent = showMissed ? "未" : "待";
      if (showMissed) {
        step.classList.add("review-missed");
        voiceNote?.classList.add("review-missed");
      }
      return;
    }

    const averageCents = review.sumCents / review.samples;
    const averageFrequency = review.sumFrequency / review.samples;
    const voiceTop = midiToStaffTop(
      frequencyToMidi(averageFrequency),
      state.phrase.staffLowMidi,
      state.phrase.staffHighMidi
    );

    if (voiceNote) {
      voiceNote.style.top = `${voiceTop}%`;
      voiceNote.classList.add("visible");
    }

    if (Math.abs(averageCents) <= tolerance) {
      reviewLabel.textContent = `近 ${review.latestNoteName}`;
      step.classList.add("review-close");
      voiceNote?.classList.add("review-close");
    } else if (averageCents < 0) {
      reviewLabel.textContent = `低 ${review.latestNoteName}`;
      step.classList.add("review-low");
      voiceNote?.classList.add("review-low");
    } else {
      reviewLabel.textContent = `高 ${review.latestNoteName}`;
      step.classList.add("review-high");
      voiceNote?.classList.add("review-high");
    }
  });
}

function appendPhraseToken(noteName) {
  const beats = elements.builderBeats.value;
  const token = noteName === "休"
    ? `休:${beats}`
    : `${noteName}${elements.builderOctave.value}:${beats}`;
  const current = elements.phraseInput.value.trim();
  elements.phraseInput.value = current ? `${current} ${token}` : token;
  markCustomPreset();
  refreshPhrasePreview();
}

function removeLastPhraseToken() {
  const tokens = getPhraseTokens();
  tokens.pop();
  elements.phraseInput.value = tokens.join(" ");
  markCustomPreset();
  refreshPhrasePreview();
}

function clearPhraseInput() {
  elements.phraseInput.value = "";
  markCustomPreset();
  refreshPhrasePreview();
}

function getPhraseTokens() {
  return elements.phraseInput.value
    .replace(/[、,\n]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function setActiveTab(tabName) {
  document.body.dataset.activeTab = tabName;
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabButton === tabName);
  });
}

elements.targetSelect.addEventListener("change", updateTargetDisplay);
elements.toleranceSelect.addEventListener("change", () => {
  setResult(
    "waiting",
    "幅を変えました",
    "もう一度、短く声を出して確かめます。",
    "初めて使う時は、ひろめから始めると安心です。"
  );
});
elements.micSensitivity.addEventListener("change", () => {
  if (state.inputGain) {
    state.inputGain.gain.value = Number(elements.micSensitivity.value);
  }

  setResult(
    "waiting",
    "感度を変えました",
    "声の大きさの反応を見ながら調整します。",
    "反応しにくい時は、高めから試します。"
  );
});
elements.speakerGuard.addEventListener("change", () => {
  handleSpeakerGuardChange();
});
elements.transpose.addEventListener("change", () => {
  updateTargetDisplay();
  refreshPhrasePreview();
  setResult(
    "waiting",
    "高さを変えました",
    "低い声で試す時は、1オクターブ下が使いやすいです。",
    "児童用に戻す時は、楽譜どおりに戻します。"
  );
});
elements.octaveCorrection.addEventListener("change", () => {
  const isOn = elements.octaveCorrection.value === "on";

  setResult(
    "waiting",
    isOn ? "補正を使います" : "補正を止めました",
    isOn
      ? "倍音で1オクターブずれて見える時に、目標に近い高さへ寄せます。"
      : "実際に検出した高さをそのまま表示します。",
    isOn
      ? "歌声でずれる時は、まず補正ありで試します。"
      : "本当に1オクターブ違うか確かめたい時に使います。"
  );
});
elements.songPreset.addEventListener("change", () => {
  loadSongPreset(elements.songPreset.value);
});
elements.phraseInput.addEventListener("input", () => {
  markCustomPreset();
  refreshPhrasePreview();
});
elements.phraseBpm.addEventListener("input", () => {
  markCustomPreset();
  refreshPhrasePreview();
});
elements.noteButtons.forEach((button) => {
  button.addEventListener("click", () => appendPhraseToken(button.dataset.noteButton));
});
elements.undoNote.addEventListener("click", removeLastPhraseToken);
elements.clearPhrase.addEventListener("click", clearPhraseInput);
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tabButton));
});
elements.playPhrase.addEventListener("click", playPhrase);
elements.stopPhrase.addEventListener("click", () => stopPhrase(true));
elements.playTarget.addEventListener("click", playTargetTone);
elements.startMic.addEventListener("click", startMic);
elements.stopMic.addEventListener("click", () => stopMic(true));

setupNoteOptions();
setupSongPresets();
resetLiveDisplay();
