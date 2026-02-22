use tauri::Manager;
use std::fs::OpenOptions;
use std::io::Write;

#[tauri::command]
fn write_log(app: tauri::AppHandle, level: String, message: String) {
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] {}\n", timestamp, level.to_uppercase(), message);

    if let Ok(log_dir) = app.path().app_log_dir() {
        let _ = std::fs::create_dir_all(&log_dir);
        let log_file = log_dir.join("system.log");
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
            let _ = file.write_all(line.as_bytes());
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .target(tauri_plugin_log::Target::new(
          tauri_plugin_log::TargetKind::Folder {
            path: std::path::PathBuf::from("."),
            file_name: Some("system".into()),
          }
        ))
        .build(),
    )
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      
      #[cfg(target_os = "macos")]
      {
        window.set_shadow(false).ok();
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![write_log])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
