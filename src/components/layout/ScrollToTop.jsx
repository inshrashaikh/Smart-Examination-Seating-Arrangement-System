import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Resets scroll position on route change (honours in-page hashes). */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export { ScrollToTop };
