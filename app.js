const { CHORD_LEVELS, ROOT_PITCH_CLASSES, buildChord, chooseReadableRoot, fitChordToRange, validateChord } = window.ChordTheory;
const LETTER_STEPS = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const PIANO_SAMPLE_BANK = [
  { midi: 48, name: "C3", url: "assets/samples/piano-C3.mp3" },
  { midi: 51, name: "Eb3", url: "assets/samples/piano-Eb3.mp3" },
  { midi: 54, name: "Gb3", url: "assets/samples/piano-Gb3.mp3" },
  { midi: 57, name: "A3", url: "assets/samples/piano-A3.mp3" },
  { midi: 60, name: "C4", url: "assets/samples/piano-C4.mp3" },
  { midi: 63, name: "Eb4", url: "assets/samples/piano-Eb4.mp3" },
  { midi: 66, name: "Gb4", url: "assets/samples/piano-Gb4.mp3" },
  { midi: 69, name: "A4", url: "assets/samples/piano-A4.mp3" },
  { midi: 72, name: "C5", url: "assets/samples/piano-C5.mp3" },
  { midi: 75, name: "Eb5", url: "assets/samples/piano-Eb5.mp3" }
];
const SESSION_OWNERS = {
  1: {
    image: "assets/level1.png",
    tier: "Level 1 owner",
    name: "Nia, First Chorus",
    description: "Early ears, clean instincts, learning to hear the center before the colors arrive."
  },
  2: {
    image: "assets/level2.png",
    tier: "Level 2 owner",
    name: "Nia, The Changes",
    description: "The harmony opens up: sevenths, tension, and the first real turns through the tune."
  },
  3: {
    image: "assets/level3.png",
    tier: "Level 3 owner",
    name: "Nia, After Hours",
    description: "Late-set command: extensions, altered colors, and the calm of someone who hears ahead."
  }
};

const state = {
  audioContext: null,
  audioGraph: null,
  playbackTimer: null,
  level: 1,
  score: 0,
  answered: 0,
  round: 0,
  currentChord: null,
  currentOptions: [],
  selectedAnswerId: null,
  hasStarted: false,
  isAnswered: false,
  pianoSamples: new Map(),
  pianoSampleLoad: null,
  pianoSampleError: null
};

const scoreEl = document.querySelector("#score");
const promptEl = document.querySelector("#prompt");
const feedbackEl = document.querySelector("#feedback");
const answersEl = document.querySelector("#answers");
const validationPanelEl = document.querySelector("#validation-panel");
const validationSummaryEl = document.querySelector("#validation-summary");
const staffEl = document.querySelector("#staff");
const noteListEl = document.querySelector("#note-list");
const intervalListEl = document.querySelector("#interval-list");
const formulaCheckEl = document.querySelector("#formula-check");
const levelLabelEl = document.querySelector("#level-label");
const roundLabelEl = document.querySelector("#round-label");
const pwaStatusEl = document.querySelector("#pwa-status");
const characterImageEl = document.querySelector("#character-image");
const characterTierEl = document.querySelector("#character-tier");
const characterNameEl = document.querySelector("#character-name");
const characterDescriptionEl = document.querySelector("#character-description");
const startButton = document.querySelector("#start-button");
const replayButton = document.querySelector("#replay-button");
const nextButton = document.querySelector("#next-button");
const levelButtons = Array.from(document.querySelectorAll(".level-button"));

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createReverbImpulse(ctx, seconds = 2.8, decay = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const envelope = (1 - i / length) ** decay;
      data[i] = (Math.random() * 2 - 1) * envelope * 0.34;
    }
  }

  return impulse;
}

function createAudioGraph(ctx) {
  const dry = ctx.createGain();
  const reverbSend = ctx.createGain();
  const convolver = ctx.createConvolver();
  const reverbReturn = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  const master = ctx.createGain();

  convolver.buffer = createReverbImpulse(ctx);
  dry.gain.value = 0.82;
  reverbSend.gain.value = 0.34;
  reverbReturn.gain.value = 0.4;
  master.gain.value = 0.88;
  compressor.threshold.value = -18;
  compressor.knee.value = 22;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.22;

  dry.connect(compressor);
  reverbSend.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);

  return { dry, reverbSend };
}

