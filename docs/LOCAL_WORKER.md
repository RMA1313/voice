# Local Worker

Voic ships a Python worker that runs Faster-Whisper locally.

## Responsibilities

- load a local model path
- detect CUDA availability
- run transcription
- emit JSONL progress
- emit a final JSON result
- emit structured errors
- support cancellation

## Environment

Create a virtual environment and install:

```bash
pip install faster-whisper
```

If you use CUDA, install the appropriate PyTorch and FFmpeg stack for your platform.

## Protocol

The worker writes progress lines to stdout and returns the final result as JSON.

