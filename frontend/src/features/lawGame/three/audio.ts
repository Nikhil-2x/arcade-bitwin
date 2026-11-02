/** Sound is synthesised, so a world's audio costs no downloads. */
export function makeNoise(audio: AudioContext, seconds: number) {
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    // Brown noise: softer than white, closer to a distant crowd.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export function footstep(audio: AudioContext, output: AudioNode, noise: AudioBuffer, brightness = 340, level = 0.24) {
  const source = audio.createBufferSource()
  source.buffer = noise
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = brightness + Math.random() * 180
  const gain = audio.createGain()
  const at = audio.currentTime
  gain.gain.setValueAtTime(level, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.11)
  source.connect(filter).connect(gain).connect(output)
  source.start(at, Math.random())
  source.stop(at + 0.13)
}
