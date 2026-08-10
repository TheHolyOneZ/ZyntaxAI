use zyntax_core::{InputSource, OutputMode};
use zyntax_platform::{Capabilities, DesktopTextIo, TextIo};

fn main() {
    let mut io = DesktopTextIo::new(Capabilities::detect()).expect("no desktop session");

    let original = match io.capture(InputSource::Selection) {
        Ok(text) => text,
        Err(err) => {
            eprintln!("capture failed: {err}");
            std::process::exit(1);
        }
    };
    eprintln!("captured: {original:?}");

    let corrected = original.to_uppercase();

    match io.deliver(&corrected, &original, OutputMode::Replace) {
        Ok(()) => eprintln!("deliver reported success"),
        Err(err) => {
            eprintln!("deliver failed: {err}");
            std::process::exit(1);
        }
    }
}
