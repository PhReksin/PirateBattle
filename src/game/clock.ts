export function createClock(step: (dt: number) => void, isRunning: () => boolean) {
  const fixedStep = 1 / 60;
  let accumulator = 0;
  let previous: number | undefined;

  function advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid elapsed time.');
    if (!isRunning()) return;
    accumulator += seconds;
    while (accumulator + 1e-9 >= fixedStep && isRunning()) {
      accumulator = Math.max(0, accumulator - fixedStep);
      step(fixedStep);
    }
  }

  return {
    advance,
    frame(nowMilliseconds: number) {
      if (!isRunning()) { previous = undefined; return; }
      if (previous !== undefined) advance((nowMilliseconds - previous) / 1000);
      previous = nowMilliseconds;
    },
    reset() { accumulator = 0; previous = undefined; },
  };
}