#![cfg(target_os = "macos")]

#[allow(dead_code)]
mod save_seam {
    include!("../src/commands.rs");
}

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Barrier};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!(
        "markdowndesk-r01-atomic-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn successful_write_does_not_expose_a_partial_target() {
    let dir = temp_dir();
    let path = dir.join("note.md");
    let old_content = "o".repeat(1024 * 1024);
    let new_content = "n".repeat(64 * 1024 * 1024);
    let old_len = old_content.len() as u64;
    let new_len = new_content.len() as u64;
    fs::write(&path, &old_content).unwrap();

    let reader_ready = Arc::new(Barrier::new(2));
    let stop_reader = Arc::new(AtomicBool::new(false));
    let saw_partial_target = Arc::new(AtomicBool::new(false));
    let reader_path = path.clone();
    let reader_ready_clone = Arc::clone(&reader_ready);
    let stop_reader_clone = Arc::clone(&stop_reader);
    let saw_partial_target_clone = Arc::clone(&saw_partial_target);
    let reader = thread::spawn(move || {
        reader_ready_clone.wait();
        while !stop_reader_clone.load(Ordering::Acquire) {
            if let Ok(metadata) = fs::metadata(&reader_path) {
                let len = metadata.len();
                if len != old_len && len != new_len {
                    saw_partial_target_clone.store(true, Ordering::Release);
                    break;
                }
            }
            thread::yield_now();
        }
    });

    reader_ready.wait();
    let result = save_seam::write_file_at(&path, &new_content);
    stop_reader.store(true, Ordering::Release);
    reader.join().unwrap();

    assert!(result.is_ok());
    assert!(!saw_partial_target.load(Ordering::Acquire));
    assert_eq!(fs::read_to_string(&path).unwrap(), new_content);
    fs::remove_dir_all(dir).unwrap();
}
