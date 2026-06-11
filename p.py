from faster_whisper import WhisperModel

model = WhisperModel(
    r"models/faster-whisper-large-v3",
    device="cuda",
    compute_type="float16"
)

segments, info = model.transcribe(
    "11.m4a",
    beam_size=10,
    best_of=10,
    temperature=0.0,
    vad_filter=True,
    word_timestamps=True,
    condition_on_previous_text=True
)

with open("output.txt", "w", encoding="utf-8") as f:
    for segment in segments:
        f.write(segment.text + "\n")