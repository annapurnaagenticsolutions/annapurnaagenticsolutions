// Quick test to see if patterns are being generated differently for different seeds
const { createSeededRNG } = require('./dist/shared/rng.js');

function generateArithmeticPattern(rng, length, difficulty) {
  const start = rng.nextInt(0, 20 - difficulty * 3);
  const step = rng.nextInt(1, 3 + difficulty);
  return {
    sequence: Array.from({ length }, (_, i) => start + i * step),
    params: { start, step },
  };
}

// Test with different seeds (which should be used for different levels)
const seeds = [100, 101, 102, 103, 104]; // 5 different seeds for 5 levels
console.log("Testing Pattern Generator with different seeds:");
seeds.forEach(seed => {
  const rng = createSeededRNG(seed);
  const pattern = generateArithmeticPattern(rng, 5, 1);
  console.log(`Seed ${seed}: ${pattern.sequence.join(', ')}`);
});
