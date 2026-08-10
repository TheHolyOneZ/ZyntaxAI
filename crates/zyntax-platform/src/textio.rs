use crate::capabilities::{Capabilities, InjectionBackend};
use crate::clipboard::{Clipboard, ClipboardError};
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::time::Duration;
use thiserror::Error;
use zyntax_core::{InputSource, OutputMode};

#[derive(Debug, Error)]
pub enum PlatformError {
    #[error("clipboard error: {0}")]
    Clipboard(#[from] ClipboardError),

    #[error("nothing was selected, and the clipboard is empty")]
    NothingToCorrect,

    #[error("could not send keystrokes: {0}")]
    Injection(String),

    #[error(
        "this session cannot type into other applications, so the correction was left on your \
         clipboard"
    )]
    InjectionUnavailable,
}

const CLIPBOARD_POLL_INTERVAL: Duration = Duration::from_millis(20);
const CLIPBOARD_POLL_TIMEOUT: Duration = Duration::from_millis(600);

const COPY_ATTEMPTS: usize = 2;
const CAPTURE_SENTINEL: &str = "\u{200b}zyntax\u{200b}";
const MODIFIER_SETTLE: Duration = Duration::from_millis(60);

const PASTE_SETTLE: Duration = Duration::from_millis(60);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Chord {
    Copy,
    Paste,
}

fn is_fresh_copy(text: &str, baseline: Option<&str>) -> bool {
    !text.trim().is_empty() && Some(text) != baseline
}

pub trait TextIo: Send {
    fn capture(&mut self, source: InputSource) -> Result<String, PlatformError>;

    fn deliver(
        &mut self,
        corrected: &str,
        original: &str,
        mode: OutputMode,
    ) -> Result<(), PlatformError>;

    fn copy(&mut self, text: &str) -> Result<(), PlatformError>;

    fn capabilities(&self) -> &Capabilities;
}

pub struct DesktopTextIo {
    clipboard: Clipboard,
    capabilities: Capabilities,
}

impl DesktopTextIo {
    pub fn new(capabilities: Capabilities) -> Result<Self, PlatformError> {
        Ok(Self {
            clipboard: Clipboard::new()?,
            capabilities,
        })
    }

    fn synth_copy(&mut self) -> Result<(), PlatformError> {
        self.synth_chord(Chord::Copy)
    }

    fn synth_paste(&mut self) -> Result<(), PlatformError> {
        self.synth_chord(Chord::Paste)
    }

    fn synth_chord(&mut self, chord: Chord) -> Result<(), PlatformError> {
        match self.capabilities.injection {
            InjectionBackend::None => Err(PlatformError::InjectionUnavailable),
            InjectionBackend::Native => self.synth_chord_native(chord),

            #[cfg(target_os = "linux")]
            backend => crate::wayland::send_chord(backend, chord),

            #[cfg(not(target_os = "linux"))]
            backend => Err(PlatformError::Injection(format!(
                "{backend:?} is only available on Linux"
            ))),
        }
    }

    fn synth_chord_native(&mut self, chord: Chord) -> Result<(), PlatformError> {
        let modifier = if cfg!(target_os = "macos") {
            Key::Meta
        } else {
            Key::Control
        };
        let key = Key::Unicode(match chord {
            Chord::Copy => 'c',
            Chord::Paste => 'v',
        });

        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|err| PlatformError::Injection(err.to_string()))?;

        let inject = |enigo: &mut Enigo| -> Result<(), enigo::InputError> {
            enigo.key(modifier, Direction::Press)?;
            enigo.key(key, Direction::Click)?;
            enigo.key(modifier, Direction::Release)
        };

