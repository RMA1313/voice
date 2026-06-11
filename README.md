# Voic

Voic is a local-first Persian speech-to-text desktop app for long lecture recordings.

## Features in v1

- RTL Persian UI
- dark mode by default
- file intake and queue
- Faster-Whisper Python worker
- transcript editing
- TXT and Markdown export
- local prompt templates
- model path selection

## From zero

```bash
npm install
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install faster-whisper
```

## Run locally

```bash
npm run dev
npm run tauri dev
```

## Build and checks

```bash
npm run build
npm run tauri build
npm run test
```

## Model path setup

- Set `settings.modelPath` to the folder that contains the Faster-Whisper model files.
- The worker validates that the path exists before starting.
- If you use a local `model.bin`, point the setting directly at that file.

## CUDA 12 and `libcublas.so.12`

If the worker fails with `libcublas.so.12` missing:

1. Install a CUDA 12 runtime-compatible PyTorch build.
2. Ensure the CUDA 12 shared libraries are on `LD_LIBRARY_PATH`.
3. If you are on Linux, confirm the NVIDIA driver and CUDA toolkit versions are compatible.
4. As a fallback, switch the worker to CPU mode by setting the worker device to CPU in your local environment or model config.

## Troubleshooting

- Make sure FFmpeg is installed on the system.
- `npm run tauri dev` requires the Tauri CLI dev dependency from `package.json`.
- Worker logs are written to `stderr`; JSONL protocol events are written to `stdout` only.

## Manual worker check

```bash
python3 worker/worker.py --job-id demo --path /absolute/path/to/audio.wav --settings '{"language":"fa","quality":"balanced","vad":true,"wordTimestamps":false,"prompt":""}'
```

You should see JSONL events on `stdout`, including `progress`, `finalizing`, and a final `completed` event with `fullText`.
