import type { IsochroneEnvironmentSample } from './RouterService'

export interface PackGridInfo {
  lat0: number
  lat1: number
  lon0: number
  lon1: number
  d: number
  rows: number
  cols: number
  timeCount: number
}

export interface PackData {
  grid: PackGridInfo
  times: string[]
  fields: Record<string, Float32Array>
  masks: Record<string, Uint8Array>
}

export interface EnvironmentSamplerOptions {
  defaultWaveHeight?: number
  defaultDepth?: number
}

const MS_TO_KTS = 1.9438444924406048

function computeRows(lat0: number, lat1: number, d: number): number {
  const extent = Math.abs(lat1 - lat0)
  return Math.max(1, Math.round(extent / d) + 1)
}

function computeCols(lon0: number, lon1: number, d: number): number {
  const extent = Math.abs(lon1 - lon0)
  return Math.max(1, Math.round(extent / d) + 1)
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return await res.arrayBuffer()
}

async function loadFloat32Array(url: string, expectedLength: number): Promise<Float32Array> {
  const buffer = await fetchArrayBuffer(url)
  const array = new Float32Array(buffer)
  if (expectedLength > 0 && array.length !== expectedLength) {
    console.warn(`Float32 array length mismatch for ${url}: expected ${expectedLength}, got ${array.length}`)
  }
  return array
}

async function loadUint8Array(url: string, expectedLength: number): Promise<Uint8Array> {
  const buffer = await fetchArrayBuffer(url)
  const array = new Uint8Array(buffer)
  if (expectedLength > 0 && array.length !== expectedLength) {
    console.warn(`Uint8 array length mismatch for ${url}: expected ${expectedLength}, got ${array.length}`)
  }
  return array
}

