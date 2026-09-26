(function (global) {
  'use strict';

  // Reusable learning contracts for the existing visual engines. These fields
  // describe why an interaction exists; they do not award mastery or unlocks.
  const GENERIC = {
    inputState: 'A learner changes one visible control at a time.',
    learnerAction: 'Change the control, then describe what moved or stayed the same.',
    observableChange: 'The model updates immediately so cause and effect can be inspected.',
    targetConcept: 'Connect the visible change to the lesson outcome.',
    explanationHook: 'What changed? What did not change? Why might that be?',
    assessmentHook: 'Use the learner explanation as descriptive evidence only.',
    accessibilityControls: 'Keyboard controls, labelled inputs, and text instructions are available.',
    reducedMotionMode: 'The same values remain available without animation.'
  };

  const byType = {
    numberLine: { id: 'number-line', name: 'Number line explorer', targetConcept: 'Magnitude and position on a number line.', learnerAction: 'Move the point and compare its position with the marked values.', explanationHook: 'How does moving right or left change the value?' },
    fractionPie: { id: 'fraction-bars', name: 'Fraction parts explorer', targetConcept: 'A fraction describes equal parts of a whole.', learnerAction: 'Change the numerator or denominator and inspect the shaded part.', explanationHook: 'What stays equal when the whole is split into more parts?' },
    fractionAdd: { id: 'fraction-addition', name: 'Fraction addition model', targetConcept: 'Equivalent parts can be combined when the whole is partitioned consistently.', learnerAction: 'Adjust the parts and observe how the combined shaded amount changes.', explanationHook: 'Why must the parts refer to the same-sized whole?' },
    placeValue: { id: 'place-value', name: 'Base-ten place-value model', targetConcept: 'A digit’s value depends on its place.', learnerAction: 'Change a digit and watch the place-value groups update.', explanationHook: 'How did the total change when the digit moved places?' },
    barChart: { id: 'data-chart', name: 'Data chart builder', targetConcept: 'A chart encodes comparisons between quantities.', learnerAction: 'Change one value and compare the bar heights.', explanationHook: 'Which comparison is visible, and what evidence supports it?' },
    coordinate: { id: 'coordinate-grid', name: 'Coordinate grid explorer', targetConcept: 'Ordered pairs locate a point using two axes.', learnerAction: 'Move the point along one axis at a time.', explanationHook: 'Which coordinate changed, and which stayed fixed?' },
    shape: { id: 'shape-transform', name: 'Shape and measure explorer', targetConcept: 'Shape properties can be inspected through sides, angles, and symmetry.', learnerAction: 'Change one geometric control and compare the resulting shape.', explanationHook: 'Which property provides evidence for the shape name?' },
    angle: { id: 'angle-ray', name: 'Angle ray explorer', targetConcept: 'An angle measures the turn between two rays.', learnerAction: 'Rotate one ray and compare the opening.', explanationHook: 'What evidence shows that the angle became larger or smaller?' },
    symmetry: { id: 'symmetry-fold', name: 'Symmetry fold explorer', targetConcept: 'A line of symmetry creates matching reflected halves.', learnerAction: 'Move the fold line and check whether both sides match.', explanationHook: 'What must match for the fold to be a line of symmetry?' },
    circuit: { id: 'circuit-loop', name: 'Circuit loop explorer', targetConcept: 'A complete path is needed for current to flow.', learnerAction: 'Open or close one part of the circuit and observe the output.', explanationHook: 'Which part of the path explains the change in the bulb?' },
    force: { id: 'force-motion', name: 'Force and motion explorer', targetConcept: 'A net force can change an object’s motion.', learnerAction: 'Change one force and compare the motion response.', explanationHook: 'Which force is unbalanced, and what evidence shows its effect?' },
    speed: { id: 'speed-distance-time', name: 'Speed explorer', targetConcept: 'Speed relates distance travelled to time taken.', learnerAction: 'Change distance or time and compare the resulting speed.', explanationHook: 'How did changing one quantity affect the relationship?' },
    light: { id: 'light-ray', name: 'Light and shadow explorer', targetConcept: 'Light direction and object position affect shadows.', learnerAction: 'Change the light angle or object position and inspect the shadow.', explanationHook: 'What changed in the shadow, and what caused it?' },
    sound: { id: 'sound-wave', name: 'Sound wave explorer', targetConcept: 'Frequency and amplitude describe different wave properties.', learnerAction: 'Change one wave control and compare pitch or loudness.', explanationHook: 'Which control changed pitch, and which changed loudness?' },
    clock: { id: 'clock-time', name: 'Time-of-day explorer', targetConcept: 'The hands represent related measures of time.', learnerAction: 'Move the hands and name the time relationship you observe.', explanationHook: 'How do the hour and minute hands work together?' },
    pattern: { id: 'pattern-builder', name: 'Pattern builder', targetConcept: 'A repeating or growing rule generates predictable terms.', learnerAction: 'Change the first terms and identify the rule that remains.', explanationHook: 'What rule predicts the next term?' },
    compare: { id: 'comparison-balance', name: 'Comparison balance', targetConcept: 'Quantities can be compared using evidence, not appearance alone.', learnerAction: 'Change one quantity and inspect which side is greater or equal.', explanationHook: 'What evidence supports the comparison symbol?' }
  };

  const bySubject = {
    Mathematics: { id: 'math-general', name: 'Mathematics model explorer', targetConcept: 'A mathematical relationship can be represented and tested visually.' },
    Physics: { id: 'physics-general', name: 'Physics cause-and-effect explorer', targetConcept: 'Changing one physical variable can change an observable outcome.' },
    Chemistry: { id: 'chemistry-general', name: 'Particle model explorer', targetConcept: 'Particle arrangement and motion help explain material changes.' },
    Biology: { id: 'biology-general', name: 'Living-systems flow explorer', targetConcept: 'Parts of a living system interact to produce an observable outcome.' },
    'Earth & Space': { id: 'earth-space-general', name: 'Earth and space model explorer', targetConcept: 'Scale, position, and cycles help explain observable patterns.' },
    'Computer Science & AI': { id: 'computing-general', name: 'Algorithm flow explorer', targetConcept: 'A sequence of steps transforms inputs into outputs.' }
  };

  function getEngine(topic) {
    if (!topic) return null;
    const type = String(topic.visual && topic.visual.type || '');
    const subject = String(topic.subject || '');
    return Object.assign({}, GENERIC, byType[type] || bySubject[subject] || bySubject.Mathematics);
  }

  global.AVYAAN_AHA_ENGINE_LIBRARY = Object.assign({}, byType, bySubject);
  global.getAhaEngineForTopic = getEngine;
})(window);