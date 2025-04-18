import { bench } from 'vitest';

const MIN = 1;
const MAX = 9;

const length = 1_000;
const iterations = 1_000_000;

function getRandomValue(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min: number, max: number): number {
  return Math.round(getRandomValue(min, max));
}

function getValue(): number {
  return getRandomInt(MIN, MAX);
}

function sum(acc: number, value: number): number {
  return acc + value;
}

bench(
  'declared function',
  () => {
    Array.from({ length }).map(getValue).reduce(sum, 0);
  },
  { iterations },
);

bench(
  'inline function',
  () => {
    Array.from({ length })
      .map(() => getRandomInt(MIN, MAX))
      .reduce((acc, value) => acc + value, 0);
  },
  { iterations },
);
