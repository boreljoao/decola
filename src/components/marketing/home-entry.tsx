/** Run during HTML parsing, before the browser restores a reload's scroll offset. */
export function HomeEntry() {
  return (
    <script
      id="home-reload-position"
      dangerouslySetInnerHTML={{
        __html: `(() => {
          if (window.__decolaHomeReloadHandled) return;
          window.__decolaHomeReloadHandled = true;
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation?.type !== 'reload' || location.hash) return;
          const previous = history.scrollRestoration;
          history.scrollRestoration = 'manual';
          const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          window.addEventListener('pageshow', () => {
            reset();
            requestAnimationFrame(() => {
              reset();
              history.scrollRestoration = previous;
            });
          }, { once: true });
          window.addEventListener('pagehide', () => {
            history.scrollRestoration = previous;
          }, { once: true });
          reset();
        })();`,
      }}
    />
  );
}
