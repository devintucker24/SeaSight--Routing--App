export interface IsochroneEnvironmentSample {
  current_east_kn?: number;
  current_north_kn?: number;
  wave_height_m?: number;
  depth_m?: number;
}

export type EnvironmentSampler = (lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample;
