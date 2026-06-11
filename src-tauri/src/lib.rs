use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn ping() -> String {
  "pong".to_string()
}

#[tauri::command]
fn start_transcription(app: AppHandle, path: String, settings: serde_json::Value) -> Result<(), String> {
  let worker_path = PathBuf::from("/home/aip/Desktop/project/voic/worker/worker.py");
  let project_root = PathBuf::from("/home/aip/Desktop/project/voic");
  let old_ld = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
  let cuda_ld = format!(
    "/home/aip/.local/lib/python3.10/site-packages/nvidia/cublas/lib:/home/aip/.local/lib/python3.10/site-packages/nvidia/cudnn/lib{}{}",
    if old_ld.is_empty() { "" } else { ":" },
    old_ld
  );

  eprintln!("worker_path={}", worker_path.display());
  eprintln!("current_dir={}", project_root.display());
  eprintln!("LD_LIBRARY_PATH={}", cuda_ld);

  std::thread::spawn(move || {
    let mut child = match Command::new("python3")
      .current_dir(&project_root)
      .env("LD_LIBRARY_PATH", &cuda_ld)
      .arg(&worker_path)
      .arg("--job-id")
      .arg("single")
      .arg("--path")
      .arg(path)
      .arg("--settings")
      .arg(settings.to_string())
      .stdout(Stdio::piped())
      .stderr(Stdio::piped())
      .spawn()
    {
      Ok(child) => child,
      Err(err) => {
        let payload = serde_json::json!({
          "message": format!("failed to spawn worker: {err}"),
          "technicalDetails": {
            "workerPath": worker_path.display().to_string(),
            "currentDir": project_root.display().to_string(),
            "ldLibraryPath": cuda_ld,
            "stdout": "",
            "stderr": "",
          }
        });
        let _ = app.emit("voic-error", payload);
        return;
      }
    };

    let stdout = match child.stdout.take() {
      Some(stdout) => stdout,
      None => {
        let payload = serde_json::json!({
          "message": "worker stdout not captured",
          "technicalDetails": {
            "workerPath": worker_path.display().to_string(),
            "currentDir": project_root.display().to_string(),
            "ldLibraryPath": cuda_ld,
          }
        });
        let _ = app.emit("voic-error", payload);
        return;
      }
    };
    let stderr = match child.stderr.take() {
      Some(stderr) => stderr,
      None => {
        let payload = serde_json::json!({
          "message": "worker stderr not captured",
          "technicalDetails": {
            "workerPath": worker_path.display().to_string(),
            "currentDir": project_root.display().to_string(),
            "ldLibraryPath": cuda_ld,
          }
        });
        let _ = app.emit("voic-error", payload);
        return;
      }
    };

    let stderr_handle = std::thread::spawn(move || {
      let mut stderr_text = String::new();
      let reader = BufReader::new(stderr);
      for line in reader.lines() {
        match line {
          Ok(line) => {
            stderr_text.push_str(&line);
            stderr_text.push('\n');
          }
          Err(err) => {
            stderr_text.push_str(&format!("stderr read error: {err}\n"));
          }
        }
      }
      stderr_text
    });

    let reader = BufReader::new(stdout);
    let mut completed_payload: Option<serde_json::Value> = None;
    let mut worker_error: Option<serde_json::Value> = None;
    let mut stdout_text = String::new();

    for line in reader.lines() {
      match line {
        Ok(line) => {
          stdout_text.push_str(&line);
          stdout_text.push('\n');
          match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(parsed) => match parsed.get("type").and_then(|value| value.as_str()) {
              Some("progress") => {
                let _ = app.emit("voic-progress", parsed);
              }
              Some("segment") => {
                let _ = app.emit("voic-segment", parsed);
              }
              Some("completed") => {
                completed_payload = parsed.get("payload").cloned();
                let _ = app.emit("voic-completed", parsed);
              }
              Some("error") => {
                worker_error = Some(parsed.get("payload").cloned().unwrap_or(serde_json::Value::Null));
                let _ = app.emit("voic-error", parsed);
              }
              _ => {}
            },
            Err(err) => {
              let payload = serde_json::json!({
                "message": format!("invalid worker jsonl: {err}"),
                "technicalDetails": {
                  "workerPath": worker_path.display().to_string(),
                  "currentDir": project_root.display().to_string(),
                  "ldLibraryPath": cuda_ld,
                  "stdout": stdout_text,
                }
              });
              let _ = app.emit("voic-error", payload);
              return;
            }
          }
        }
        Err(err) => {
          let payload = serde_json::json!({
            "message": format!("failed reading worker stdout: {err}"),
            "technicalDetails": {
              "workerPath": worker_path.display().to_string(),
              "currentDir": project_root.display().to_string(),
              "ldLibraryPath": cuda_ld,
              "stdout": stdout_text,
            }
          });
          let _ = app.emit("voic-error", payload);
          return;
        }
      }
    }

    let stderr_text = stderr_handle.join().unwrap_or_else(|_| "stderr join failed".to_string());
    let status = match child.wait() {
      Ok(status) => status,
      Err(err) => {
        let payload = serde_json::json!({
          "message": format!("failed to wait for worker: {err}"),
          "technicalDetails": {
            "workerPath": worker_path.display().to_string(),
            "currentDir": project_root.display().to_string(),
            "ldLibraryPath": cuda_ld,
            "stdout": stdout_text,
            "stderr": stderr_text,
          }
        });
        let _ = app.emit("voic-error", payload);
        return;
      }
    };
    let exit_code = status.code();
    eprintln!("worker_exit_code={}", exit_code.map_or_else(|| "signal".to_string(), |code| code.to_string()));

    if !status.success() {
      let payload = serde_json::json!({
        "message": "worker exited non-zero",
        "technicalDetails": {
          "workerPath": worker_path.display().to_string(),
          "currentDir": project_root.display().to_string(),
          "ldLibraryPath": cuda_ld,
          "exitCode": exit_code,
          "stdout": stdout_text,
          "stderr": stderr_text,
        }
      });
      let _ = app.emit("voic-error", payload);
      return;
    }

    if worker_error.is_some() {
      return;
    }

    if completed_payload.is_none() {
      let payload = serde_json::json!({
        "message": "worker completed without final payload",
        "technicalDetails": {
          "workerPath": worker_path.display().to_string(),
          "currentDir": project_root.display().to_string(),
          "ldLibraryPath": cuda_ld,
          "exitCode": exit_code,
          "stdout": stdout_text,
          "stderr": stderr_text,
        }
      });
      let _ = app.emit("voic-error", payload);
    }
  });

  Ok(())
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![ping, start_transcription])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
