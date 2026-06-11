import argparse
import json
import sys
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re
import time

STOP_EVENT = threading.Event()
DEFAULT_MODEL_PATH = Path("models/faster-whisper-large-v3")

try:
    from faster_whisper import WhisperModel
except Exception as exc:  # pragma: no cover
    WhisperModel = None
    IMPORT_ERROR = str(exc)
else:
    IMPORT_ERROR = None


@dataclass
class Settings:
    language: str = "fa"
    quality: str = "high"
    vad: bool = True
    wordTimestamps: bool = False
    prompt: str = ""
    device: str = "cuda"
    compute_type: str = "float16"


def ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(message: str) -> None:
    sys.stderr.write(message + "\n")
    sys.stderr.flush()


def emit(event_type: str, job_id: str, payload: dict) -> None:
    sys.stdout.write(json.dumps({"type": event_type, "jobId": job_id, "timestamp": ts(), "payload": payload}, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def fail(job_id: str, code: str, message: str, technical_details: str) -> None:
    emit("error", job_id, {"code": code, "message": message, "technicalDetails": technical_details})
    raise SystemExit(1)


def load_settings(raw: str) -> Settings:
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("settings_must_be_object")

    allowed_keys = {"language", "quality", "vad", "wordTimestamps", "prompt"}
    unknown_keys = sorted(key for key in data.keys() if key not in allowed_keys)
    if unknown_keys:
        log(f"ignoring unknown settings keys: {', '.join(unknown_keys)}")

    normalized = {
        "language": data.get("language", "fa"),
        "quality": data.get("quality", "high"),
        "vad": data.get("vad", True),
        "wordTimestamps": data.get("wordTimestamps", False),
        "prompt": data.get("prompt", ""),
    }

    if normalized["language"] not in {"fa", "ar", "en", "auto"}:
        raise ValueError("invalid_language")
    if normalized["quality"] not in {"high", "balanced", "fast"}:
        raise ValueError("invalid_quality")

    return Settings(**normalized)


def validate_audio(path: str) -> None:
    if not Path(path).exists():
        raise FileNotFoundError(path)
    if Path(path).suffix.lower().lstrip(".") not in {"mp3", "wav", "m4a", "flac", "ogg"}:
        raise ValueError("unsupported_audio")


def resolve_model_path(model_path: str) -> str:
    resolved = Path(model_path)
    if not resolved.exists():
        raise FileNotFoundError(model_path)
    required = [resolved / "model.bin", resolved / "config.json"]
    if not all(item.exists() for item in required):
        raise FileNotFoundError(model_path)
    return model_path


def emit_progress(job_id: str, stage: str, progress: int, message: str) -> None:
    emit("progress", job_id, {"stage": stage, "progress": progress, "message": message})


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def is_obvious_loop(text: str) -> bool:
    normalized = normalize_text(text)
    if len(normalized) < 24:
        return False
    words = normalized.split()
    if len(words) < 6:
        return False
    if len(set(words)) <= max(2, len(words) // 4):
        return True
    for size in range(1, min(6, len(words) // 2) + 1):
        phrase = words[:size]
        repeats = 1
        index = size
        while index + size <= len(words) and words[index:index + size] == phrase:
            repeats += 1
            index += size
        if repeats >= 3 and index >= len(words) * 0.75:
            return True
    return False


def should_skip_segment(text: str, recent_segments: list[str]) -> bool:
    normalized = normalize_text(text)
    if not normalized:
        return True
    if is_obvious_loop(normalized):
        return True
    if len(recent_segments) >= 2 and all(item == normalized for item in recent_segments[-2:]):
        return True
    return False


def run_transcription(job_id: str, path: str, settings: Settings) -> dict:
    if WhisperModel is None:
        fail(job_id, "missing_dependency", "نصب Faster-Whisper انجام نشده است.", IMPORT_ERROR or "faster-whisper import failed")
    try:
        validate_audio(path)
        model_path = resolve_model_path(str(DEFAULT_MODEL_PATH))
    except FileNotFoundError as exc:
        fail(job_id, "missing_model", "مدل پیش‌فرض پیدا نشد. پوشه models/faster-whisper-large-v3 را بررسی کنید.", str(exc))
    except ValueError as exc:
        fail(job_id, "unsupported_audio", "فرمت فایل صوتی پشتیبانی نمی‌شود.", str(exc))

    quality_map = {
        "high": (15, 15),
        "balanced": (8, 8),
        "fast": (5, 5),
    }
    beam_size, best_of = quality_map[settings.quality]
    language = None if settings.language == "auto" else settings.language

    emit_progress(job_id, "loading_model", 5, "در حال بارگذاری مدل...")
    try:
        model = WhisperModel(model_path, device=settings.device, compute_type=settings.compute_type)
    except RuntimeError as exc:
        fail(job_id, "cuda_runtime_error", "خطای CUDA رخ داد.", str(exc))

    emit_progress(job_id, "transcribing", 15, "در حال رونویسی...")
    try:
        segments, info = model.transcribe(
            path,
            **({"language": language} if language is not None else {}),
            beam_size=beam_size,
            best_of=best_of,
            temperature=0.0,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
            vad_filter=settings.vad,
            word_timestamps=settings.wordTimestamps,
            initial_prompt=(settings.prompt or None),
        )
    except RuntimeError as exc:
        fail(job_id, "cuda_runtime_error", "خطای CUDA رخ داد.", str(exc))

    collected = []
    recent_segment_texts: list[str] = []
    total_duration = 0.0
    last_progress = 15
    last_emit_at = time.monotonic()
    last_emitted_bucket = 15
    for segment in segments:
        if STOP_EVENT.is_set():
            emit("cancelled", job_id, {"message": "کاربر عملیات را لغو کرد."})
            raise SystemExit(0)
        segment_text = normalize_text(segment.text)
        if should_skip_segment(segment_text, recent_segment_texts):
            continue
        recent_segment_texts.append(segment_text)
        if len(recent_segment_texts) > 3:
            recent_segment_texts.pop(0)
        segment_payload = {"start": segment.start, "end": segment.end, "text": segment_text}
        emit("segment", job_id, segment_payload)
        collected.append(segment_payload)
        total_duration = max(total_duration, segment.end)
        next_progress = min(95, 15 + len(collected))
        now = time.monotonic()
        if next_progress == 95 and last_emitted_bucket == 95:
            continue
        if next_progress - last_progress >= 2 or now - last_emit_at >= 1:
            emit_progress(job_id, "transcribing", next_progress, "در حال پردازش قطعه...")
            last_progress = next_progress
            last_emit_at = now
            last_emitted_bucket = next_progress

    emit_progress(job_id, "finalizing", 98, "در حال نهایی‌سازی...")
    full_text = "\n".join(item["text"].strip() for item in collected).strip()
    completed_payload = {
        "fullText": full_text,
        "segments": collected,
        "language": info.language,
        "duration": total_duration,
    }
    emit("completed", job_id, completed_payload)
    return completed_payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--path", required=True)
    parser.add_argument("--settings", required=True)
    args = parser.parse_args()
    try:
        settings = load_settings(args.settings)
    except Exception as exc:
        fail(args.job_id, "invalid_settings", "تنظیمات Worker معتبر نیستند.", str(exc))
    try:
        run_transcription(args.job_id, args.path, settings)
    except SystemExit:
        raise
    except Exception as exc:
        fail(args.job_id, "worker_error", "رونویسی با خطا مواجه شد.", str(exc))


if __name__ == "__main__":
    main()
