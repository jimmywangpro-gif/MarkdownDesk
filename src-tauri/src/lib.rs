// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
#[cfg(any(test, target_os = "macos", target_os = "ios", target_os = "android"))]
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use tauri::Emitter;
use tauri::Manager;

mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ---- T07: settings persistence (JSON in app data dir) ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximized: Option<bool>,
}

fn default_split_ratio() -> f64 {
    33.3333
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub editor_font_size: u32,
    pub preview_font_size: u32,
    pub window_state: WindowState,
    #[serde(default = "default_split_ratio")]
    pub split_ratio: f64,
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

fn read_settings_from(path: &Path) -> Result<Option<Settings>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let settings = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(Some(settings))
}

fn write_settings_to(path: &Path, settings: &Settings) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
fn opened_file_paths(urls: Vec<tauri::Url>) -> Vec<String> {
    urls.into_iter()
        .filter_map(|url| url.to_file_path().ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct OpenedFileEvent {
    id: u64,
    path: String,
}

#[derive(Default)]
struct PendingOpenFiles {
    #[cfg(any(test, target_os = "macos", target_os = "ios", target_os = "android"))]
    next_id: AtomicU64,
    files: Mutex<Vec<OpenedFileEvent>>,
}

#[cfg(any(test, target_os = "macos", target_os = "ios", target_os = "android"))]
fn enqueue_pending_opened_file(pending: &PendingOpenFiles, path: String) -> OpenedFileEvent {
    let event = OpenedFileEvent {
        id: pending.next_id.fetch_add(1, Ordering::Relaxed),
        path,
    };
    pending.files.lock().unwrap().push(event.clone());
    event
}

fn take_pending_opened_files(pending: &PendingOpenFiles) -> Vec<OpenedFileEvent> {
    std::mem::take(&mut *pending.files.lock().unwrap())
}

#[tauri::command]
fn take_opened_files(state: tauri::State<'_, PendingOpenFiles>) -> Vec<OpenedFileEvent> {
    take_pending_opened_files(&state)
}

fn acknowledge_pending_opened_files(pending: &PendingOpenFiles, ids: &[u64]) {
    pending
        .files
        .lock()
        .unwrap()
        .retain(|event| !ids.contains(&event.id));
}

#[tauri::command]
fn ack_opened_files(state: tauri::State<'_, PendingOpenFiles>, ids: Vec<u64>) {
    acknowledge_pending_opened_files(&state, &ids);
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<Option<Settings>, String> {
    let path = settings_path(&app)?;
    read_settings_from(&path)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let path = settings_path(&app)?;
    write_settings_to(&path, &settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pending_opened_files_are_taken_once() {
        let pending = PendingOpenFiles::default();
        let event = enqueue_pending_opened_file(&pending, "/tmp/launch.md".to_string());

        assert_eq!(take_pending_opened_files(&pending), vec![event]);
        assert!(take_pending_opened_files(&pending).is_empty());
    }

    #[test]
    fn distinct_same_path_events_have_distinct_ids() {
        let pending = PendingOpenFiles::default();
        let first = enqueue_pending_opened_file(&pending, "/tmp/same.md".to_string());
        let second = enqueue_pending_opened_file(&pending, "/tmp/same.md".to_string());

        assert_ne!(first.id, second.id);
        assert_eq!(take_pending_opened_files(&pending), vec![first, second]);
    }

    #[test]
    fn acknowledged_opened_files_are_removed_without_path_deduplication() {
        let pending = PendingOpenFiles::default();
        let first = enqueue_pending_opened_file(&pending, "/tmp/same.md".to_string());
        let second = enqueue_pending_opened_file(&pending, "/tmp/same.md".to_string());

        acknowledge_pending_opened_files(&pending, &[first.id]);

        assert_eq!(take_pending_opened_files(&pending), vec![second]);
    }

    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
    #[test]
    fn opened_file_urls_are_converted_to_paths() {
        let url = tauri::Url::from_file_path("/tmp/finder-note.md").unwrap();
        assert_eq!(opened_file_paths(vec![url]), vec!["/tmp/finder-note.md"]);
    }

    #[test]
    fn greet_contains_name() {
        assert_eq!(greet("老大"), "Hello, 老大! You've been greeted from Rust!");
    }
}

#[cfg(test)]
mod settings_tests {
    use super::*;
    use std::fs;

    fn temp_settings_dir(tag: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("markdowndesk-{tag}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn settings_json_round_trip_in_temp_dir() {
        let dir = temp_settings_dir("t07-roundtrip");
        let path = dir.join("settings.json");
        let settings = Settings {
            theme: "dark".to_string(),
            editor_font_size: 16,
            preview_font_size: 18,
            window_state: WindowState {
                width: 1000,
                height: 700,
                x: None,
                y: None,
                maximized: None,
            },
            split_ratio: 33.3333,
        };
        write_settings_to(&path, &settings).unwrap();
        let loaded = read_settings_from(&path)
            .unwrap()
            .expect("settings file should exist after write");
        assert_eq!(loaded.theme, "dark");
        assert_eq!(loaded.editor_font_size, 16);
        assert_eq!(loaded.preview_font_size, 18);
        assert_eq!(loaded.window_state.width, 1000);
        assert_eq!(loaded.window_state.height, 700);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn settings_json_round_trip_preserves_split_ratio_with_camel_case_key() {
        let dir = temp_settings_dir("settings-split-ratio-roundtrip");
        let path = dir.join("settings.json");
        let settings = Settings {
            theme: "dark".to_string(),
            editor_font_size: 16,
            preview_font_size: 18,
            window_state: WindowState {
                width: 1000,
                height: 700,
                x: None,
                y: None,
                maximized: None,
            },
            split_ratio: 62.5,
        };

        write_settings_to(&path, &settings).unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        let value: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(value["splitRatio"], serde_json::json!(62.5));

        let loaded = read_settings_from(&path)
            .unwrap()
            .expect("settings file should exist after write");
        assert_eq!(loaded.split_ratio, 62.5);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn legacy_settings_without_split_ratio_use_the_default() {
        let dir = temp_settings_dir("settings-split-ratio-legacy");
        let path = dir.join("settings.json");
        let legacy = r#"
        {
          "theme": "light",
          "editorFontSize": 14,
          "previewFontSize": 16,
          "windowState": { "width": 800, "height": 600 }
        }
        "#;
        fs::write(&path, legacy).unwrap();

        let loaded = read_settings_from(&path)
            .unwrap()
            .expect("legacy settings file should load");
        assert_eq!(loaded.split_ratio, 33.3333);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_settings_returns_none_when_file_missing() {
        let dir = temp_settings_dir("t07-missing");
        let path = dir.join("settings.json");
        assert!(read_settings_from(&path).unwrap().is_none());
        fs::remove_dir_all(&dir).ok();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingOpenFiles::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_settings,
            save_settings,
            take_opened_files,
            ack_opened_files,
            commands::open_file,
            commands::read_file,
            commands::save_file,
            commands::save_file_as,
            commands::recent_files_list,
            commands::recent_files_add,
            commands::recent_files_clear,
            commands::watch_file,
            commands::unwatch_file,
            export_html_save_dialog,
            save_text_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            for path in opened_file_paths(urls) {
                if let Some(pending) = _app_handle.try_state::<PendingOpenFiles>() {
                    let event = enqueue_pending_opened_file(&pending, path);
                    let _ = _app_handle.emit("open-file", event);
                } else {
                    let _ = _app_handle.emit("open-file", path);
                }
            }
        }
    });
}

// ---- T05: standalone HTML export -----------------------------------------

#[tauri::command]
async fn export_html_save_dialog(
    app: tauri::AppHandle,
    suggested_file_name: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = app.dialog().file().add_filter("HTML", &["html", "htm"]);
    if let Some(file_name) = suggested_file_name {
        dialog = dialog.set_file_name(file_name);
    }

    let Some(picked) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    match picked {
        tauri_plugin_dialog::FilePath::Path(path) => Ok(Some(path.to_string_lossy().to_string())),
        tauri_plugin_dialog::FilePath::Url(_) => Err("不支援的檔案位置".into()),
    }
}

fn write_text_file_at(path: &Path, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("寫入檔案失敗: {e}"))
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    write_text_file_at(Path::new(&path), &content)
}

#[cfg(test)]
mod export_html_tests {
    use super::*;

    fn temp_export_dir() -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("markdowndesk-t05-export-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn save_text_file_round_trips_in_a_temp_directory() {
        let dir = temp_export_dir();
        let path = dir.join("offline.html");
        let content = "<!DOCTYPE html><html><body><h1>Notes</h1></body></html>";

        save_text_file(path.to_string_lossy().into_owned(), content.to_string()).unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), content);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn export_html_commands_exist_for_registration() {
        let _dialog_command = export_html_save_dialog;
        let _write_command = save_text_file;
    }
}

use tauri_plugin_dialog::DialogExt;
