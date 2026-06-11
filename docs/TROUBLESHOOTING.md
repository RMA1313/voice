# Troubleshooting

## Worker does not start

- Check that Python is installed.
- Check that the virtual environment is active.
- Check that Faster-Whisper dependencies are installed.

## CUDA is unavailable

- Confirm your GPU drivers are installed.
- Confirm PyTorch CUDA build compatibility.
- The app should still work on CPU.

## Transcription fails

- Verify the model path points to a valid local model.
- Verify the audio file is supported.
- Check the local worker logs.

