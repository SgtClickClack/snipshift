"use client"

/**
 * Chart components - Recharts is lazy-loaded to keep main bundle under 1MB.
 * Wrap chart usage in <Suspense> for lazy-loaded components.
 *
 * Usage:
 *   <Suspense fallback={<div className="flex aspect-video items-center justify-center text-muted-foreground">Loading chart...</div>}>
 *     <ChartContainer config={config}>
 *       <AreaChart data={data}>...</AreaChart>
 *     </ChartContainer>
 *   </Suspense>
 */

import * as React from "react"

// Re-export type without loading recharts
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  )
}

// Lazy wrappers - Recharts (~300kB) only loads when chart components are used
export const ChartContainer = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartContainer }))
)
export const ChartTooltip = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartTooltip }))
)
export const ChartTooltipContent = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartTooltipContent }))
)
export const ChartLegend = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartLegend }))
)
export const ChartLegendContent = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartLegendContent }))
)
export const ChartStyle = React.lazy(() =>
  import("./chart-recharts").then((m) => ({ default: m.ChartStyle }))
)
