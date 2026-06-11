# Voic Architecture

Voic is a single-user, local-first Persian desktop transcription app built with:

- Tauri v2
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Python
- Faster-Whisper

## Runtime Shape

The app uses one desktop shell and one Python worker process.

- The frontend handles workspace, queue UI, settings, and exports.
- The Rust side of Tauri bridges commands and file dialogs.
- The Python worker performs transcription and emits JSON progress events.

## Simple Modules

- File intake
- Queue
- Settings
- Prompt library
- Model manager
- Transcript workspace
- Export

## Design Rules

- Keep the UI fully Persian and RTL.
- Keep processing local.
- Keep the queue sequential.
- Keep the worker isolated.
- Keep transcript editing separate from raw transcript output.

## Future Extensions

- Batch transcription is already supported by the queue.
- LLM post-processing can be added as a transcript-stage feature.
- Model management can grow without changing the workspace architecture.

