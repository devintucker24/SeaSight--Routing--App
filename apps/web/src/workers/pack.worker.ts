
import { loadPack, createEnvironmentSampler } from './PackLoader';
import type { PackData } from './PackLoader';
import type { IsochroneEnvironmentSample } from '@shared/types';

let currentPack: PackData | null = null;
let environmentSampler: ((lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample) | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload, id } = event.data;

  try {
    if (type === 'LOAD_PACK') {
      const { basePath, options } = payload;
      currentPack = await loadPack(basePath);
      environmentSampler = createEnvironmentSampler(currentPack, options);
      self.postMessage({ type: 'PACK_LOADED', payload: { success: true, packData: currentPack }, id });
    } else if (type === 'SAMPLE_ENVIRONMENT') {
      const { lat, lon, timeHours } = payload;
      if (environmentSampler) {
        const sample = environmentSampler(lat, lon, timeHours);
        self.postMessage({ type: 'ENVIRONMENT_SAMPLE', payload: sample, id });
      } else {
        self.postMessage({ type: 'ERROR', payload: 'Environment sampler not initialized.', id });
      }
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', payload: error.message, id });
  }
};
