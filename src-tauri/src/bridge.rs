//! RUSHplify bridge. The pedal answers only its own web page (no CORS), so the app reaches it from here.
//! Four commands: request (JSON API), file (bytes), discover (known host names), watch (WebSocket events).

use futures_util::StreamExt;
use reqwest::{Client, Method};
use serde::Serialize;
use serde_json::Value;
use std::{
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::Duration,
};
use tauri::{ipc::Response, AppHandle, Emitter, State};
use tokio_tungstenite::connect_async;
use url::Url;

/// Names the pedals announce over mDNS.
const HOSTS: [&str; 3] = ["headrushflexprime.local", "headrushprime.local", "headrushcore.local"];
/// Small object every firmware has; used to tell a pedal from anything else on that name.
const PROBE: &str = "/api/v1/object-properties/Evil/API/RigSaveDialog";

pub struct Bridge {
    client: Client,
    /// Each watch gets a number; a newer watch (or unwatch) ends the older loop.
    watch: Arc<AtomicU64>,
}

impl Default for Bridge {
    fn default() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(20))
                .build()
                .expect("HTTP client"),
            watch: Arc::new(AtomicU64::new(0)),
        }
    }
}

/// Host name, IPv4 or bracketed IPv6, optional port. Nothing that could change the shape of the URL.
pub fn valid_host(host: &str) -> bool {
    !host.is_empty()
        && host.len() <= 253
        && host
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | ':' | '[' | ']'))
}

/// Only the pedal's API, its pairing route and its static files.
pub fn valid_path(path: &str) -> bool {
    (path.starts_with("/api/v1/") || path == "/api/auth" || path.starts_with("/files/"))
        && !path.contains("..")
        && !path.contains('#')
        && !path.contains('\\')
}

pub fn pedal_url(host: &str, path: &str) -> Result<Url, String> {
    if !valid_host(host) {
        return Err(format!("Not a pedal address: {host}"));
    }
    if !valid_path(path) {
        return Err(format!("Not a pedal route: {path}"));
    }
    Url::parse(&format!("http://{host}{path}")).map_err(|error| error.to_string())
}

#[derive(Serialize)]
pub struct Reply {
    status: u16,
    body: Value,
}

#[tauri::command]
pub async fn pedal_request(
    host: String,
    method: String,
    path: String,
    body: Option<Value>,
    bridge: State<'_, Bridge>,
) -> Result<Reply, String> {
    let method = match method.as_str() {
        "GET" => Method::GET,
        "PUT" => Method::PUT,
        "POST" => Method::POST,
        other => return Err(format!("Method not used with the pedal: {other}")),
    };
    let mut request = bridge
        .client
        .request(method, pedal_url(&host, &path)?)
        .header("Accept", "application/json");
    if let Some(body) = body {
        request = request.json(&body);
    }
    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status().as_u16();
    let text = response.text().await.map_err(|error| error.to_string())?;
    let body = if text.trim().is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&text).unwrap_or(Value::String(text))
    };
    Ok(Reply { status, body })
}

/// Raw bytes of a file the pedal serves (block pictures). Arrives in JS as an ArrayBuffer.
#[tauri::command]
pub async fn pedal_file(host: String, path: String, bridge: State<'_, Bridge>) -> Result<Response, String> {
    if !path.starts_with("/files/") {
        return Err(format!("Not a pedal file: {path}"));
    }
    let response = bridge
        .client
        .get(pedal_url(&host, &path)?)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Pedal answered HTTP {}", response.status().as_u16()));
    }
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    Ok(Response::new(bytes.to_vec()))
}

/// Known pedal names that answer, all asked at once.
#[tauri::command]
pub async fn pedal_discover(bridge: State<'_, Bridge>) -> Result<Vec<String>, String> {
    let checks = HOSTS.iter().map(|host| {
        let client = bridge.client.clone();
        async move {
            let answered = client
                .get(format!("http://{host}{PROBE}"))
                .timeout(Duration::from_millis(1500))
                .send()
                .await
                .map(|response| response.status().is_success())
                .unwrap_or(false);
            answered.then(|| host.to_string())
        }
    });
    Ok(futures_util::future::join_all(checks).await.into_iter().flatten().collect())
}

/// The pedal sends every property change to every listener on `ws://host/`; no subscription message.
/// Emits `pedal-event` (the JSON as sent) and `pedal-status` ("open" / "retry"). Reconnects 1 → 10 s.
#[tauri::command]
pub fn pedal_watch(host: String, app: AppHandle, bridge: State<'_, Bridge>) -> Result<(), String> {
    if !valid_host(&host) {
        return Err(format!("Not a pedal address: {host}"));
    }
    let current = bridge.watch.clone();
    let generation = current.fetch_add(1, Ordering::SeqCst) + 1;
    let live = move || current.load(Ordering::SeqCst) == generation;
    tauri::async_runtime::spawn(async move {
        let url = format!("ws://{host}/");
        let mut wait = 1_u64;
        while live() {
            if let Ok((stream, _)) = connect_async(url.as_str()).await {
                wait = 1;
                let _ = app.emit("pedal-status", "open");
                let (_, mut read) = stream.split();
                // The pedal's CPU meter speaks several times a second, so a stopped watch ends promptly.
                while live() {
                    match read.next().await {
                        Some(Ok(message)) if message.is_text() => {
                            if let Ok(event) = serde_json::from_str::<Value>(message.to_text().unwrap_or_default()) {
                                let _ = app.emit("pedal-event", event);
                            }
                        }
                        Some(Ok(_)) => {}
                        _ => break,
                    }
                }
            }
            if !live() {
                break;
            }
            let _ = app.emit("pedal-status", "retry");
            tokio::time::sleep(Duration::from_secs(wait)).await;
            wait = (wait * 2).min(10);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn pedal_unwatch(bridge: State<'_, Bridge>) {
    bridge.watch.fetch_add(1, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hosts() {
        assert!(valid_host("headrushflexprime.local"));
        assert!(valid_host("192.168.1.129:8080"));
        assert!(valid_host("[fe80::1]"));
        assert!(!valid_host(""));
        assert!(!valid_host("pedal.local/evil"));
        assert!(!valid_host("user@pedal.local"));
        assert!(!valid_host("pedal.local?x"));
    }

    #[test]
    fn routes() {
        assert!(valid_path("/api/v1/object-properties/Evil/API/Rigs"));
        assert!(valid_path("/api/v1/object-method/Evil/API/RigSaveDialog/discard"));
        assert!(valid_path("/api/auth"));
        assert!(valid_path("/files/Evil/Web/Blocks/img/Amp.webp"));
        assert!(!valid_path("/"));
        assert!(!valid_path("/api/v1/../../etc"));
        assert!(!valid_path("/api/authx"));
        assert!(!valid_path("//other.host/api/v1/x"));
    }

    #[test]
    fn url_keeps_the_host() {
        let url = pedal_url("headrushflexprime.local", "/files/Neural Amp Modeler/a.webp").unwrap();
        assert_eq!(url.host_str(), Some("headrushflexprime.local"));
        assert_eq!(url.path(), "/files/Neural%20Amp%20Modeler/a.webp");
        assert!(pedal_url("x.local", "/api/v1/../x").is_err());
    }
}
