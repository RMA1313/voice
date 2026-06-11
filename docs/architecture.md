# Voic Architecture

## Purpose

Voic is a single-user, local-first desktop application for Persian speech-to-text transcription. It is designed for one developer to maintain, ship, and evolve without introducing unnecessary platform complexity.

The product should optimize for:

- local execution
- minimal complexity
- fast iteration
- batch transcription
- model management
- transcript workspace editing
- future LLM post-processing

This document describes the simplest architecture that can support those goals while still scaling cleanly as the product grows.

## Architectural Principles

1. Keep the app local-first by default.
2. Use one desktop shell and one local worker process.
3. Prefer simple data flow over generalized enterprise abstractions.
4. Optimize for a single active user, not multi-user concurrency.
5. Keep the workspace centered around transcripts, not dashboards.
6. Treat batch transcription as a first-class workflow.
7. Separate model management from transcription execution.
8. Make future LLM post-processing an extension of the same transcript pipeline, not a separate subsystem.
9. Persist only what the user needs to resume work.
10. Keep the architecture understandable in one sitting.

## Product Shape

The application should have four primary areas:

- Intake: add files, validate audio, queue jobs
- Transcription: run and monitor one or many jobs
- Workspace: review and edit transcripts
- Models: install, switch, and manage local speech models

The UX should feel like a document workspace with queued work, not like a control panel.

## Recommended Stack

- Desktop shell: Tauri
- Frontend: React + TypeScript
- Worker: Python
- ASR engine: Faster-Whisper Large-v3
- UI direction: fully RTL
- Primary font: Vazirmatn
- Storage: local files and a small app config store

This stack is enough for the current product and avoids the overhead of a more complicated client-server architecture.

## High-Level System Layout

```text
User
  -> Tauri desktop app
    -> React UI
    -> Local app state
    -> Native file dialogs
    -> Local file system
    -> Python worker process
         -> Faster-Whisper
         -> Audio decode / preprocessing
         -> Model cache
         -> Transcript generation
```

## Core Runtime Model

Use one supervised Python worker process per app instance.

### Why this is enough

- It is simple to reason about.
- It avoids a distributed system inside a desktop app.
- It keeps GPU and model state isolated from the UI.
- It supports future batch jobs without needing multiple services.

### Worker responsibilities

- validate input audio
- load and cache models
- run transcription jobs
- emit progress updates
- honor cancellation
- return transcript segments and metadata
- support optional word timestamps
- prepare outputs for later post-processing

### UI responsibilities

- manage the workspace
- collect transcription settings
- queue files for batch processing
- render progress and errors
- allow transcript editing
- export results
- manage local model choices

The UI should not perform transcription logic itself.

## Main Domain Objects

### File

Represents a selected audio file.

Fields:

- path
- name
- size
- duration if available
- validation status

### Job

Represents one transcription request.

Fields:

- id
- file
- settings
- status
- progress
- error
- createdAt
- startedAt
- completedAt

### Batch

Represents a list of jobs submitted together.

Fields:

- id
- jobs
- status
- progress
- completed count
- failed count

### Transcript Document

Represents the editable output in the workspace.

Fields:

- id
- jobId
- title
- segments
- fullText
- notes
- edits
- export state

### Model

Represents an installed or available local speech model.

Fields:

- id
- name
- size
- runtime device support
- local path
- installed state
- checksum or version

## Application Modules

### 1. Workspace Module

The workspace is the heart of the app. It holds:

- current transcript
- transcript editor
- segment list
- selection and search
- export actions
- optional notes or markers

This module should feel like a writing surface, not an admin console.

### 2. Queue Module

Handles:

- single-file transcription
- batch transcription
- job ordering
- retry
- cancel
- failure recovery

The queue should be intentionally simple:

- one active job at a time in v1
- multiple queued jobs
- optional sequential batch processing

Sequential processing keeps GPU use predictable and reduces implementation complexity.

### 3. Model Management Module

Handles:

- listing available models
- downloading or registering local models
- selecting default model
- deleting unused models
- checking GPU compatibility
- storing model metadata

Model management should be a separate module because it changes less often than transcription logic and benefits from clean persistence.

### 4. Post-Processing Module

Reserved for future LLM features such as:

