from pathlib import Path
import wave

import numpy as np

SAMPLE_RATE = 48_000
DURATION = 22.0
TARGET_RMS_DB = -32.0
OUTPUT = Path(__file__).with_name('underscore.wav')


def smooth_step(value):
    position = np.clip(value, 0.0, 1.0)
    return position * position * (3.0 - 2.0 * position)


def make_underscore():
    random = np.random.default_rng(1847)
    count = round(SAMPLE_RATE * DURATION)
    time = np.arange(count, dtype=np.float64) / SAMPLE_RATE
    stereo = np.zeros((count, 2), dtype=np.float64)
    release = smooth_step((time - 14.4) / 3.6)
    entrance = smooth_step(time / 2.8)
    exit_fade = 1.0 - smooth_step((time - 18.0) / 4.0)

    # A D/A drone with a faint E-flat suspension settles into a quiet D-minor voicing.
    voices = [
        (73.4162, 0.72, np.ones(count)),
        (110.0000, 0.34, np.ones(count)),
        (146.8324, 0.23, np.ones(count)),
        (155.5635, 0.105, 1.0 - release),
        (174.6141, 0.15, release),
        (220.0000, 0.045, release),
    ]

    for voice_index, (frequency, weight, envelope) in enumerate(voices):
        for player_index, cents in enumerate((-3.7, 0.4, 3.1)):
            phase_offset = random.uniform(0.0, 2.0 * np.pi)
            drift = 0.022 * np.sin(2.0 * np.pi * (0.17 + voice_index * 0.011) * time + phase_offset)
            vibrato = 0.014 * np.sin(2.0 * np.pi * (4.55 + player_index * 0.21) * time + phase_offset)
            phase = 2.0 * np.pi * frequency * 2.0 ** (cents / 1200.0) * time + drift + vibrato
            tone = np.zeros(count, dtype=np.float64)
            for harmonic in range(1, 10):
                amplitude = np.exp(-harmonic * 0.30) / harmonic ** 1.12
                tone += amplitude * np.sin(harmonic * phase + phase_offset * 0.2)

            control_time = np.linspace(0.0, DURATION, 97)
            bow_motion = np.interp(time, control_time, random.uniform(0.88, 1.02, len(control_time)))
            slow_swell = 0.88 + 0.12 * np.sin(2.0 * np.pi * 0.071 * time + phase_offset)
            tone *= weight * envelope * bow_motion * slow_swell / 3.0
            pan = (player_index - 1) * 0.36 + (voice_index % 2 - 0.5) * 0.12
            stereo[:, 0] += tone * np.sqrt((1.0 - pan) / 2.0)
            stereo[:, 1] += tone * np.sqrt((1.0 + pan) / 2.0)

    frequencies = np.fft.rfftfreq(count, 1.0 / SAMPLE_RATE)
    room_filter = (1.0 - np.exp(-(frequencies / 95.0) ** 2)) / (1.0 + (frequencies / 720.0) ** 3)
    for channel in range(2):
        room_air = np.fft.irfft(np.fft.rfft(random.standard_normal(count)) * room_filter, n=count)
        room_air /= np.sqrt(np.mean(room_air ** 2))
        stereo[:, channel] += room_air * 0.0045

    stereo *= (entrance * exit_fade)[:, None]
    stereo -= np.mean(stereo, axis=0)
    stereo *= 10.0 ** (TARGET_RMS_DB / 20.0) / np.sqrt(np.mean(stereo ** 2))
    stereo = 0.068 * np.tanh(stereo / 0.068)
    stereo *= 10.0 ** (TARGET_RMS_DB / 20.0) / np.sqrt(np.mean(stereo ** 2))
    peak = np.max(np.abs(stereo))
    if peak > 0.089:
        stereo *= 0.089 / peak
    stereo[0] = 0.0
    stereo[-1] = 0.0
    return stereo


def main():
    audio = make_underscore()
    pcm = np.round(audio * 32767.0).astype('<i2')
    with wave.open(str(OUTPUT), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())
    with wave.open(str(OUTPUT), 'rb') as rendered:
        assert rendered.getnchannels() == 2
        assert rendered.getsampwidth() == 2
        assert rendered.getframerate() == SAMPLE_RATE
        assert rendered.getnframes() == round(SAMPLE_RATE * DURATION)
        decoded = np.frombuffer(rendered.readframes(rendered.getnframes()), dtype='<i2').astype(np.float64) / 32768.0
    rms_db = 20.0 * np.log10(np.sqrt(np.mean(decoded ** 2)))
    peak_db = 20.0 * np.log10(np.max(np.abs(decoded)))
    assert peak_db < -20.0
    assert -34.0 < rms_db < -30.0
    print(f'Original Underscore: {OUTPUT}')
    print(f'Duration: {DURATION:.3f}s | Sample Rate: {SAMPLE_RATE} Hz | Channels: 2 | PCM: 16-bit')
    print(f'RMS: {rms_db:.2f} dBFS | Peak: {peak_db:.2f} dBFS')


if __name__ == '__main__':
    main()
