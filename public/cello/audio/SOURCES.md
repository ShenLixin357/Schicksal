# Cello recordings

Four genuine cello-section pizzicato recordings from **VS Chamber Orchestra 2: Community Edition**, Versilian Studios.
Recorded by Sam Gossner / Simon Dalzell; sample cutting by Elan Hickler / Soundemote (upstream credits).
License: **CC0 1.0 Universal**, full text retained in `VSCO-LICENSE.txt`.

Pinned upstream: https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e

| Deployed file | Original path at the pinned commit | Scientific pitch / MIDI |
| --- | --- | --- |
| c2.mp3 | Strings/Cello Section/pizzT/pizzT_C1_v1_RR1.wav | C2 / 36 |
| g2.mp3 | Strings/Cello Section/pizzT/pizzT_G1_v1_RR1.wav | G2 / 43 |
| d3.mp3 | Strings/Cello Section/pizzT/pizzT_D2_v1_RR1.wav | D3 / 50 |
| a3.mp3 | Strings/Cello Section/pizzT/pizzT_A2_v1_RR1.wav | A3 / 57 |

Upstream filenames use an octave convention one below scientific pitch notation. The audible recordings correspond to the scientific notes above. Do not map the filename C1 to MIDI 24.

Conversion: stereo 44.1 kHz / 24-bit source WAV → mono 32 kHz / 96 kbps MP3, using FFmpeg; no third-party musical composition or owner performance is included. Original attack and decay are retained. These are bowed-instrument **plucked** samples, not sustained bowing or a simulation of bow pressure.

The browser fetches/decodes only the samples needed after a user gesture, caches them for the current interaction, and transposes nearby notes using MIDI pitch ratios. No third-party audio CDN is used. The original four-open-string exercise is generated from these notes at runtime; it is explicitly labeled a system example.
