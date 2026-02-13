use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      
      #[cfg(target_os = "macos")]
      {
        // Force transparent title bar style which helps with background
        // window.set_title_bar_style(tauri::TitleBarStyle::Transparent).ok();
        // Disable shadow to ensure clean transparency
        window.set_shadow(false).ok();
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