        inject(&mut enigo).map_err(|err| {
            let _ = enigo.key(modifier, Direction::Release);
            PlatformError::Injection(err.to_string())
        })
    }

    fn release_modifiers(&mut self) {
        if self.capabilities.injection != InjectionBackend::Native {
            return;
        }

        let Ok(mut enigo) = Enigo::new(&Settings::default()) else {
            return;
        };

        for key in [Key::Control, Key::Alt, Key::Shift] {
            let _ = enigo.key(key, Direction::Release);
        }

        std::thread::sleep(MODIFIER_SETTLE);
    }

    pub fn capture_by_copy(&mut self) -> Result<String, PlatformError> {
        let snapshot = self.clipboard.snapshot();

        self.release_modifiers();

        let mut result = Err(PlatformError::NothingToCorrect);

        for _ in 0..COPY_ATTEMPTS {
            let baseline = self.mark_clipboard(&snapshot);

            if let Err(err) = self.synth_copy() {
                result = Err(err);
                break;
            }

            if let Some(text) = self.poll_for_copy(baseline.as_deref()) {
                result = Ok(text);
                break;
            }

            tracing::debug!("the synthetic copy produced nothing; trying once more");
        }

        self.clipboard.restore(snapshot);
        result
    }

    fn mark_clipboard(&mut self, snapshot: &Option<String>) -> Option<String> {
        snapshot.as_ref()?;

        match self.clipboard.set_text(CAPTURE_SENTINEL) {
            Ok(()) => Some(CAPTURE_SENTINEL.to_owned()),
            Err(_) => snapshot.clone(),
        }
    }

    fn poll_for_copy(&mut self, baseline: Option<&str>) -> Option<String> {
        let deadline = std::time::Instant::now() + CLIPBOARD_POLL_TIMEOUT;

        while std::time::Instant::now() < deadline {
            std::thread::sleep(CLIPBOARD_POLL_INTERVAL);

            if let Ok(text) = self.clipboard.text() {
                if is_fresh_copy(&text, baseline) {
                    return Some(text);
                }
            }
        }

        None
    }

    fn paste(&mut self, text: &str) -> Result<(), PlatformError> {
        if !self.capabilities.injection.is_available() {
            self.clipboard.set_text(text)?;
            return Err(PlatformError::InjectionUnavailable);
        }

        let snapshot = self.clipboard.snapshot();
        self.clipboard.set_text(text)?;

        let result = self.synth_paste();

        std::thread::sleep(PASTE_SETTLE);
        self.clipboard.restore(snapshot);

        result
    }
}

impl TextIo for DesktopTextIo {
    fn capture(&mut self, source: InputSource) -> Result<String, PlatformError> {
        let text = match source {
            InputSource::Clipboard => self.clipboard.text().unwrap_or_default(),

            InputSource::Selection => match self.clipboard.primary_text() {
                Ok(text) if !text.trim().is_empty() => text,
                _ => self.capture_by_copy()?,
            },
        };

        if text.trim().is_empty() {
            return Err(PlatformError::NothingToCorrect);
        }
        Ok(text)
    }

    fn deliver(
        &mut self,
        corrected: &str,
        original: &str,
        mode: OutputMode,
    ) -> Result<(), PlatformError> {
        match mode {
            OutputMode::Review => Ok(()),
            OutputMode::Clipboard => self.copy(corrected),
            OutputMode::Replace => self.paste(corrected),
            OutputMode::Append => self.paste(&format!("{original}{corrected}")),
            OutputMode::Prepend => self.paste(&format!("{corrected}{original}")),
        }
    }

    fn copy(&mut self, text: &str) -> Result<(), PlatformError> {
        self.clipboard.set_text(text).map_err(PlatformError::from)
    }

    fn capabilities(&self) -> &Capabilities {
        &self.capabilities
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::capabilities::{DisplayServer, Environment};

    #[derive(Default)]
    struct FakeTextIo {
        capabilities: Option<Capabilities>,
        pub clipboard: String,
        pub pasted: Vec<String>,
        pub selection: String,
    }

    impl FakeTextIo {
        fn new(server: DisplayServer) -> Self {
            Self {
                capabilities: Some(Capabilities::from_environment(&Environment::for_test(
                    server,
                ))),
                ..Default::default()
            }
        }

        fn caps(&self) -> &Capabilities {
            self.capabilities.as_ref().expect("capabilities set")
        }
    }

    impl TextIo for FakeTextIo {
        fn capture(&mut self, source: InputSource) -> Result<String, PlatformError> {
            let text = match source {
                InputSource::Selection => self.selection.clone(),
                InputSource::Clipboard => self.clipboard.clone(),
            };
            if text.trim().is_empty() {
                return Err(PlatformError::NothingToCorrect);
            }
            Ok(text)
        }

        fn deliver(
            &mut self,
            corrected: &str,
            original: &str,
            mode: OutputMode,
        ) -> Result<(), PlatformError> {
            let payload = match mode {
                OutputMode::Review => return Ok(()),
                OutputMode::Clipboard => return self.copy(corrected),
                OutputMode::Replace => corrected.to_owned(),
                OutputMode::Append => format!("{original}{corrected}"),
                OutputMode::Prepend => format!("{corrected}{original}"),
            };

            if !self.caps().injection.is_available() {
                self.clipboard = payload;
                return Err(PlatformError::InjectionUnavailable);
            }
            self.pasted.push(payload);
            Ok(())
        }

        fn copy(&mut self, text: &str) -> Result<(), PlatformError> {
            self.clipboard = text.to_owned();
            Ok(())
        }

        fn capabilities(&self) -> &Capabilities {
            self.caps()
        }
    }

    #[test]
    fn capture_prefers_the_selection() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.selection = "highlighted".to_owned();
        io.clipboard = "copied earlier".to_owned();

        assert_eq!(io.capture(InputSource::Selection).unwrap(), "highlighted");
    }

