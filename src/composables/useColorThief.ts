import { ref, type Ref } from 'vue'

export function normaliseAccent(rgb: [number, number, number] | null): string {
  if (!rgb) return '#d4a017'
  const [r, g, b] = rgb
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  const sFinal = Math.max(s, 0.40)
  const lFinal = Math.min(Math.max(l, 0.45), 0.65)
  return hslToHex(h * 360, sFinal * 100, lFinal * 100)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function useColorThief(imgRef: Ref<HTMLImageElement | null>) {
  const accent = ref<string>('#d4a017')

  async function extract() {
    if (!imgRef.value?.complete || !imgRef.value.naturalWidth) return
    try {
      const ColorThief = (await import('color-thief-ts')).default
      const thief = new ColorThief()
      const color = thief.getColor(imgRef.value) as [number, number, number]
      accent.value = normaliseAccent(color)
    } catch {
      accent.value = '#d4a017'
    }
  }

  return { accent, extract }
}