function ensureAudio() {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
    state.audioGraph = createAudioGraph(state.audioContext);
  }

  if (state.audioContext.state === "suspended") {
    return state.audioContext.resume();
  }

  return Promise.resolve();
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function nearestPianoSample(midi) {
  return PIANO_SAMPLE_BANK.reduce((best, sample) => (
    Math.abs(sample.midi - midi) < Math.abs(best.midi - midi) ? sample : best
  ), PIANO_SAMPLE_BANK[0]);
}

async function loadPianoSamples(ctx) {
  if (state.pianoSampleLoad) {
    return state.pianoSampleLoad;
  }

  state.pianoSampleLoad = Promise.all(PIANO_SAMPLE_BANK.map(async (sample) => {
    const response = await fetch(sample.url);
    if (!response.ok) {
      throw new Error(`Could not load ${sample.url}`);
    }

    const data = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data);
    state.pianoSamples.set(sample.midi, buffer);
  })).then(() => true).catch((error) => {
    state.pianoSampleError = error;
    console.warn("Sampled piano could not load; using fallback synth.", error);
    return false;
  });

  return state.pianoSampleLoad;
}

function buildVoicing(quality) {
  const root = chooseReadableRoot(randomItem(ROOT_PITCH_CLASSES), quality);
  const inversion = Math.floor(Math.random() * quality.formula.length);
  return fitChordToRange(buildChord(root, quality, inversion));
}

async function playCurrentChord() {
  if (!state.currentChord) {
    return;
  }

  await ensureAudio();
  const ctx = state.audioContext;
  const graph = state.audioGraph;
  const canUseSamples = await loadPianoSamples(ctx);
  const now = ctx.currentTime;
  const blockStart = now;
  const blockDuration = 3.25;
  const arpeggioStart = blockStart + blockDuration + 0.42;
  const arpeggioStep = 0.52;
  const arpeggioNoteDuration = 1.15;
  const resonanceTail = 2.6;
  const playbackDuration = blockDuration + 0.42 + (state.currentChord.notes.length - 1) * arpeggioStep + arpeggioNoteDuration + resonanceTail;

  function scheduleSampledPianoNote(midi, startTime, holdDuration, gainLevel) {
    const sample = nearestPianoSample(midi);
    const buffer = state.pianoSamples.get(sample.midi);
    const source = ctx.createBufferSource();
    const noteOutput = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter();
    const stopTime = startTime + holdDuration + resonanceTail + 0.35;

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(2 ** ((midi - sample.midi) / 12), startTime);

    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(7200, startTime);
    toneFilter.Q.value = 0.7;

    noteOutput.gain.setValueAtTime(0.0001, startTime);
    noteOutput.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.01);
    noteOutput.gain.exponentialRampToValueAtTime(gainLevel * 0.62, startTime + 0.75);
    noteOutput.gain.setValueAtTime(gainLevel * 0.62, startTime + holdDuration);
    noteOutput.gain.exponentialRampToValueAtTime(0.0001, startTime + holdDuration + resonanceTail);

    source.connect(toneFilter);
    toneFilter.connect(noteOutput);
    noteOutput.connect(graph.dry);
    noteOutput.connect(graph.reverbSend);
    source.start(startTime);
    source.stop(Math.min(stopTime, startTime + buffer.duration / source.playbackRate.value));
  }

  function scheduleSynthPianoNote(midi, startTime, holdDuration, gainLevel, noteIndex) {
    const frequency = midiToFrequency(midi);
    const noteOutput = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();
    const hammerGain = ctx.createGain();
    const hammerFilter = ctx.createBiquadFilter();
    const stopTime = startTime + holdDuration + resonanceTail + 0.2;
    const partials = [
      { ratio: 1, level: 1, type: "triangle", detune: -2.5 },
      { ratio: 1.003, level: 0.7, type: "sine", detune: 2.5 },
      { ratio: 2, level: 0.28, type: "sine", detune: -1 },
      { ratio: 3.01, level: 0.16, type: "sine", detune: 1.5 },
      { ratio: 4.02, level: 0.08, type: "triangle", detune: 0 }
    ];

    noteOutput.gain.value = gainLevel;
    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(Math.min(8200, Math.max(1800, frequency * 8)), startTime);
    toneFilter.frequency.exponentialRampToValueAtTime(Math.min(5200, Math.max(1200, frequency * 4.5)), startTime + 0.65);
    toneFilter.Q.value = 1.25;

    bodyGain.gain.setValueAtTime(0.0001, startTime);
    bodyGain.gain.exponentialRampToValueAtTime(1, startTime + 0.012);
    bodyGain.gain.exponentialRampToValueAtTime(0.42, startTime + 0.55);
    bodyGain.gain.setValueAtTime(0.42, startTime + holdDuration);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + holdDuration + resonanceTail);

    partials.forEach((partial, partialIndex) => {
      const oscillator = ctx.createOscillator();
      const partialGain = ctx.createGain();
      oscillator.type = partial.type;
      oscillator.frequency.setValueAtTime(frequency * partial.ratio, startTime);
      oscillator.detune.setValueAtTime(partial.detune + noteIndex * 0.45, startTime);
      partialGain.gain.value = partial.level / Math.sqrt(partialIndex + 1);
      oscillator.connect(partialGain);
      partialGain.connect(bodyGain);
      oscillator.start(startTime);
      oscillator.stop(stopTime);
    });

    const noiseLength = Math.floor(ctx.sampleRate * 0.055);
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength) ** 2;
    }

    const hammer = ctx.createBufferSource();
    hammer.buffer = noiseBuffer;
    hammerFilter.type = "bandpass";
    hammerFilter.frequency.value = Math.min(6400, Math.max(1600, frequency * 6));
    hammerFilter.Q.value = 0.85;
    hammerGain.gain.setValueAtTime(0.28, startTime);
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.055);
    hammer.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(noteOutput);
    hammer.start(startTime);
    hammer.stop(startTime + 0.06);

    bodyGain.connect(toneFilter);
    toneFilter.connect(noteOutput);
    noteOutput.connect(graph.dry);
    noteOutput.connect(graph.reverbSend);
  }

  const schedulePianoNote = canUseSamples ? scheduleSampledPianoNote : scheduleSynthPianoNote;

  state.currentChord.notes.forEach((note, index) => {
    schedulePianoNote(note.midi, blockStart + index * 0.012, blockDuration, 0.38 / state.currentChord.notes.length, index);
  });

  state.currentChord.notes.forEach((note, index) => {
    schedulePianoNote(note.midi, arpeggioStart + index * arpeggioStep, arpeggioNoteDuration, 0.2, index);
  });

  document.body.classList.remove("playing");
  requestAnimationFrame(() => document.body.classList.add("playing"));
  window.clearTimeout(state.playbackTimer);
  state.playbackTimer = window.setTimeout(() => document.body.classList.remove("playing"), playbackDuration * 1000);
}

