use std::path::PathBuf;
use std::process::{Command, Stdio};

#[tauri::command]
fn ping() -> String {
  "pong".to_string()
}

#[tauri::command]
fn start_transcription(path: String, settings: serde_json::Value) -> Result<serde_json::Value, String> {
  let worker_path = resolve_worker_path()?;
  let child = Command::new("python3")
    .arg(worker_path)
    .arg("--job-id")
    .arg("single")
    .arg("--path")
    .arg(path)
    .arg("--settings")
    .arg(settings.to_string())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|err| err.to_string())?;

  let output = child.wait_with_output().map_err(|err| err.to_string())?;
  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    return Err(if stderr.is_empty() { "رونویسی با خطا مواجه شد.".to_string() } else { stderr });
  }

  let stdout = String::from_utf8_lossy(&output.stdout);
  let mut completed_payload: Option<serde_json::Value> = None;
  for line in stdout.lines() {
    let parsed: serde_json::Value = serde_json::from_str(line).map_err(|err| err.to_string())?;
    match parsed.get("type").and_then(|value| value.as_str()) {
      Some("completed") => {
        if let Some(payload) = parsed.get("payload") {
          completed_payload = Some(payload.clone());
        }
      }
      Some("error") => {
        let message = parsed
          .get("payload")
          .and_then(|payload| payload.get("message"))
          .and_then(|value| value.as_str())
          .unwrap_or("رونویسی با خطا مواجه شد.")
          .to_string();
        return Err(message);
      }
      _ => {}
    }
  }

  completed_payload.ok_or_else(|| "رونویسی پایان یافت اما خروجی نهایی دریافت نشد.".to_string())
}

fn resolve_worker_path() -> Result<PathBuf, String> {
  let cwd_candidate = PathBuf::from("worker/worker.py");
  if cwd_candidate.exists() {
    return Ok(cwd_candidate);
  }
  let exe = std::env::current_exe().map_err(|err| err.to_string())?;
  let base = exe.parent().ok_or_else(|| "cannot resolve executable directory".to_string())?;
  let candidates = [base.join("../worker/worker.py"), base.join("../../worker/worker.py"), base.join("worker/worker.py")];
  candidates
    .into_iter()
    .find(|path| path.exists())
    .ok_or_else(|| "worker/worker.py not found".to_string())
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![ping, start_transcription])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
