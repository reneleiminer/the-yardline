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

    const scrollToTarget = () => {
      if (hash) {
        const rawId = decodeURIComponent(hash.replace(/^#/, ''));
        const target = rawId ? document.getElementById(rawId) : null;

        if (target) {
          target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
          return;
        }
      }

      scrollTop();
    };

    scrollToTarget();
    const frames = [
      window.requestAnimationFrame(scrollToTarget),
      window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToTarget)),
    ];
    const timers = [
      window.setTimeout(scrollToTarget, 80),
      window.setTimeout(scrollToTarget, 220),
      window.setTimeout(scrollToTarget, 500),
      window.setTimeout(scrollToTarget, 900),
    ];
    const observer = new MutationObserver(scrollToTarget);

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
