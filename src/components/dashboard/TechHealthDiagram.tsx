import { useEffect, useId, useMemo, useState } from 'react';

// Dynamic import: Mermaid (~400kB) only loads when Tech Health diagram is viewed
const MERMAID_THEME = {
  background: '#1e293b',
  primaryColor: '#0f172a',
  primaryBorderColor: '#10b981',
  primaryTextColor: '#e2e8f0',
  lineColor: '#94a3b8',
  secondaryColor: '#1f2937',
  tertiaryColor: '#0f172a',
  fontFamily: 'Inter, ui-sans-serif, system-ui',
};

export function TechHealthDiagram() {
  const [svg, setSvg] = useState<string>('');
  const diagramId = useId().replace(/[:]/g, '');

  const diagram = useMemo(
    () => `graph TD
  A[Client Apps] --> B[HospoGo Web UI]
  B --> C[Auth Context]
  C --> D[API Gateway]
  D --> K[Trinity Core]
  K --> E[(Postgres)]
  K --> I[AI Support]
  D --> F[Xero Mutex]
  D --> G[Stripe Connect]
  D --> H[Firebase Auth]
  I --> J[CTO Brain Monitor]
  E --> J

  classDef core fill:#0f172a,stroke:#10b981,color:#e2e8f0,stroke-width:1px;
  classDef system fill:#1f2937,stroke:#94a3b8,color:#e2e8f0,stroke-width:1px;
  classDef highlight fill:#0b2f24,stroke:#10b981,color:#10b981,stroke-width:2px;
  classDef trinity fill:#0b2f24,stroke:hsl(var(--primary)),color:hsl(var(--primary)),stroke-width:2px;

  class B,C,D,E core;
  class F,G,H,I system;
  class J highlight;
  class K trinity;
`,
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    import('mermaid')
      .then(({ default: mermaid }) => {
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: MERMAID_THEME,
          flowchart: { curve: 'basis' },
        });

        return mermaid.render(`tech-health-${diagramId}`, diagram);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const { svg: renderedSvg } = result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(renderedSvg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        if (svgEl) {
          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        const trinityText = Array.from(doc.querySelectorAll('text')).find(
          (node) => node.textContent?.trim() === 'Trinity Core'
        );
        const trinityNode = trinityText?.closest('g');
        if (trinityNode) {
          trinityNode.setAttribute(
            'style',
            'filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.6));'
          );
        }

        const serialized = new XMLSerializer().serializeToString(doc.documentElement);
        setSvg(serialized);
      })
      .catch(() => {
        if (!cancelled) setSvg('');
      });

    return () => {
      cancelled = true;
    };
  }, [diagram, diagramId]);

  return (
    <div className="rounded-lg border border-white/10 bg-[#1e293b] p-3 overflow-x-auto tech-health-diagram">
      {svg ? (
        <div
          className="min-w-[520px]"
          aria-label="System architecture diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-zinc-500">Loading architecture diagram...</div>
      )}
    </div>
  );
}
