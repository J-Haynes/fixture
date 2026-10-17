// A minute-resolution clock for useSyncExternalStore. Ticks land on the minute
// boundary, and the clock re-reads when the tab or PWA comes back into view
// (mobile browsers pause timers in the background).

export const CLOCK_TICK_MS = 60 * 1000;

export function subscribeClock(onTick: () => void) {
  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    onTick();
    interval = setInterval(onTick, CLOCK_TICK_MS);
  }, CLOCK_TICK_MS - (Date.now() % CLOCK_TICK_MS));

  const onVisible = () => {
    if (document.visibilityState === 'visible') onTick();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Current time floored to the minute, so the snapshot only changes once a minute */
export function getClock() {
  return Math.floor(Date.now() / CLOCK_TICK_MS) * CLOCK_TICK_MS;
}
