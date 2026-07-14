'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy boundary for the markdown renderer. `ssr: false` keeps `react-markdown`
 * out of the initial dashboard bundle and off the static-export prerender.
 */
const Markdown = dynamic(() => import('./markdown-content'), {
  ssr: false,
  loading: () => null,
});

export default Markdown;
