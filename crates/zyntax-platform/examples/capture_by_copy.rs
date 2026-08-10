use zyntax_platform::{Capabilities, DesktopTextIo};

fn main() {
    let mut io = DesktopTextIo::new(Capabilities::detect()).expect("no desktop session");

    match io.capture_by_copy() {
        Ok(text) => println!("{text}"),
        Err(err) => {
            eprintln!("capture: {err}");
            std::process::exit(1);
        }
    }
}
