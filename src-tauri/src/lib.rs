// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_contains_name() {
        assert_eq!(
            greet("老大"),
            "Hello, 老大! You've been greeted from Rust!"
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::open_file,
            commands::read_file,
            commands::save_file,
            commands::save_file_as,
            commands::recent_files_list,
            commands::recent_files_add,
            commands::recent_files_clear,
            commands::watch_file,
            commands::unwatch_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