function createRound() {
  const level = CHORD_LEVELS[state.level];
  const correct = randomItem(level.qualities);
  const distractors = shuffle(level.qualities.filter((quality) => quality.id !== correct.id)).slice(0, 2);
  const voicing = buildVoicing(correct);
  const validation = validateChord(voicing);

  state.currentChord = {
    quality: correct,
    root: voicing.root,
    inversion: voicing.inversion,
    notes: voicing.notes,
    intervalLabels: voicing.intervalLabels,
    validation,
    isValidated: validation.matches
  };
  state.currentOptions = shuffle([correct, ...distractors]);
  state.selectedAnswerId = null;
  state.isAnswered = false;
  state.round += 1;
}

function render() {
  const level = CHORD_LEVELS[state.level];
  renderSessionOwner();
  scoreEl.textContent = `${state.score} / ${state.answered}`;
  levelLabelEl.textContent = level.label;
  roundLabelEl.textContent = state.hasStarted ? `Round ${state.round}` : "Ready";
  replayButton.disabled = !state.hasStarted;
  nextButton.disabled = !state.hasStarted || !state.isAnswered;
  startButton.textContent = state.hasStarted ? "Restart" : "Start";

  levelButtons.forEach((button) => {
    const isActive = Number(button.dataset.level) === state.level;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  answersEl.innerHTML = "";

  if (!state.hasStarted) {
    promptEl.textContent = "Start a round, listen to the chord, then choose its quality.";
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    renderValidation();
    return;
  }

  promptEl.textContent = "Which chord quality did you hear?";

  state.currentOptions.forEach((quality) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.textContent = quality.name;
    button.disabled = state.isAnswered;
    button.dataset.answer = quality.id;

    if (state.isAnswered && quality.id === state.currentChord.quality.id) {
      button.classList.add("correct");
    }

    if (state.isAnswered && quality.id === state.selectedAnswerId && quality.id !== state.currentChord.quality.id) {
      button.classList.add("incorrect");
    }

    button.addEventListener("click", () => answerRound(quality));
    answersEl.append(button);
  });

  renderValidation();
}

function renderSessionOwner() {
  const owner = SESSION_OWNERS[state.level];
  characterImageEl.src = owner.image;
  characterImageEl.alt = owner.name;
  characterTierEl.textContent = owner.tier;
  characterNameEl.textContent = owner.name;
  characterDescriptionEl.textContent = owner.description;
}

function staffY(note, clef) {
  if (clef === "bass") {
    const stepFromG2 = note.octave * 7 + LETTER_STEPS[note.letter] - (2 * 7 + LETTER_STEPS.G);
    return 234 - stepFromG2 * 9;
  }

  const stepFromE4 = note.octave * 7 + LETTER_STEPS[note.letter] - (4 * 7 + LETTER_STEPS.E);
  return 116 - stepFromE4 * 9;
}

function staffForNote(note) {
  return note.midi < 60 ? "bass" : "treble";
}

function ledgerLinesFor(y, x, clef) {
  const lines = [];
  const topLine = clef === "bass" ? 162 : 44;
  const bottomLine = clef === "bass" ? 234 : 116;

  for (let lineY = topLine - 18; lineY >= y - 1; lineY -= 18) {
    lines.push(`<line class="ledger" x1="${x - 16}" y1="${lineY}" x2="${x + 16}" y2="${lineY}"></line>`);
  }

  for (let lineY = bottomLine + 18; lineY <= y + 1; lineY += 18) {
    lines.push(`<line class="ledger" x1="${x - 16}" y1="${lineY}" x2="${x + 16}" y2="${lineY}"></line>`);
  }

  return lines.join("");
}

function renderStaff(notes) {
  const noteGap = notes.length > 4 ? 82 : 98;
  const startX = 170;
  const width = Math.max(560, startX + (notes.length - 1) * noteGap + 90);
  const trebleLines = [44, 62, 80, 98, 116]
    .map((y) => `<line class="staff-line" x1="82" y1="${y}" x2="${width - 32}" y2="${y}"></line>`)
    .join("");
  const bassLines = [162, 180, 198, 216, 234]
    .map((y) => `<line class="staff-line" x1="82" y1="${y}" x2="${width - 32}" y2="${y}"></line>`)
    .join("");
  const noteMarks = notes.map((note, index) => {
    const x = startX + index * noteGap;
    const clef = staffForNote(note);
    const y = staffY(note, clef);
    const accidental = note.accidental ? `<text class="accidental" x="${x - 35}" y="${y + 6}">${note.accidental}</text>` : "";
    const stemY = y > 82 ? y - 48 : y + 48;
    return `
      <g>
        ${ledgerLinesFor(y, x, clef)}
        ${accidental}
        <ellipse class="notehead" cx="${x}" cy="${y}" rx="12" ry="8" transform="rotate(-18 ${x} ${y})"></ellipse>
        <line class="stem" x1="${x + 10}" y1="${y - 1}" x2="${x + 10}" y2="${stemY}"></line>
        <text class="note-label" x="${x}" y="276">${note.spelling}</text>
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} 292" role="img" aria-label="Grand staff showing ${notes.map((note) => note.spelling).join(", ")}">
      ${trebleLines}
      ${bassLines}
      <line class="staff-connector" x1="82" y1="44" x2="82" y2="234"></line>
      <text class="clef treble-clef" x="28" y="119">𝄞</text>
      <text class="clef bass-clef" x="36" y="231">𝄢</text>
      ${noteMarks}
    </svg>
  `;
}

function renderValidation() {
  if (!state.hasStarted || !state.isAnswered || !state.currentChord) {
    validationPanelEl.classList.add("hidden");
    staffEl.innerHTML = "";
    return;
  }

  const chord = state.currentChord;
  const quality = chord.quality;
  const rootName = chord.root.spelling;
  const noteNames = chord.notes.map((note) => note.spelling);
  const intervalNames = chord.notes.map((note) => `${note.spelling} = ${note.intervalLabel}`);
  validationPanelEl.classList.remove("hidden");
  validationSummaryEl.textContent = `${rootName} ${quality.name}: the app generated this voicing and judged the answer from this exact chord quality.`;
  staffEl.innerHTML = renderStaff(chord.notes);
  noteListEl.textContent = noteNames.join(" - ");
  intervalListEl.textContent = intervalNames.join(" - ");
  formulaCheckEl.textContent = chord.isValidated ? "Generated notes and spellings match the chord formula." : "Mismatch detected.";
  formulaCheckEl.className = chord.isValidated ? "check-good" : "check-bad";
}

async function startGame() {
  state.score = 0;
  state.answered = 0;
  state.round = 0;
  state.hasStarted = true;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  createRound();
  render();
  await playCurrentChord();
}

async function nextRound() {
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  createRound();
  render();
  await playCurrentChord();
}

function answerRound(selected) {
  if (state.isAnswered) {
    return;
  }

  const correct = state.currentChord.quality;
  const isCorrect = selected.id === correct.id;
  state.isAnswered = true;
  state.selectedAnswerId = selected.id;
  state.answered += 1;

  if (isCorrect) {
    state.score += 1;
    feedbackEl.textContent = `Correct: ${correct.name}.`;
    feedbackEl.className = "feedback good";
  } else {
    feedbackEl.textContent = `Not quite. The answer was ${correct.name}.`;
    feedbackEl.className = "feedback bad";
  }

  render();
}

function setLevel(level) {
  state.level = level;
  state.hasStarted = false;
  state.currentChord = null;
  state.currentOptions = [];
  state.selectedAnswerId = null;
  state.isAnswered = false;
  render();
}

startButton.addEventListener("click", startGame);
nextButton.addEventListener("click", nextRound);
replayButton.addEventListener("click", playCurrentChord);
levelButtons.forEach((button) => {
  button.addEventListener("click", () => setLevel(Number(button.dataset.level)));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(() => {
      navigator.serviceWorker.ready.then(confirmOfflineCache);
    });
  });
}

async function confirmOfflineCache() {
  if (!("caches" in window)) {
    pwaStatusEl.textContent = "Offline cache unavailable";
    return;
  }

  const cache = await caches.open("chord-ear-trainer-v19");
  const requiredAssets = [
    "./",
    "./index.html",
    "./styles.css",
    "./styles.css?v=3",
    "./styles.css?v=4",
    "./styles.css?v=5",
    "./styles.css?v=6",
    "./styles.css?v=7",
    "./styles.css?v=8",
    "./styles.css?v=9",
    "./styles.css?v=10",
    "./styles.css?v=11",
    "./styles.css?v=12",
    "./styles.css?v=13",
    "./styles.css?v=14",
    "./styles.css?v=15",
    "./styles.css?v=16",
    "./styles.css?v=17",
    "./styles.css?v=18",
    "./styles.css?v=19",
    "./assets/level1.png",
    "./assets/level2.png",
    "./assets/level3.png",
    "./assets/samples/ATTRIBUTION.md",
    "./assets/samples/piano-A3.mp3",
    "./assets/samples/piano-A4.mp3",
    "./assets/samples/piano-C3.mp3",
    "./assets/samples/piano-C4.mp3",
    "./assets/samples/piano-C5.mp3",
    "./assets/samples/piano-Eb3.mp3",
    "./assets/samples/piano-Eb4.mp3",
    "./assets/samples/piano-Eb5.mp3",
    "./assets/samples/piano-Gb3.mp3",
    "./assets/samples/piano-Gb4.mp3",
    "./theory.js",
    "./theory.js?v=6",
    "./theory.js?v=7",
    "./theory.js?v=8",
    "./theory.js?v=9",
    "./theory.js?v=10",
    "./theory.js?v=11",
    "./theory.js?v=12",
    "./theory.js?v=13",
    "./theory.js?v=14",
    "./theory.js?v=15",
    "./theory.js?v=16",
    "./theory.js?v=17",
    "./theory.js?v=18",
    "./theory.js?v=19",
    "./app.js",
    "./app.js?v=3",
    "./app.js?v=4",
    "./app.js?v=5",
    "./app.js?v=6",
    "./app.js?v=7",
    "./app.js?v=8",
    "./app.js?v=9",
    "./app.js?v=10",
    "./app.js?v=11",
    "./app.js?v=12",
    "./app.js?v=13",
    "./app.js?v=14",
    "./app.js?v=15",
    "./app.js?v=16",
    "./app.js?v=17",
    "./app.js?v=18",
    "./app.js?v=19",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
  ];
  const matches = await Promise.all(requiredAssets.map((asset) => cache.match(asset)));
  pwaStatusEl.textContent = matches.every(Boolean) ? "Offline ready" : "Offline cache pending";
}

render();
