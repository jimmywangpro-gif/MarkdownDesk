#![cfg(target_os = "macos")]

#[allow(dead_code)]
mod watcher_seam {
    pub fn start_watcher(
        path: std::path::PathBuf,
        on_change: impl Fn(std::path::PathBuf) + Send + 'static,
    ) -> Result<notify::RecommendedWatcher, String> {
        spawn_watcher(path, on_change)
    }

    pub fn external_change(event: &notify::Event, watched: &std::path::Path) -> bool {
        is_external_change(event, watched)
    }

    pub fn write_file(path: &std::path::Path, content: &str) -> Result<(), String> {
        write_file_at(path, content).map(|_| ())
    }

    include!("../src/commands.rs");
}

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

static TEMP_DIR_COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let sequence = TEMP_DIR_COUNTER.fetch_add(1, Ordering::Relaxed);
    let dir = std::env::temp_dir().join(format!(
        "markdowndesk-r03-watcher-{}-{nonce}-{sequence}",
        std::process::id()
    ));
    fs::create_dir(&dir).unwrap();
    dir
}

#[test]
fn watcher_emits_when_target_is_atomically_replaced_in_its_parent_directory() {
    let dir = temp_dir();
    let path = dir.join("note.md");
    fs::write(&path, "v1").unwrap();

    let (tx, rx) = mpsc::channel();
    let watcher = watcher_seam::start_watcher(path.clone(), move |changed| {
        let _ = tx.send(changed);
    })
    .unwrap();

    std::thread::sleep(Duration::from_millis(500));
    watcher_seam::write_file(&path, "v2").unwrap();

    let received = rx
        .recv_timeout(Duration::from_secs(5))
        .expect("watcher 應在 5 秒內收到 atomic replacement 變更");
    assert_eq!(received, path);

    drop(watcher);
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn external_change_uses_canonical_identity_for_symlinked_event_paths() {
    let dir = temp_dir();
    let watched = dir.join("note.md");
    let alias = dir.join("alias.md");
    fs::write(&watched, "v1").unwrap();
    std::os::unix::fs::symlink(&watched, &alias).unwrap();

    let event = notify::Event::new(notify::EventKind::Modify(notify::event::ModifyKind::Data(
        notify::event::DataChange::Any,
    )))
    .add_path(alias);

    let canonical_watched = watched.canonicalize().unwrap();
    assert!(watcher_seam::external_change(&event, &canonical_watched));
    fs::remove_dir_all(dir).unwrap();
}
