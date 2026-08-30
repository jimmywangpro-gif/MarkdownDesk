use std::collections::HashMap;
use std::fs;
#[cfg(target_os = "macos")]
use std::fs::OpenOptions;
#[cfg(target_os = "macos")]
use std::io::Write;
use std::path::{Path, PathBuf};
#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::UNIX_EPOCH;

use notify::{Event, EventKind, RecommendedWatcher, Watcher};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

const RECENT_LIMIT: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenedFile {
    pub path: String,
    pub content: String,
    pub mtime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFile {
    pub path: String,
    pub mtime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub mtime: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileChangedPayload {
    pub path: String,
}

fn mtime_millis(path: &Path) -> Result<u64, String> {
    let modified = fs::metadata(path)
        .map_err(|e| format!("讀取檔案資訊失敗: {e}"))?
        .modified()
        .map_err(|e| format!("讀取修改時間失敗: {e}"))?;
    modified
        .duration_since(UNIX_EPOCH)
        .map(|d| {
            #[cfg(target_os = "macos")]
            {
                // Keep the version within JavaScript's safe integer range while
                // avoiding millisecond collisions between rapid file changes.
                d.as_micros() as u64
            }
            #[cfg(not(target_os = "macos"))]
            {
                d.as_millis() as u64
            }
        })
        .map_err(|e| format!("修改時間無效: {e}"))
}

pub fn read_file_at(path: &Path) -> Result<OpenedFile, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("讀取檔案失敗: {e}"))?;
    let mtime = mtime_millis(path)?;
    Ok(OpenedFile {
        path: path.to_string_lossy().to_string(),
        content,
        mtime,
    })
}

#[cfg(target_os = "macos")]
static TEMP_FILE_COUNTER: AtomicU64 = AtomicU64::new(0);

#[cfg(target_os = "macos")]
fn write_file_atomically(path: &Path, content: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .ok_or_else(|| "寫入檔案失敗: 無效檔案路徑".to_string())?;
    let nonce = TEMP_FILE_COUNTER.fetch_add(1, Ordering::Relaxed);

    for attempt in 0..100 {
        let temporary = parent.join(format!(
            ".{}.markdowndesk-{}-{nonce}-{attempt}.tmp",
            file_name.to_string_lossy(),
            std::process::id(),
        ));
        let mut file = match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
        {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("寫入檔案失敗: {error}")),
        };

        let result = (|| {
            file.write_all(content.as_bytes())
                .map_err(|error| format!("寫入檔案失敗: {error}"))?;
            file.sync_all()
                .map_err(|error| format!("寫入檔案失敗: {error}"))?;
            drop(file);
            fs::rename(&temporary, path).map_err(|error| format!("寫入檔案失敗: {error}"))
        })();
        if result.is_err() {
            let _ = fs::remove_file(&temporary);
        }
        return result;
    }

    Err("寫入檔案失敗: 建立暫存檔失敗".to_string())
}

pub fn write_file_at(path: &Path, content: &str) -> Result<SavedFile, String> {
    #[cfg(target_os = "macos")]
    write_file_atomically(path, content)?;
    #[cfg(not(target_os = "macos"))]
    fs::write(path, content).map_err(|e| format!("寫入檔案失敗: {e}"))?;

    let mtime = mtime_millis(path)?;
    Ok(SavedFile {
        path: path.to_string_lossy().to_string(),
        mtime,
    })
}

fn recent_file_path(data_dir: &Path) -> PathBuf {
    data_dir.join("recent_files.json")
}