- punctuation cleanup
- paragraph segmentation
- summary generation
- title extraction
- lecture notes generation
- highlight extraction

This module should operate on transcript documents, not raw audio. That keeps it reusable and avoids coupling to the ASR pipeline.

### 5. Export Module

Handles:

- copy to clipboard
- TXT export
- Markdown export
- future subtitle or note formats

Export logic should be deterministic and driven from transcript documents.

## Frontend Architecture

The frontend should use a simple feature-based structure.

### Recommended structure

```text
src/
  app/
    App.tsx
    shell/
    providers/
  components/
    ui/
    layout/
    workflow/
    transcript/
    model/
    queue/
  features/
    workspace/
    transcription/
    batch/
    models/
    export/
    postprocess/
    settings/
  lib/
    tauri/
    store/
    validators/
    formatting/
    rtl/
  styles/
    tokens/
    globals.css
```

### Frontend rules

- Keep reusable UI primitives separate from workflow components.
- Keep business logic inside features, not components.
- Keep Tauri bridge code in one place.
- Keep transcript editing logic close to the workspace feature.
- Keep batch UI simple and list-based.

## State Management

Use one local client state store for application state and keep it small.

### State slices

- `workspace`
- `queue`
- `currentJob`
- `transcript`
- `models`
- `settings`
- `theme`
- `workerStatus`

### State rules

- Persist user preferences locally.
- Keep current queue state in memory with optional recovery metadata.
- Store transcript edits locally so users never lose work.
- Avoid cross-cutting global state unless it is truly shared.

### Recommended persistence

- theme preference
- last selected model
- default transcription settings
- prompt presets
- workspace layout preference
- batch queue recovery metadata if useful

Do not persist raw audio data inside the app state store.

## Tauri Integration

Tauri should be a thin, secure bridge.

### Responsibilities

- launch the Python worker
- manage native dialogs
- read and write local files
- relay job requests
- receive progress events
- report worker health

### Commands

Keep the command surface small:

- `pick_audio_files`
- `start_transcription`
- `cancel_job`
- `get_models`
- `install_model`
- `delete_model`
- `export_transcript`
- `save_workspace`
- `load_workspace`

### Event stream

Worker-to-UI events should cover only what the UI needs:

- job started
- job progress
- job completed
- job failed
- job cancelled
- model loading
- model ready
- model error

This keeps the contract understandable and easy to version.

## Python Worker Architecture

The worker should be a single-purpose service process.

### Modules

```text
worker/
  main.py
  api/
  jobs/
  transcription/
  models/
  audio/
  postprocess/
  storage/
  logging/
  schemas/
```

### Worker flow

1. Receive a transcription request.
2. Validate input.
3. Resolve the model.
4. Prepare audio.
5. Run Faster-Whisper.
6. Stream progress events.
7. Write transcript artifacts.
8. Return result metadata.

### Cancellation

Cancellation should be cooperative and checked during long-running steps. A cancellation request should stop the job cleanly and preserve partial output if available.

### Batch support

Batch transcription should be sequential in the first version.

Why:

- easier to implement
- easier to debug
- predictable memory use
- better GPU stability

If parallelism is needed later, it should be introduced carefully and only after profiling.

## Transcript Workspace Architecture

The transcript workspace is the primary product surface.

### Responsibilities

- show the generated transcript
- allow editing by segment and by full text
- support search within transcript
- allow copy and export
- display job metadata
- preserve edits across sessions

### Workspace model

Store both:

- source transcript from the worker
- user edits applied in the workspace

This separation is important because it allows:

- re-running post-processing without losing raw output
- comparing original and edited versions
- future LLM cleanup workflows

### Recommended editing model

Use a document-style editor with segment awareness.

That means:

- the app can display transcript segments for structure
- the user can edit the full text naturally
- segment metadata remains available for timestamps and navigation

Avoid forcing the user into a rigid form UI.

## Future LLM Post-Processing

Design for LLM post-processing as a follow-up step on transcript documents.

### Suggested pipeline

Audio -> ASR transcript -> optional cleanup -> optional summarization -> export

### Why this matters

It keeps future AI features modular without making the ASR pipeline more complex than necessary.

### Future capabilities

