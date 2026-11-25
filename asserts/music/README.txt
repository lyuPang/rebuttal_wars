REBUTTAL WARS — ORIGINAL MINI OST
原创程序合成配乐 / Original synthesized chiptune soundtrack

Track                           BPM   Duration   Playback
01_paper_submission             105   36.57 s    loop (menu / paper selection)
02_midnight_lab                  88   43.64 s    loop (map / random events / reward)
03_reviewer_1_cross_examination 126   45.71 s    loop (Reviewer #1)
04_reviewer_2_final_rebuttal    144   40.00 s    loop (Reviewer #2)
05_paper_accepted               118    6.10 s    once (Accept / Weak Accept)
06_paper_rejected                84    6.43 s    once (Reject)

ogg/ contains Vorbis stereo 44.1 kHz, recommended for looping in supported browsers.
mp3/ contains 192 kbps stereo 44.1 kHz, fallback for broad compatibility.
Both formats contain the same six compositions. Use one format at runtime, not both.
The four BGM tracks were synthesized with circular tail mixing; compressed decoding
and browser playback scheduling can still introduce a seam. Verify in the target browser.
For tighter looping use Web Audio API AudioBufferSourceNode.loop, with the decoded buffer.
Use a user interaction to unlock audio playback. Set background gain around 0.20–0.35
initially (adjust to taste and relative sound-effect levels); crossfade 0.4–0.8 s between tracks.
Stop or fade BGM before playing a result jingle. Do not loop the two jingles.

Credit suggestion for assignment report:
Music: Original chiptune compositions generated with ChatGPT using Python-based
procedural audio synthesis; no third-party recordings or samples were used.

No existing soundtrack, audio recording, or melody was intentionally used as a reference.
