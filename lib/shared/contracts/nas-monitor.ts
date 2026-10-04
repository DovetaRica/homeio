export type NasMetric = {
  name: string;
  identifier: string;
  legend: string[];
  data: (number | null)[][];
};
export type NasMonitorData = {
  system: {model?: string; physmem?: number; uptime?: string};
  graphs: NasMetric[];
  errors: string[];
};