- punctuation normalization
- paragraph restructuring
- key point extraction
- chaptering
- academic summary generation
- lecture note generation

Keep these features optional and local-first if possible.

## Model Management Strategy

Model management should be explicit and visible.

### Required capabilities

- show installed models
- show current default model
- show model size and device compatibility
- install or register models locally
- remove old models
- detect CPU or CUDA support
- warn when a selected model is not compatible

### Simplicity rules

- Do not build a marketplace.
- Do not support complex remote model orchestration.
- Do not create a generic plugin system for models.
- Keep one clear path for selecting a model.

### Recommended default behavior

- ship with a clear default model choice
- allow advanced users to switch models
- remember the last used model per user

## Error Handling

The app should be resilient but not noisy.

### Error categories

- invalid audio file
- unsupported format
- model missing
- model load failure
- CUDA unavailable
- worker crash
- transcription failure
- export failure
- filesystem permission failure

### UX strategy

- show short Persian messages
- keep technical details available but collapsed
- preserve user input after errors
- let users retry from the same screen

### Logging

Keep local logs for debugging:

- worker lifecycle
- job events
- model resolution
- export actions
- unexpected exceptions

Do not over-engineer telemetry for a single-user local app.

## Data Storage

Use simple local storage patterns.

### Store

- user preferences
- workspace state
- model metadata
- queue recovery metadata
- recent files

### Filesystem artifacts

- transcripts
- exports
- cached models
- temporary audio processing files
- logs

### Storage rules

- use stable, human-readable file formats where possible
- keep app metadata small
- do not hide user outputs deep in opaque caches
- make it easy for users to back up or inspect their data

## Performance Strategy

The app should feel fast even when transcription is not.

### Frontend

- keep rendering light
- avoid unnecessary re-renders
- virtualize long transcript or batch lists if needed
- keep the workspace responsive while jobs run

### Worker

- reuse loaded models when reasonable
- avoid repeated decode work
- use sequential batch execution by default
- limit memory churn

### UX

- show immediate feedback when a job starts
- update progress frequently but not excessively
- make cancellation visibly responsive

## Testing Strategy

Keep testing focused on workflow reliability.

### Unit tests

- file validation
- settings normalization
- export formatting
- transcript transformation
- model selection logic

### Integration tests

- Tauri command bridge
- worker event stream
- job start/cancel flow
- export flow
- model load flow

### End-to-end tests

- select files
- queue multiple transcriptions
- edit transcript
- export transcript
- recover from failure

### High-value regression cases

- long recordings
- batch queues
- cancel mid-job
- missing model
- invalid audio
- CUDA fallback
- text editing persistence

## Documentation Strategy

Documentation should help one developer move quickly.

### Must-have docs

- architecture overview
- worker protocol
- model management notes
- release checklist
- troubleshooting guide
- export format guide

### Nice-to-have docs

- ADRs for major decisions
- development setup notes
- packaging notes
- batch processing examples

### Rule

Keep docs short, practical, and easy to update.

## Roadmap

### Phase 1: Foundation

- app shell
- RTL theme system
- file intake
- local worker launch
- model loading
- single-job transcription

### Phase 2: Workspace

- transcript editor
- copy and export
- persistence
- error recovery
- progress and cancellation

### Phase 3: Batch and Model Management

- batch queue
- batch status UI
- model list
- model switching
- model deletion

### Phase 4: Post-Processing

- transcript cleanup pipeline
- LLM prompt presets
- summary generation
- note extraction

### Phase 5: Polish and Scale

- accessibility hardening
- performance tuning
- packaging
- diagnostics
- advanced formatting and export options

## Explicit Simplifications

To keep the product maintainable by one developer, this architecture intentionally avoids:

- microservices
- background job brokers
- enterprise authentication
- multi-user permissions
- cloud sync
- plugin marketplaces
- distributed task orchestration
- separate backend API servers
- complicated event sourcing

These patterns are unnecessary for a local single-user transcription app and would slow iteration.

## Final Recommendation

The best architecture for Voic is a three-part system:

- a thin Tauri desktop shell
- a focused React transcript workspace
- a single Python worker for transcription and model execution

Everything else should be a small module around those three parts.

That gives the app enough structure to support batch transcription, model management, and future LLM post-processing without turning it into an enterprise platform.