fn recent_files_load(data_dir: &Path) -> Vec<RecentFile> {
    let Ok(raw) = fs::read_to_string(recent_file_path(data_dir)) else {
        return Vec::new();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn recent_files_save(data_dir: &Path, files: &[RecentFile]) -> Result<(), String> {
    fs::create_dir_all(data_dir).map_err(|e| format!("建立資料目錄失敗: {e}"))?;
    let raw = serde_json::to_string_pretty(files).map_err(|e| e.to_string())?;
    fs::write(recent_file_path(data_dir), raw).map_err(|e| format!("寫入最近檔案失敗: {e}"))
}

fn recent_files_push(data_dir: &Path, path: &str, mtime: u64) -> Result<(), String> {
    let mut files = recent_files_load(data_dir);
    files.retain(|f| f.path != path);
    files.insert(
        0,
        RecentFile {
            path: path.to_string(),
            mtime,
        },
    );
    files.truncate(RECENT_LIMIT);
    recent_files_save(data_dir, &files)
}

fn recent_files_clear_at(data_dir: &Path) -> Result<(), String> {
    recent_files_save(data_dir, &[])
}

fn is_external_change(event: &Event, watched: &Path) -> bool {
    matches!(
        event.kind,
        EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)
    ) && event
        .paths
        .iter()
        .any(|path| canonical_or_self(path) == watched)
}

fn canonical_or_self(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

#[cfg(target_os = "macos")]
fn watcher_path(path: &Path) -> PathBuf {
    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf()
}

#[cfg(not(target_os = "macos"))]
fn watcher_path(path: &Path) -> PathBuf {
    path.to_path_buf()
}

fn spawn_watcher(
    path: PathBuf,
    on_change: impl Fn(PathBuf) + Send + 'static,
) -> Result<RecommendedWatcher, String> {
    let watched = canonical_or_self(&path);
    let emit_path = path.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            if is_external_change(&event, &watched) {
                on_change(emit_path.clone());
            }
        }
    })
    .map_err(|e| format!("建立檔案監看失敗: {e}"))?;
    watcher
        .watch(&watcher_path(&path), notify::RecursiveMode::NonRecursive)
        .map_err(|e| format!("監看檔案失敗: {e}"))?;
    Ok(watcher)
}

static WATCHERS: OnceLock<Mutex<HashMap<PathBuf, RecommendedWatcher>>> = OnceLock::new();

fn watchers() -> &'static Mutex<HashMap<PathBuf, RecommendedWatcher>> {
    WATCHERS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub async fn open_file(app: AppHandle) -> Result<Option<OpenedFile>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .blocking_pick_file();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = match picked {
        FilePath::Path(p) => p,
        FilePath::Url(_) => return Err("不支援的檔案位置".into()),
    };
    read_file_at(&path).map(Some)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<OpenedFile, String> {
    read_file_at(Path::new(&path))
}

#[tauri::command]
pub fn save_file(path: String, content: String, expected_mtime: u64) -> Result<SavedFile, String> {
    let path = Path::new(&path);
    let actual_mtime = mtime_millis(path)?;
    if actual_mtime != expected_mtime {
        return Err("檔案已在載入後被外部修改，請重新載入後再儲存".to_string());
    }
    write_file_at(path, &content)
}

#[tauri::command]
pub async fn save_file_as(app: AppHandle, content: String) -> Result<Option<SavedFile>, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name("untitled.md")
        .blocking_save_file();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = match picked {
        FilePath::Path(p) => p,
        FilePath::Url(_) => return Err("不支援的檔案位置".into()),
    };
    write_file_at(&path, &content).map(Some)
}

#[tauri::command]
pub fn recent_files_list(app: AppHandle) -> Result<Vec<RecentFile>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(recent_files_load(&data_dir))
}

#[tauri::command]
pub fn recent_files_add(app: AppHandle, path: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mtime = mtime_millis(Path::new(&path))?;
    recent_files_push(&data_dir, &path, mtime)
}

#[tauri::command]
pub fn recent_files_clear(app: AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    recent_files_clear_at(&data_dir)
}

#[tauri::command]
pub fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let watched = PathBuf::from(&path);
    let key = canonical_or_self(&watched);
    let mut active_watchers = watchers().lock().unwrap();
    if active_watchers.contains_key(&key) {
        return Ok(());
    }
    let watcher = spawn_watcher(watched.clone(), move |changed| {
        let _ = app.emit(
            "file-changed",
            FileChangedPayload {
                path: changed.to_string_lossy().to_string(),
            },
        );
    })?;
    active_watchers.insert(key, watcher);
    Ok(())
}