export async function loadPack(basePath: string): Promise<PackData> {
  const manifestUrl = `${basePath}/manifest.json`
  const manifest = await fetch(manifestUrl).then(res => {
    if (!res.ok) {
      throw new Error(`Failed to load manifest ${manifestUrl}`)
    }
    return res.json()
  })

  const lat0 = manifest.grid.lat0
  const lat1 = manifest.grid.lat1
  const lon0 = manifest.grid.lon0
  const lon1 = manifest.grid.lon1
  const d = manifest.grid.d
  const rows = computeRows(lat0, lat1, d)
  const cols = computeCols(lon0, lon1, d)
  const times: string[] = manifest.times_iso ?? []
  const timeCount = Math.max(1, times.length)

  const grid: PackGridInfo = { lat0, lat1, lon0, lon1, d, rows, cols, timeCount }

  const fieldData: Record<string, Float32Array> = {}
  const masks: Record<string, Uint8Array> = {}

  const totalScalars = rows * cols
  const timeScalars = timeCount * totalScalars

  const loadField = async (fieldName: string) => {
    const filename = `${basePath}/${fieldName}.bin`
    try {
      const array = await loadFloat32Array(filename, timeScalars)
      fieldData[fieldName] = array
    } catch (err) {
      console.warn(`Unable to load field ${fieldName} from ${filename}:`, err)
    }
  }

  if (Array.isArray(manifest.fields)) {
    for (const fieldName of manifest.fields as string[]) {
      if (fieldName.startsWith('mask_')) {
        const filename = `${basePath}/${fieldName}.bin`
        try {
          masks[fieldName] = await loadUint8Array(filename, totalScalars)
        } catch (err) {
          console.warn(`Unable to load mask ${fieldName} from ${filename}:`, err)
        }
      } else {
        await loadField(fieldName)
      }
    }
  }

  // Also load explicit mask files if present in manifest.masks
  if (manifest.masks && typeof manifest.masks === 'object') {
    for (const [maskKey, maskFile] of Object.entries<string>(manifest.masks)) {
      const logicalName = `mask_${maskKey}`
      const filename = `${basePath}/${maskFile.replace('.bin.zst', '.bin')}`
      try {
        masks[logicalName] = await loadUint8Array(filename, totalScalars)
      } catch (err) {
        console.warn(`Unable to load mask ${logicalName} from ${filename}:`, err)
      }
    }
  }

  return {
    grid,
    times,
    fields: fieldData,
    masks
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function bilinearSample(array: Float32Array, timeIndex: number, rows: number, cols: number, r: number, c: number): number | null {
  if (Number.isNaN(r) || Number.isNaN(c)) {
    return null
  }
  const maxRow = rows - 1
  const maxCol = cols - 1
  if (r < 0 || r > maxRow || c < 0 || c > maxCol) {
    return null
  }

  const base = timeIndex * rows * cols
  const r0 = Math.floor(r)
  const c0 = Math.floor(c)
  const r1 = Math.min(r0 + 1, maxRow)
  const c1 = Math.min(c0 + 1, maxCol)

  const fr = r - r0
  const fc = c - c0

  const idx = (row: number, col: number) => base + row * cols + col

  const v00 = array[idx(r0, c0)]
  const v10 = array[idx(r1, c0)]
  const v01 = array[idx(r0, c1)]
  const v11 = array[idx(r1, c1)]

  const v0 = v00 + (v10 - v00) * fr
  const v1 = v01 + (v11 - v01) * fr
  return v0 + (v1 - v0) * fc
}

function sampleMask(array: Uint8Array | undefined, rows: number, cols: number, r: number, c: number): number {
  if (!array) return 0
  if (Number.isNaN(r) || Number.isNaN(c)) return 0
  const maxRow = rows - 1
  const maxCol = cols - 1
  if (r < 0 || r > maxRow || c < 0 || c > maxCol) return 0
  const row = clamp(Math.round(r), 0, maxRow)
  const col = clamp(Math.round(c), 0, maxCol)
  return array[row * cols + col]
}

export function createEnvironmentSampler(pack: PackData, options: EnvironmentSamplerOptions = {}): (lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample {
 const {
    lat0, lon0, d, rows, cols, timeCount
  } = pack.grid

  const softenMaskEdges = (mask: Uint8Array | undefined): Uint8Array | undefined => {
    if (!mask || mask.length === 0) return undefined

    const rowAllSame = (row: number): number => {
      const base = row * cols
      const first = mask[base]
      for (let c = 1; c < cols; c++) {
        if (mask[base + c] !== first) return first
      }
      return first
    }

    const zeroRow = (row: number) => {
      const base = row * cols
      mask.fill(0, base, base + cols)
    }

    let top = 0
    while (top < rows && rowAllSame(top) === 1) {
      zeroRow(top)
      top++
    }

    let bottom = rows - 1
    while (bottom >= 0 && rowAllSame(bottom) === 1) {
      zeroRow(bottom)
      bottom--
    }

    const colAllSame = (col: number): number => {
      const first = mask[col]
      for (let r = 1; r < rows; r++) {
        if (mask[r * cols + col] !== first) return first
      }
      return first
    }

    const zeroCol = (col: number) => {
      for (let r = 0; r < rows; r++) {
        mask[r * cols + col] = 0
      }
    }

    let left = 0
    while (left < cols && colAllSame(left) === 1) {
      zeroCol(left)
      left++
    }

    let right = cols - 1
    while (right >= 0 && colAllSame(right) === 1) {
      zeroCol(right)
      right--
    }

    const unique = new Set(mask)
    return unique.size === 1 ? undefined : mask
  }

  const maskLand = undefined
  const maskShallow = undefined

  return (lat: number, lon: number) => {
    const rowFloat = (lat - lat0) / d
    const colFloat = (lon - lon0) / d

    const clampedRow = clamp(rowFloat, 0, rows - 1)
    const clampedCol = clamp(colFloat, 0, cols - 1)
    const timeIndex = 0 // TODO: support multi-time packs; current packs are single timestep

    const sampleField = (name: string, fallback = 0): number => {
      const array = pack.fields[name]
      if (!array) {
        return fallback
      }
      const value = bilinearSample(array, timeIndex, rows, cols, clampedRow, clampedCol)
      return value ?? fallback
    }

    const sampleMaskField = (name: 'mask_land' | 'mask_shallow'): number => {
      const source = name === 'mask_land' ? maskLand : maskShallow
      return sampleMask(source, rows, cols, clampedRow, clampedCol)
    }

    const curU = sampleField('cur_u') * MS_TO_KTS
    const curV = sampleField('cur_v') * MS_TO_KTS
    const waveHs = sampleField('wave_hs', options.defaultWaveHeight ?? 1.0)

    const shallowFlag = sampleMaskField('mask_shallow')
    const landFlag = sampleMaskField('mask_land')

    const depth = landFlag ? 0 : shallowFlag ? 5 : (options.defaultDepth ?? 5000)

    return {
      current_east_kn: curU,
      current_north_kn: curV,
      wave_height_m: waveHs,
      depth_m: depth
    }
  }
}
