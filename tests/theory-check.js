const theory = require("../theory.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function root(name) {
  const found = theory.ROOTS.find((candidate) => candidate.name === name);
  assert(found, `Missing root ${name}`);
  return found;
}

function quality(id) {
  const found = theory.ALL_QUALITIES.find((candidate) => candidate.id === id);
  assert(found, `Missing quality ${id}`);
  return found;
}

function noteNames(rootName, qualityId) {
  return theory.buildChord(root(rootName), quality(qualityId), 0).notes.map((note) => note.name);
}

function noteSpellings(rootName, qualityId) {
  return theory.buildChord(root(rootName), quality(qualityId), 0).notes.map((note) => note.spelling);
}

function noteIntervalPairs(rootName, qualityId, inversion) {
  return theory.buildChord(root(rootName), quality(qualityId), inversion)
    .notes
    .map((note) => `${note.spelling}=${note.intervalLabel}`);
}

function readableSpellings(pitchClass, qualityId) {
  const selectedRoot = theory.chooseReadableRoot(pitchClass, quality(qualityId));
  return theory.buildChord(selectedRoot, quality(qualityId), 0)
    .notes
    .map((note) => note.spelling);
}

function expectNotes(rootName, qualityId, expected) {
  const actual = noteNames(rootName, qualityId);
  assert(
    actual.join(" ") === expected.join(" "),
    `${rootName} ${qualityId}: expected ${expected.join(" ")}, got ${actual.join(" ")}`
  );
}

function expectSpellings(rootName, qualityId, expected) {
  const actual = noteSpellings(rootName, qualityId);
  assert(
    actual.join(" ") === expected.join(" "),
    `${rootName} ${qualityId}: expected visible spelling ${expected.join(" ")}, got ${actual.join(" ")}`
  );
}

function expectPairs(rootName, qualityId, inversion, expected) {
  const actual = noteIntervalPairs(rootName, qualityId, inversion);
  assert(
    actual.join(" ") === expected.join(" "),
    `${rootName} ${qualityId} inversion ${inversion}: expected ${expected.join(" ")}, got ${actual.join(" ")}`
  );
}

function expectReadable(pitchClass, qualityId, expected) {
  const actual = readableSpellings(pitchClass, qualityId);
  assert(
    actual.join(" ") === expected.join(" "),
    `pitch class ${pitchClass} ${qualityId}: expected readable spelling ${expected.join(" ")}, got ${actual.join(" ")}`
  );
}

function expectReadableRootsAreOptimal() {
  theory.ROOT_PITCH_CLASSES.forEach((pitchClass) => {
    theory.ALL_QUALITIES.forEach((qualityChoice) => {
      const candidates = theory.ROOTS.filter((candidate) => candidate.midi % 12 === pitchClass);
      const scoredCandidates = candidates.flatMap((candidate) => {
        try {
          return [{
            candidate,
            score: theory.readabilityScore(theory.buildChord(candidate, qualityChoice, 0))
          }];
        } catch (error) {
          return [];
        }
      });
      const bestScore = Math.min(...scoredCandidates.map((candidate) => candidate.score));
      const selectedRoot = theory.chooseReadableRoot(pitchClass, qualityChoice);
      const selectedChord = theory.buildChord(selectedRoot, qualityChoice, 0);
      const selectedScore = theory.readabilityScore(selectedChord);
      assert(
        selectedScore === bestScore,
        `pitch class ${pitchClass} ${qualityChoice.id}: ${selectedRoot.name} scored ${selectedScore}, best score is ${bestScore}`
      );
    });
  });
}

function expectPlayableVoicingsFitRange() {
  const { minMidi, maxMidi } = theory.VOICING_RANGE;

  theory.ROOT_PITCH_CLASSES.forEach((pitchClass) => {
    theory.ALL_QUALITIES.forEach((qualityChoice) => {
      const rootChoice = theory.chooseReadableRoot(pitchClass, qualityChoice);
      for (let inversion = 0; inversion < qualityChoice.formula.length; inversion += 1) {
        const chord = theory.fitChordToRange(theory.buildChord(rootChoice, qualityChoice, inversion));
        const validation = theory.validateChord(chord);
        const midis = chord.notes.map((note) => note.midi);
        const low = Math.min(...midis);
        const high = Math.max(...midis);

        assert(
          validation.matches,
          `${rootChoice.name} ${qualityChoice.id} inversion ${inversion}: fitted voicing failed formula validation`
        );
        assert(
          low >= minMidi && high <= maxMidi,
          `${rootChoice.name} ${qualityChoice.id} inversion ${inversion}: expected MIDI range ${minMidi}-${maxMidi}, got ${low}-${high}`
        );
      }
    });
  });
}

const standards = theory.validateAllStandards();
assert(standards.failures.length === 0, JSON.stringify(standards.failures, null, 2));
assert(standards.checked > 0, "No chord standards were checked");

expectNotes("C", "major", ["C4", "E4", "G4"]);
expectNotes("C", "minor", ["C4", "Eb4", "G4"]);
expectNotes("C", "diminished", ["C4", "Eb4", "Gb4"]);
expectNotes("C", "augmented", ["C4", "E4", "G#4"]);
expectNotes("C", "dim7", ["C4", "Eb4", "Gb4", "Bbb4"]);
expectNotes("Db", "diminished", ["Db4", "Fb4", "Abb4"]);
expectNotes("Db", "dom7flat9", ["Db4", "F4", "Ab4", "Cb5", "Ebb5"]);
expectNotes("F#", "augmaj9", ["F#4", "A#4", "Cx5", "E#5", "G#5"]);
expectNotes("Bb", "min9", ["Bb4", "Db5", "F5", "Ab5", "C6"]);
expectNotes("E", "dom7sharp9", ["E4", "G#4", "B4", "D5", "Fx5"]);

expectSpellings("C", "minor", ["C", "Eb", "G"]);
expectSpellings("Db", "diminished", ["Db", "Fb", "Abb"]);
expectSpellings("F#", "augmaj9", ["F#", "A#", "Cx", "E#", "G#"]);
expectSpellings("E", "dom7sharp9", ["E", "G#", "B", "D", "Fx"]);

expectPairs("Db", "diminished", 0, ["Db=1", "Fb=b3", "Abb=b5"]);
expectPairs("Db", "diminished", 1, ["Fb=b3", "Abb=b5", "Db=1"]);
expectPairs("Db", "diminished", 2, ["Abb=b5", "Db=1", "Fb=b3"]);

expectReadable(3, "diminished", ["D#", "F#", "A"]);
expectReadable(3, "major", ["Eb", "G", "Bb"]);
expectReadable(1, "diminished", ["C#", "E", "G"]);
expectReadable(5, "diminished", ["F", "Ab", "Cb"]);
expectReadable(6, "augmented", ["Gb", "Bb", "D"]);
expectReadableRootsAreOptimal();
expectPlayableVoicingsFitRange();

console.log(`Checked ${standards.checked} root/quality/inversion spellings against chord-degree formulas.`);
