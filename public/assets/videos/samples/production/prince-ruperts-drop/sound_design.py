"""Original synchronized effects for the Prince Rupert's drop animation.

Run in the media sandbox with numpy. Effects are intentionally quieter than
the normalized narration. Event times can be replaced by edit-events.json.
"""
from pathlib import Path
import json
import wave
import numpy as np

RATE = 48000
DURATION = 22.2
ROOT = Path(__file__).resolve().parent
EVENTS = {
    'hammer': 1.42,
    'tail_tease': 2.45,
    'teaser_snap': 3.46,
    'teaser_fracture': 3.92,
    'quench': 7.65,
    'cutaway': 10.40,
    'compression': 14.0,
    'tension': 16.0,
    'tail_snap': 17.85,
    'fracture': 19.50,
}
if (ROOT / 'edit-events.json').exists():
    EVENTS.update(json.loads((ROOT / 'edit-events.json').read_text()))

rng = np.random.default_rng(1907)
mix = np.zeros((round(DURATION * RATE), 2), dtype=np.float64)


def place(audio, at, gain=1, pan=0):
    offset = round(at * RATE)
    length = min(len(audio), len(mix) - offset)
    if offset < 0 or length <= 0:
        return
    angle = (pan + 1) * np.pi / 4
    mix[offset:offset + length, 0] += audio[:length] * np.cos(angle) * gain
    mix[offset:offset + length, 1] += audio[:length] * np.sin(angle) * gain


def resonant_hit(duration, frequencies, decay, noise=0.05):
    time = np.arange(round(duration * RATE)) / RATE
    wavelet = np.zeros_like(time)
    for i, frequency in enumerate(frequencies):
        wavelet += np.sin(2 * np.pi * frequency * time) * np.exp(-time * decay * (1 + i * .26)) / (1 + i * .65)
    transient = rng.normal(size=len(time))
    transient = np.r_[0, np.diff(transient)]
    wavelet += transient * np.exp(-time * 180) * noise
    wavelet *= np.minimum(time * 2500, 1)
    return wavelet / max(1, np.max(np.abs(wavelet)))


def sweep(duration, start=250, end=2000):
    time = np.arange(round(duration * RATE)) / RATE
    frequency = start + (end - start) * time / duration
    phase = np.cumsum(frequency) * 2 * np.pi / RATE
    noise = rng.normal(size=len(time))
    smoothed = np.convolve(noise, np.ones(8) / 8, mode='same')
    return (smoothed * .55 + np.sin(phase) * .1) * np.sin(np.pi * time / duration) ** 2


# Hammer: short steel attack, low contact thud, glass ring and a quiet reflection.
hammer = resonant_hit(.70, [163, 407, 1073, 2921, 4343], 12, .60)
place(hammer, EVENTS['hammer'], .23, -.1)
place(hammer, EVENTS['hammer'] + .075, .035, .25)
place(sweep(.24, 900, 330), EVENTS['tail_tease'], .08, .15)
place(resonant_hit(.17, [2130, 4177, 6590], 48, .8), EVENTS['teaser_snap'], .15, .25)
for _ in range(28):
    offset = rng.beta(.8, 2.2) * 1.12
    frequency = rng.uniform(2200, 7800)
    place(resonant_hit(.2, [frequency, frequency * 1.23], 27, .12),
          EVENTS['teaser_fracture'] + offset, rng.uniform(.018, .05), rng.uniform(-.7, .7))

# A brief water hiss and individual bubbles under the cooling explanation.
time = np.arange(round(.95 * RATE)) / RATE
hiss = rng.normal(size=len(time))
hiss = np.convolve(hiss, np.ones(5) / 5, mode='same')
hiss *= np.sin(np.minimum(time / .06, 1) * np.pi / 2) * np.exp(-time * 4)
place(hiss, EVENTS['quench'], .055)
for offset, frequency in zip([.07, .16, .30, .44], [610, 830, 480, 1040]):
    place(resonant_hit(.13, [frequency, frequency * 1.52], 40), EVENTS['quench'] + offset, .021, rng.uniform(-.4, .4))

place(sweep(.4, 650, 140), EVENTS['cutaway'], .035)
place(resonant_hit(.22, [730, 1610], 27), EVENTS['compression'], .035, -.15)
place(resonant_hit(.28, [410, 930], 20), EVENTS['tension'], .035, .15)

# Tail snap is sharp; the cascade consists of irregular, high-frequency shards.
place(resonant_hit(.19, [2130, 4177, 6590], 48, .8), EVENTS['tail_snap'], .20, .3)
place(sweep(.7, 1300, 2600), EVENTS['fracture'] - .2, .075)
for _ in range(62):
    offset = rng.beta(.8, 2.2) * 1.55
    frequency = rng.uniform(1900, 7800)
    shard = resonant_hit(rng.uniform(.10, .38), [frequency, frequency * 1.23], rng.uniform(15, 45), .18)
    place(shard, EVENTS['fracture'] + offset, rng.uniform(.016, .065), rng.uniform(-.8, .8))

# A quiet tonal floor ties the room together without competing with speech.
time = np.arange(len(mix)) / RATE
bed = (np.sin(2 * np.pi * 73.416 * time) + .33 * np.sin(2 * np.pi * 110 * time)) * .0025
bed *= np.minimum(time / .7, 1) * np.minimum((DURATION - time) / .5, 1)
mix += bed[:, None]
mix *= np.minimum((DURATION - time) / .3, 1)[:, None]
peak = float(np.max(np.abs(mix)))
if peak > .7:
    mix *= .7 / peak

with wave.open(str(ROOT / 'effects.wav'), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
(ROOT / 'sound-events.json').write_text(json.dumps({'events': EVENTS, 'duration': DURATION, 'sample_rate': RATE, 'effects_peak_dbfs': float(20 * np.log10(np.max(np.abs(mix))))}, indent=2) + '\n')

