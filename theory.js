(function (root) {
  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const NATURAL_PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACCIDENTAL_TEXT = {
    "-2": "bb",
    "-1": "b",
    "0": "",
    "1": "#",
    "2": "x"
  };
  const ACCIDENTAL_OFFSET = {
    bb: -2,
    b: -1,
    "": 0,
    "#": 1,
    x: 2
  };

  const ROOTS = [
    { name: "B#", letter: "B", accidental: "#", midi: 60 },
    { name: "C", letter: "C", accidental: "", midi: 60 },
    { name: "C#", letter: "C", accidental: "#", midi: 61 },
    { name: "Db", letter: "D", accidental: "b", midi: 61 },
    { name: "D", letter: "D", accidental: "", midi: 62 },
    { name: "D#", letter: "D", accidental: "#", midi: 63 },
    { name: "Eb", letter: "E", accidental: "b", midi: 63 },
    { name: "E", letter: "E", accidental: "", midi: 64 },
    { name: "E#", letter: "E", accidental: "#", midi: 65 },
    { name: "Fb", letter: "F", accidental: "b", midi: 64 },
    { name: "F", letter: "F", accidental: "", midi: 65 },
    { name: "F#", letter: "F", accidental: "#", midi: 66 },
    { name: "Gb", letter: "G", accidental: "b", midi: 66 },
    { name: "G", letter: "G", accidental: "", midi: 67 },
    { name: "G#", letter: "G", accidental: "#", midi: 68 },
    { name: "Ab", letter: "A", accidental: "b", midi: 68 },
    { name: "A", letter: "A", accidental: "", midi: 69 },
    { name: "A#", letter: "A", accidental: "#", midi: 70 },
    { name: "Bb", letter: "B", accidental: "b", midi: 70 },
    { name: "B", letter: "B", accidental: "", midi: 71 },
    { name: "Cb", letter: "C", accidental: "b", midi: 59 }
  ];
  const ROOT_PITCH_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const VOICING_RANGE = {
    minMidi: 48,
    maxMidi: 76,
    centerMidi: 60
  };

  const CHORD_LEVELS = {
    1: {
      label: "Level 1: triads",
      qualities: [
        { id: "major", name: "Major", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"]] },
        { id: "minor", name: "Minor", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 7, "5"]] },
        { id: "diminished", name: "Diminished", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 6, "b5"]] },
        { id: "augmented", name: "Augmented", formula: [[1, 0, "1"], [3, 4, "3"], [5, 8, "#5"]] }
      ]
    },
    2: {
      label: "Level 2: seventh chords",
      qualities: [
        { id: "maj7", name: "Major 7", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 11, "7"]] },
        { id: "dom7", name: "Dominant 7", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 10, "b7"]] },
        { id: "min7", name: "Minor 7", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 7, "5"], [7, 10, "b7"]] },
        { id: "minmaj7", name: "Minor-major 7", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 7, "5"], [7, 11, "7"]] },
        { id: "halfdim7", name: "Half-diminished 7", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 6, "b5"], [7, 10, "b7"]] },
        { id: "dim7", name: "Diminished 7", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 6, "b5"], [7, 9, "bb7"]] },
        { id: "aug7", name: "Augmented 7", formula: [[1, 0, "1"], [3, 4, "3"], [5, 8, "#5"], [7, 10, "b7"]] }
      ]
    },
    3: {
      label: "Level 3: ninth chords",
      qualities: [
        { id: "maj9", name: "Major 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 11, "7"], [9, 14, "9"]] },
        { id: "dom9", name: "Dominant 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 10, "b7"], [9, 14, "9"]] },
        { id: "min9", name: "Minor 9", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 7, "5"], [7, 10, "b7"], [9, 14, "9"]] },
        { id: "minmaj9", name: "Minor-major 9", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 7, "5"], [7, 11, "7"], [9, 14, "9"]] },
        { id: "halfdim9", name: "Half-diminished 9", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 6, "b5"], [7, 10, "b7"], [9, 14, "9"]] },
        { id: "dim9", name: "Diminished 9", formula: [[1, 0, "1"], [3, 3, "b3"], [5, 6, "b5"], [7, 9, "bb7"], [9, 14, "9"]] },
        { id: "augmaj9", name: "Augmented major 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 8, "#5"], [7, 11, "7"], [9, 14, "9"]] },
        { id: "aug9", name: "Augmented 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 8, "#5"], [7, 10, "b7"], [9, 14, "9"]] },
        { id: "dom7flat9", name: "Dominant 7 flat 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 10, "b7"], [9, 13, "b9"]] },
        { id: "dom7sharp9", name: "Dominant 7 sharp 9", formula: [[1, 0, "1"], [3, 4, "3"], [5, 7, "5"], [7, 10, "b7"], [9, 15, "#9"]] }
      ]
    }
  };

  const ALL_QUALITIES = Object.values(CHORD_LEVELS).flatMap((level) => level.qualities);

  function octaveForMidi(midi) {
    return Math.floor(midi / 12) - 1;
  }

  function naturalMidi(letter, octave) {
    return (octave + 1) * 12 + NATURAL_PITCH_CLASS[letter];
  }

  function octaveForSpelling(letter, accidental, midi) {
    const accidentalOffset = ACCIDENTAL_OFFSET[accidental];
    for (let octave = 0; octave <= 8; octave += 1) {
      if (naturalMidi(letter, octave) + accidentalOffset === midi) {
        return octave;
      }
    }

    throw new Error(`Cannot assign octave for ${letter}${accidental} at MIDI ${midi}`);
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function cloneNote(note) {
    return {
      letter: note.letter,
      accidental: note.accidental,
      octave: note.octave,
      midi: note.midi,
      degree: note.degree,
      interval: note.interval,
      intervalLabel: note.intervalLabel,
      spelling: note.spelling,
      name: note.name
    };
  }

  function spellDegree(rootNote, degree, interval, intervalLabel) {
    const rootLetterIndex = LETTERS.indexOf(rootNote.letter);
    const degreeOffset = degree - 1;
    const letter = LETTERS[mod(rootLetterIndex + degreeOffset, LETTERS.length)];
    const octave = rootNote.octave + Math.floor((rootLetterIndex + degreeOffset) / LETTERS.length);
    const midi = rootNote.midi + interval;
    const accidentalOffset = midi - naturalMidi(letter, octave);
    const accidental = ACCIDENTAL_TEXT[String(accidentalOffset)];

    if (accidental === undefined) {
      throw new Error(`Cannot spell degree ${degree} from ${rootNote.name}: accidental offset ${accidentalOffset}`);
    }

    return {
      letter,
      accidental,
      octave,
      midi,
      degree,
      interval,
      intervalLabel,
      spelling: `${letter}${accidental}`,
      name: `${letter}${accidental}${octave}`
    };
  }

  function transposeNote(note, octaves) {
    const transposed = cloneNote(note);
    transposed.octave += octaves;
    transposed.midi += octaves * 12;
    transposed.name = `${transposed.letter}${transposed.accidental}${transposed.octave}`;
    transposed.spelling = `${transposed.letter}${transposed.accidental}`;
    return transposed;
  }

  function transposeChord(chord, octaves) {
    return {
      root: transposeNote(chord.root, octaves),
      quality: chord.quality,
      inversion: chord.inversion,
      notes: chord.notes.map((note) => transposeNote(note, octaves)),
      intervals: [...chord.intervals],
      formulaLabels: [...chord.formulaLabels],
      intervalLabels: [...chord.intervalLabels]
    };
  }

  function rangeScore(chord, range) {
    const midis = chord.notes.map((note) => note.midi);
    const low = Math.min(...midis);
    const high = Math.max(...midis);
    const average = midis.reduce((sum, midi) => sum + midi, 0) / midis.length;
    const below = Math.max(0, range.minMidi - low);
    const above = Math.max(0, high - range.maxMidi);

    return (below + above) * 1000 + Math.abs(average - range.centerMidi);
  }

  function fitChordToRange(chord, range = VOICING_RANGE) {
    return [-3, -2, -1, 0, 1, 2, 3]
      .map((octaves) => {
        const candidate = transposeChord(chord, octaves);
        return {
          chord: candidate,
          score: rangeScore(candidate, range)
        };
      })
      .sort((a, b) => a.score - b.score)[0]
      .chord;
  }

  function rootNote(rootChoice) {
    const octave = octaveForSpelling(rootChoice.letter, rootChoice.accidental, rootChoice.midi);
    return {
      letter: rootChoice.letter,
      accidental: rootChoice.accidental,
      octave,
      midi: rootChoice.midi,
      degree: 1,
      interval: 0,
      intervalLabel: "1",
      spelling: rootChoice.name,
      name: `${rootChoice.name}${octave}`
    };
  }

  function accidentalScore(accidental) {
    if (accidental === "") {
      return 0;
    }

    if (accidental === "#" || accidental === "b") {
      return 1;
    }

    return 6;
  }

  function spellingPenalty(note) {
    const awkwardSingles = ["E#", "B#", "Cb", "Fb"];
    return awkwardSingles.includes(note.spelling) ? 2 : 0;
  }

  function readabilityScore(chord) {
    return chord.notes.reduce((sum, note) => (
      sum + accidentalScore(note.accidental) + spellingPenalty(note)
    ), 0);
  }

  function rootNamePenalty(rootChoice) {
    const awkwardRoots = ["E#", "B#", "Cb", "Fb"];
    return awkwardRoots.includes(rootChoice.name) ? 1 : 0;
  }

  function rootsForPitchClass(pitchClass) {
    return ROOTS.filter((candidate) => mod(candidate.midi, 12) === mod(pitchClass, 12));
  }

  function chooseReadableRoot(pitchClass, quality) {
    const candidates = rootsForPitchClass(pitchClass);
    if (!candidates.length) {
      throw new Error(`No roots available for pitch class ${pitchClass}`);
    }

    return candidates
      .map((candidate, index) => {
        try {
          return {
            candidate,
            index,
            score: readabilityScore(buildChord(candidate, quality, 0)),
            rootPenalty: rootNamePenalty(candidate)
          };
        } catch (error) {
          return {
            candidate,
            index,
            score: Number.POSITIVE_INFINITY,
            rootPenalty: Number.POSITIVE_INFINITY
          };
        }
      })
      .sort((a, b) => a.score - b.score || a.rootPenalty - b.rootPenalty || a.index - b.index)[0]
      .candidate;
  }

  function buildChord(rootChoice, quality, inversion = 0) {
    const root = rootNote(rootChoice);
    const baseNotes = quality.formula.map(([degree, interval, label]) => spellDegree(root, degree, interval, label));
    const notes = baseNotes.map((note, index) => index < inversion ? transposeNote(note, 1) : cloneNote(note));
    notes.sort((a, b) => a.midi - b.midi);

    return {
      root,
      quality,
      inversion,
      notes,
      intervals: quality.formula.map(([, interval]) => interval),
      formulaLabels: quality.formula.map(([, , label]) => label),
      intervalLabels: notes.map((note) => note.intervalLabel)
    };
  }

  function normalizeIntervals(intervals) {
    return [...new Set(intervals.map((interval) => mod(interval, 12)))].sort((a, b) => a - b);
  }

  function validateChord(chord) {
    const expectedPitchClasses = normalizeIntervals(chord.quality.formula.map(([, interval]) => interval));
    const actualPitchClasses = normalizeIntervals(chord.notes.map((note) => note.midi - chord.root.midi));
    const audioMatches = expectedPitchClasses.length === actualPitchClasses.length
      && expectedPitchClasses.every((interval, index) => interval === actualPitchClasses[index]);

    const baseChord = buildChord({ ...chord.root, name: `${chord.root.letter}${chord.root.accidental}`, midi: chord.root.midi }, chord.quality, 0);
    const expectedByDegree = new Map(baseChord.notes.map((note) => [note.degree, note]));
    const spellingMatches = chord.notes.every((note) => {
      const expected = expectedByDegree.get(note.degree);
      return Boolean(expected)
        && note.letter === expected.letter
        && note.accidental === expected.accidental
        && mod(note.midi - expected.midi, 12) === 0;
    });

    return {
      audioMatches,
      spellingMatches,
      matches: audioMatches && spellingMatches
    };
  }

  function validateAllStandards() {
    const failures = [];

    ROOT_PITCH_CLASSES.forEach((pitchClass) => {
      ALL_QUALITIES.forEach((quality) => {
        const rootChoice = chooseReadableRoot(pitchClass, quality);
        for (let inversion = 0; inversion < quality.formula.length; inversion += 1) {
          const chord = buildChord(rootChoice, quality, inversion);
          const validation = validateChord(chord);
          if (!validation.matches) {
            failures.push({
              root: rootChoice.name,
              quality: quality.name,
              inversion,
              validation,
              notes: chord.notes.map((note) => note.name),
              intervals: chord.notes.map((note) => `${note.name}:${note.intervalLabel}`)
            });
          }
        }
      });
    });

    return {
      checked: ROOT_PITCH_CLASSES.length * ALL_QUALITIES.reduce((sum, quality) => sum + quality.formula.length, 0),
      failures
    };
  }

  const api = {
    CHORD_LEVELS,
    ROOTS,
    ROOT_PITCH_CLASSES,
    VOICING_RANGE,
    LETTERS,
    ALL_QUALITIES,
    buildChord,
    chooseReadableRoot,
    fitChordToRange,
    readabilityScore,
    validateChord,
    validateAllStandards
  };

  root.ChordTheory = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
