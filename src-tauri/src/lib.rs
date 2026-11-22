mod config;

use config::config::{SettingsData, read_settings, set_counter_count, write_settings};
use tauri::AppHandle;

#[tauri::command]
fn get_settings(app: AppHandle) -> Result<SettingsData, String> {
    read_settings(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: SettingsData) -> Result<(), String> {
    write_settings(&app, &settings)
}

#[tauri::command]
fn update_counter_count(app: AppHandle, counter_id: String, count: i64) -> Result<(), String> {
    set_counter_count(&app, &counter_id, count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            update_counter_count
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
