import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();

  useLayoutEffect(() => {
    const scrollSelectors = [
      '.yardline-main-scroll',
      'main',
      '[data-scroll-root="true"]',
      '[data-admin-scroll="true"]',
      '[role="main"]',
      '.overflow-y-auto',
      '.overflow-auto',
    ];

    const scrollTop = () => {
      const targets = new Set();
      const pageRoot = document.scrollingElement || document.documentElement;

      if (pageRoot) targets.add(pageRoot);

      scrollSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => targets.add(element));
      });

      targets.forEach(element => {
        if (typeof element.scrollTo === 'function') {
          element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } else {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
      });

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const frames = [
      window.requestAnimationFrame(scrollTop),
      window.requestAnimationFrame(() => window.requestAnimationFrame(scrollTop)),
    ];
    const timers = [
      window.setTimeout(scrollTop, 80),
      window.setTimeout(scrollTop, 220),
      window.setTimeout(scrollTop, 500),
      window.setTimeout(scrollTop, 900),
    ];
    const observer = new MutationObserver(scrollTop);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const observerTimer = window.setTimeout(() => observer.disconnect(), 1200);

    return () => {
      observer.disconnect();
      frames.forEach(frame => window.cancelAnimationFrame(frame));
      timers.forEach(timer => window.clearTimeout(timer));
      window.clearTimeout(observerTimer);
    };
  }, [pathname, search, hash, key]);

  return null;
}
