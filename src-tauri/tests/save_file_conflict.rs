#![cfg(target_os = "macos")]

mod save_seam {
    include!("../src/commands.rs");
}

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!(
        "markdowndesk-r01-conflict-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn save_rejects_when_the_on_disk_file_changed_since_the_loaded_version() {
    let dir = temp_dir();
    let path = dir.join("note.md");
    fs::write(&path, "loaded content").unwrap();
    let loaded = save_seam::read_file_at(&path).unwrap();

    fs::write(&path, "changed outside MarkdownDesk").unwrap();
    let result = save_seam::save_file(
        path.to_string_lossy().into_owned(),
        "edited in MarkdownDesk".to_string(),
        loaded.mtime,
    );

    assert!(result.is_err());
    assert_eq!(
        fs::read_to_string(&path).unwrap(),
        "changed outside MarkdownDesk"
    );
    fs::remove_dir_all(dir).unwrap();
}
