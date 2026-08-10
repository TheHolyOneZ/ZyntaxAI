use serde::Serialize;
use std::str::FromStr;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use ts_rs::TS;
use zyntax_platform::{Hotkey, HotkeyBackend};

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HotkeyStatus {
    pub accelerator: String,

    pub display: String,
    pub registered: bool,

    pub problem: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum RegisterError {
    #[error("{0}")]
    Invalid(#[from] zyntax_platform::HotkeyError),

    #[error(
        "'{accelerator}' could not be registered — another application is probably already \
         using it. Try a different combination."
    )]
    Unavailable { accelerator: String },

    #[error(
        "this session cannot register global hotkeys; bind a key in your compositor to the \
         command `zyntax fix` instead"
    )]
    Unsupported,
}

pub fn register(app: &AppHandle, accelerator: &str) -> Result<Hotkey, RegisterError> {
    let hotkey = Hotkey::parse(accelerator)?;

    match app.state::<crate::state::AppState>().capabilities.hotkey {
        HotkeyBackend::ExternalCommand => return Err(RegisterError::Unsupported),

        HotkeyBackend::Portal => {
            #[cfg(target_os = "linux")]
            {
                spawn_portal_session(app, &hotkey);
                return Ok(hotkey);
            }
            #[cfg(not(target_os = "linux"))]
            return Err(RegisterError::Unsupported);
        }
        HotkeyBackend::Os => {}
    }

    let shortcut =
        Shortcut::from_str(&hotkey.to_accelerator()).map_err(|_| RegisterError::Unavailable {
            accelerator: hotkey.to_accelerator(),
        })?;

    let manager = app.global_shortcut();
    let _ = manager.unregister_all();

    let handle = app.clone();
    manager
        .on_shortcut(shortcut, move |_app, _shortcut, event| {


            if event.state() == ShortcutState::Released {
                crate::fix::trigger_from_selection(handle.clone());
            }
        })
        .map_err(|err| {
            tracing::error!(%err, accelerator = %hotkey.to_accelerator(), "hotkey registration failed");
            RegisterError::Unavailable {
                accelerator: hotkey.to_accelerator(),
            }
        })?;

    tracing::info!(accelerator = %hotkey.to_accelerator(), "hotkey registered");
    Ok(hotkey)
}

pub fn register_and_record(app: &AppHandle, accelerator: &str) -> Result<(), RegisterError> {
    let result = register(app, accelerator);

    let status = match &result {
        Ok(hotkey) => HotkeyStatus {
            accelerator: hotkey.to_accelerator(),
            display: hotkey.to_string(),
            registered: true,
            problem: None,
        },
        Err(err) => HotkeyStatus {
            accelerator: accelerator.to_owned(),

            display: Hotkey::parse(accelerator)
                .map(|h| h.to_string())
                .unwrap_or_else(|_| accelerator.to_owned()),
            registered: false,
            problem: Some(err.to_string()),
        },
    };

    *app.state::<crate::state::AppState>()
        .hotkey_status
        .lock()
        .expect("hotkey-status lock poisoned") = status;

    result.map(|_| ())
}

#[cfg(target_os = "linux")]
fn spawn_portal_session(app: &AppHandle, hotkey: &Hotkey) {
    let state = app.state::<crate::state::AppState>();

    if let Some(previous) = state
        .portal_task
        .lock()
        .expect("portal-task lock poisoned")
        .take()
    {
        previous.abort();
    }

    let hotkey = hotkey.clone();
    let requested = hotkey.to_accelerator();
    let bound_handle = app.clone();
    let activate_handle = app.clone();

    let task = tauri::async_runtime::spawn(async move {
        let result = zyntax_platform::portal::run(
            &hotkey,
            move |bound| {
                *bound_handle
                    .state::<crate::state::AppState>()
                    .hotkey_status
                    .lock()
                    .expect("hotkey-status lock poisoned") = HotkeyStatus {
                    accelerator: requested.clone(),

                    display: bound.trigger,
                    registered: true,
                    problem: None,
                };
            },
            move || crate::fix::trigger_from_selection(activate_handle.clone()),
        )
        .await;

        if let Err(err) = result {
            tracing::error!(%err, "the desktop portal could not bind a global shortcut");
        }
    });

    *state.portal_task.lock().expect("portal-task lock poisoned") = Some(task);
}

pub fn unregister_all(app: &AppHandle) {
    let _ = app.global_shortcut().unregister_all();

    #[cfg(target_os = "linux")]
    if let Some(task) = app
        .state::<crate::state::AppState>()
        .portal_task
        .lock()
        .expect("portal-task lock poisoned")
        .take()
    {
        task.abort();
    }
}
