import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const EQ_BANDS = [
  { freq: 60,    label: '60',   name: 'Sub'   },
  { freq: 230,   label: '230',  name: 'Bass'  },
  { freq: 910,   label: '910',  name: 'Mid'   },
  { freq: 3600,  label: '3.6k', name: 'Upper' },
  { freq: 14000, label: '14k',  name: 'Air'   },
]

export const PRESETS: Record<string, number[]> = {
  flat:          [ 0,  0,  0,  0,  0],
  'voice boost': [ 2,  4,  5,  3,  1],
  'bass boost':  [ 5,  3,  0, -1, -2],
  'treble boost':[-2, -1,  0,  3,  5],
  podcast:       [ 3,  5,  4,  2,  0],
  audiobook:     [ 1,  3,  5,  4,  2],
  'reduce noise':[-3, -1,  0, -1, -3],
  loudness:      [ 4,  2,  0,  2,  4],
}

const MIN_DB = -15
const MAX_DB = 15

function _load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function _save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export const useEqualizerStore = defineStore('equalizer', () => {
  const enabled    = ref<boolean>(_load('abs_eq_enabled', false))
  const bands      = ref<number[]>(_load('abs_eq_bands', [0, 0, 0, 0, 0]))
  const activePreset = ref<string>(_load('abs_eq_preset', 'flat'))
  const bassBoost  = ref<number>(_load('abs_eq_bass', 0))
  const mono       = ref<boolean>(_load('abs_eq_mono', false))

  // Internal Web Audio nodes — rebuilt each time the audio graph is (re)created
  let _filters: BiquadFilterNode[] = []
  let _bassNode: BiquadFilterNode | null = null
  let _monoSplitter: ChannelSplitterNode | null = null
  let _monoMerger: ChannelMergerNode | null = null
  let _ctx: AudioContext | null = null
  // The entry point for callers to connect their source into
  let _inputGain: GainNode | null = null
  // The exit point callers connect to their destination
  let _outputGain: GainNode | null = null

  const isCustom = computed(() => activePreset.value === 'custom')

  function buildChain(ctx: AudioContext): { input: GainNode; output: GainNode } {
    if (_ctx === ctx && _inputGain && _outputGain) return { input: _inputGain, output: _outputGain }
    _ctx = ctx
    _inputGain  = ctx.createGain()
    _outputGain = ctx.createGain()

    _filters = EQ_BANDS.map(b => {
      const f = ctx.createBiquadFilter()
      f.type = 'peaking'
      f.frequency.value = b.freq
      f.Q.value = 1.0
      f.gain.value = 0
      return f
    })

    _bassNode = ctx.createBiquadFilter()
    _bassNode.type = 'lowshelf'
    _bassNode.frequency.value = 100
    _bassNode.gain.value = 0

    // Mono: split stereo into 2 channels, merge both into channel 0, then back
    _monoSplitter = ctx.createChannelSplitter(2)
    _monoMerger   = ctx.createChannelMerger(2)

    // Default chain (no mono): input → filters[0..4] → bass → output
    _rebuildConnections()
    _applyParams()
    return { input: _inputGain, output: _outputGain }
  }

  function _rebuildConnections() {
    if (!_inputGain || !_outputGain || !_bassNode) return
    // Disconnect everything first
    try { _inputGain.disconnect() } catch {}
    for (const f of _filters) try { f.disconnect() } catch {}
    try { _bassNode.disconnect() } catch {}
    if (_monoSplitter) try { _monoSplitter.disconnect() } catch {}
    if (_monoMerger) try { _monoMerger.disconnect() } catch {}

    if (!enabled.value) {
      _inputGain.connect(_outputGain)
      return
    }

    // Build filter chain
    let prev: AudioNode = _inputGain
    for (const f of _filters) { prev.connect(f); prev = f }
    prev.connect(_bassNode)

    if (mono.value && _monoSplitter && _monoMerger) {
      _bassNode.connect(_monoSplitter)
      // Mix both channels into left
      _monoSplitter.connect(_monoMerger, 0, 0)
      _monoSplitter.connect(_monoMerger, 1, 0)
      // Duplicate left into right
      _monoSplitter.connect(_monoMerger, 0, 1)
      _monoMerger.connect(_outputGain)
    } else {
      _bassNode.connect(_outputGain)
    }
  }

  function _applyParams() {
    for (let i = 0; i < _filters.length; i++) {
      if (_filters[i]) _filters[i].gain.value = enabled.value ? (bands.value[i] ?? 0) : 0
    }
    if (_bassNode) _bassNode.gain.value = enabled.value ? bassBoost.value * MAX_DB : 0
  }

  function setEnabled(v: boolean) {
    enabled.value = v
    _save('abs_eq_enabled', v)
    _rebuildConnections()
    _applyParams()
  }

  function setBand(i: number, db: number) {
    const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db))
    bands.value[i] = clamped
    activePreset.value = 'custom'
    _save('abs_eq_bands', bands.value)
    _save('abs_eq_preset', 'custom')
    if (_filters[i] && enabled.value) _filters[i].gain.value = clamped
  }

  function applyPreset(name: string) {
    const curve = PRESETS[name]
    if (!curve) return
    bands.value = [...curve]
    activePreset.value = name
    _save('abs_eq_bands', bands.value)
    _save('abs_eq_preset', name)
    if (enabled.value) _applyParams()
  }

  function setBassBoost(v: number) {
    bassBoost.value = Math.max(0, Math.min(1, v))
    _save('abs_eq_bass', bassBoost.value)
    if (_bassNode && enabled.value) _bassNode.gain.value = bassBoost.value * MAX_DB
  }

  function setMono(v: boolean) {
    mono.value = v
    _save('abs_eq_mono', v)
    _rebuildConnections()
    _applyParams()
  }

  function resetAll() {
    bands.value = [0, 0, 0, 0, 0]
    activePreset.value = 'flat'
    bassBoost.value = 0
    mono.value = false
    _save('abs_eq_bands', bands.value)
    _save('abs_eq_preset', 'flat')
    _save('abs_eq_bass', 0)
    _save('abs_eq_mono', false)
    _rebuildConnections()
    _applyParams()
  }

  return {
    enabled, bands, activePreset, bassBoost, mono,
    isCustom,
    MIN_DB, MAX_DB,
    buildChain,
    setEnabled, setBand, applyPreset, setBassBoost, setMono, resetAll,
  }
})
