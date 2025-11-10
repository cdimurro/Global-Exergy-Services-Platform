import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Immediate scroll to top
    const scrollToTopImmediate = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Execute immediately
    scrollToTopImmediate();

    // Use requestAnimationFrame for next paint
    requestAnimationFrame(() => {
      scrollToTopImmediate();
    });

    // Additional checks at various intervals to catch async content loading
    // Only monitor for first 500ms
    const timeouts = [0, 10, 50, 100, 200, 300, 400, 500];
    const timeoutIds = timeouts.map(delay =>
      setTimeout(scrollToTopImmediate, delay)
    );

    // Set up a MutationObserver but only for the first 500ms
    let observerActive = true;

    const observer = new MutationObserver(() => {
      if (observerActive && window.scrollY > 0) {
        scrollToTopImmediate();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Disable observer after 500ms to allow user scrolling
    const disableTimeout = setTimeout(() => {
      observerActive = false;
      observer.disconnect();
    }, 500);

    // Cleanup
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      clearTimeout(disableTimeout);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