    #[test]
    fn capture_can_be_told_to_use_the_clipboard() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.selection = "highlighted".to_owned();
        io.clipboard = "copied earlier".to_owned();

        assert_eq!(
            io.capture(InputSource::Clipboard).unwrap(),
            "copied earlier"
        );
    }

    #[test]
    fn capturing_nothing_is_an_error_not_an_empty_request() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        assert!(matches!(
            io.capture(InputSource::Selection),
            Err(PlatformError::NothingToCorrect)
        ));
    }

    #[test]
    fn whitespace_only_selection_counts_as_nothing() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.selection = "  \n ".to_owned();
        assert!(matches!(
            io.capture(InputSource::Selection),
            Err(PlatformError::NothingToCorrect)
        ));
    }

    #[test]
    fn replace_pastes_only_the_correction() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.deliver("fixed", "broke", OutputMode::Replace).unwrap();
        assert_eq!(io.pasted, ["fixed"]);
    }

    #[test]
    fn append_keeps_the_original_first() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.deliver(" fixed", "original", OutputMode::Append)
            .unwrap();
        assert_eq!(io.pasted, ["original fixed"]);
    }

    #[test]
    fn prepend_puts_the_correction_first() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.deliver("fixed ", "original", OutputMode::Prepend)
            .unwrap();
        assert_eq!(io.pasted, ["fixed original"]);
    }

    #[test]
    fn clipboard_mode_never_touches_the_focused_window() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.deliver("fixed", "broke", OutputMode::Clipboard).unwrap();

        assert_eq!(io.clipboard, "fixed");
        assert!(io.pasted.is_empty());
    }

    #[test]
    fn review_mode_writes_nothing_anywhere() {
        let mut io = FakeTextIo::new(DisplayServer::X11);
        io.deliver("fixed", "broke", OutputMode::Review).unwrap();

        assert!(io.pasted.is_empty());
        assert!(io.clipboard.is_empty());
    }

    #[test]
    fn without_injection_the_correction_falls_back_to_the_clipboard() {
        let mut io = FakeTextIo::new(DisplayServer::Wayland);
        let result = io.deliver("fixed", "broke", OutputMode::Replace);

        assert!(matches!(result, Err(PlatformError::InjectionUnavailable)));
        assert_eq!(io.clipboard, "fixed", "the work must not be thrown away");
        assert!(io.pasted.is_empty());
    }

    #[test]
    fn clipboard_mode_still_works_without_injection() {
        let mut io = FakeTextIo::new(DisplayServer::Wayland);
        io.deliver("fixed", "broke", OutputMode::Clipboard)
            .expect("clipboard needs no injection");
        assert_eq!(io.clipboard, "fixed");
    }

    #[test]
    fn a_copy_is_fresh_only_once_the_marker_is_gone() {
        let marker = Some(CAPTURE_SENTINEL);

        assert!(is_fresh_copy("highlighted", marker));
        assert!(!is_fresh_copy(CAPTURE_SENTINEL, marker));
        assert!(!is_fresh_copy("   ", marker));

        assert!(
            is_fresh_copy("what was already on the clipboard", marker),
            "a selection identical to the clipboard must still count as copied"
        );

        assert!(is_fresh_copy("anything", None));
        assert!(!is_fresh_copy("unchanged", Some("unchanged")));
    }

    #[test]
    fn every_error_explains_itself() {
        for error in [
            PlatformError::NothingToCorrect,
            PlatformError::InjectionUnavailable,
            PlatformError::Injection("test".to_owned()),
        ] {
            assert!(!error.to_string().is_empty());
        }
    }
}
