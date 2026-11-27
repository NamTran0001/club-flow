import { useEffect } from 'react';

const SITE_NAME = 'ClubFlow';

/**
 * Keeps document.title in sync with the screen the user is on. Screen readers
 * and browser tabs then announce the right page after a client-side route
 * change, which a single-page app does not do on its own.
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
