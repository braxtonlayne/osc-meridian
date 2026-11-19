/**
 * TelemetryChart as exported from the @graphics/reactor index: loads the uPlot
 * wrapper (./TelemetryChart, with uPlot and its stylesheet) on first render, so
 * importing the index for one-lines and gauges does not pull uPlot into the
 * caller's chunk. Until the chunk arrives a box of the chart's height holds the
 * place. Import '@graphics/reactor/TelemetryChart' directly for the eager form.
 */
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { TelemetryChartProps } from './TelemetryChart';

let loaded: ComponentType<TelemetryChartProps> | null = null;
let loading: Promise<ComponentType<TelemetryChartProps>> | null = null;

function loadChart(): Promise<ComponentType<TelemetryChartProps>> {
  loading ??= import('./TelemetryChart').then((m) => (loaded = m.TelemetryChart));
  return loading;
}

export function TelemetryChart(props: TelemetryChartProps) {
  const [Chart, setChart] = useState<ComponentType<TelemetryChartProps> | null>(() => loaded);
  useEffect(() => {
    if (Chart) return;
    let live = true;
    void loadChart().then((c) => {
      if (live) setChart(() => c);
    });
    return () => {
      live = false;
    };
  }, [Chart]);
  if (!Chart) return <div class="rx-chart-pending" style={{ height: `${props.height}px` }} role="img" aria-label={props.label ?? 'Telemetry chart'} aria-busy="true" />;
  return <Chart {...props} />;
}