#[tauri::command]
pub fn unwatch_file(path: String) -> Result<(), String> {
    watchers()
        .lock()
        .unwrap()
        .remove(&canonical_or_self(Path::new(&path)));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("markdowndesk-t04-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn read_file_at_reads_content_and_mtime() {
        let dir = temp_dir("read");
        let file = dir.join("note.md");
        fs::write(&file, "# Hello").unwrap();
        let opened = read_file_at(&file).unwrap();
        assert_eq!(opened.content, "# Hello");
        assert_eq!(opened.path, file.to_string_lossy());
        assert!(opened.mtime > 0);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn read_file_at_missing_file_returns_error() {
        let dir = temp_dir("read-missing");
        let err = read_file_at(&dir.join("nope.md")).unwrap_err();
        assert!(err.contains("讀取檔案失敗"));
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn write_file_at_writes_and_returns_mtime() {
        let dir = temp_dir("write");
        let file = dir.join("out.md");
        let saved = write_file_at(&file, "body").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "body");
        assert_eq!(saved.path, file.to_string_lossy());
        assert!(saved.mtime > 0);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn recent_files_push_dedupes_and_caps() {
        let dir = temp_dir("recent");
        for i in 0..12 {
            recent_files_push(&dir, &format!("/tmp/fake-{i}.md"), i as u64).unwrap();
        }
        let files = recent_files_load(&dir);
        assert_eq!(files.len(), RECENT_LIMIT);
        assert_eq!(files[0].path, "/tmp/fake-11.md");
        recent_files_push(&dir, "/tmp/fake-5.md", 99).unwrap();
        let files = recent_files_load(&dir);
        assert_eq!(files.len(), RECENT_LIMIT);
        assert_eq!(files[0].path, "/tmp/fake-5.md");
        assert_eq!(files[0].mtime, 99);
        assert_eq!(
            files.iter().filter(|f| f.path == "/tmp/fake-5.md").count(),
            1
        );
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn recent_files_clear_empties_list() {
        let dir = temp_dir("recent-clear");
        recent_files_push(&dir, "/tmp/a.md", 1).unwrap();
        recent_files_clear_at(&dir).unwrap();
        assert!(recent_files_load(&dir).is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn recent_files_load_missing_file_returns_empty() {
        let dir = temp_dir("recent-missing");
        assert!(recent_files_load(&dir).is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn is_external_change_filters_events() {
        let watched = Path::new("/tmp/note.md");
        let modify = Event::new(EventKind::Modify(notify::event::ModifyKind::Data(
            notify::event::DataChange::Any,
        )))
        .add_path(watched.to_path_buf());
        assert!(is_external_change(&modify, watched));

        let access = Event::new(EventKind::Access(notify::event::AccessKind::Close(
            notify::event::AccessMode::Any,
        )))
        .add_path(watched.to_path_buf());
        assert!(!is_external_change(&access, watched));

        let create = Event::new(EventKind::Create(notify::event::CreateKind::File))
            .add_path(watched.to_path_buf());
        assert!(is_external_change(&create, watched));

        let remove = Event::new(EventKind::Remove(notify::event::RemoveKind::File))
            .add_path(watched.to_path_buf());
        assert!(is_external_change(&remove, watched));

        let other_path = Event::new(EventKind::Modify(notify::event::ModifyKind::Data(
            notify::event::DataChange::Any,
        )))
        .add_path(PathBuf::from("/tmp/other.md"));
        assert!(!is_external_change(&other_path, watched));
    }

    #[test]
    fn is_external_change_classifies_replacement_events_for_watched_path() {
        let watched = Path::new("/tmp/note.md");
        let replacement_remove = Event::new(EventKind::Remove(notify::event::RemoveKind::Any))
            .add_path(watched.to_path_buf());
        let replacement_create = Event::new(EventKind::Create(notify::event::CreateKind::Any))
            .add_path(watched.to_path_buf());

        assert!(is_external_change(&replacement_remove, watched));
        assert!(is_external_change(&replacement_create, watched));
    }

    #[test]
    fn watcher_emits_on_external_write() {
        let dir = temp_dir("watch");
        let file = dir.join("watched.md");
        fs::write(&file, "v1").unwrap();
        let (tx, rx) = mpsc::channel();
        let watcher = spawn_watcher(file.clone(), move |p| {
            let _ = tx.send(p);
        })
        .unwrap();
        std::thread::sleep(Duration::from_millis(500));
        fs::write(&file, "v2").unwrap();
        let received = rx
            .recv_timeout(Duration::from_secs(5))
            .expect("watcher 應在 5 秒內收到變更事件");
        assert_eq!(received, file);
        drop(watcher);
        fs::remove_dir_all(&dir).unwrap();
    }
}
