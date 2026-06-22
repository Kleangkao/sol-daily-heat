/** Inline fallback so first paint is styled even if a dev CSS chunk 404s. */
export const CRITICAL_APP_CSS = `
  html, body {
    background-color: #041616;
    color: #eef4ec;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  .featured-marquee-clip {
    overflow: hidden;
  }
  .featured-marquee-track {
    display: flex;
    width: max-content;
    flex-wrap: nowrap;
  }
`;
