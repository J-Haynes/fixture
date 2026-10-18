import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * False during the server render and hydration, true straight after. The page HTML is
 * cached and shared, so anything that depends on the viewer (timezone, locale) must
 * render a fixed value until this is true. suppressHydrationWarning alone is not enough:
 * React keeps the server's text on hydration and only patches it when a later render
 * produces different text.
 */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
