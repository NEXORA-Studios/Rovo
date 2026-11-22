use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CounterConfig {
    #[serde(rename = "counter", default)]
    pub counters: Vec<Counter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Counter {
    pub id: String,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RosterConfig {
    #[serde(rename = "roster", default)]
    pub rosters: Vec<Roster>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Roster {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub members: Vec<Member>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Member {
    pub id: String,
    pub name: String,
    pub status: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RosterStatusConfig {
    #[serde(rename = "status", default)]
    pub statuses: Vec<RosterStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RosterStatus {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SettingsData {
    pub counters: Vec<Counter>,
    pub rosters: Vec<Roster>,
    pub statuses: Vec<RosterStatus>,
}

fn config_path(app: &AppHandle, filename: &str) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;

    fs::create_dir_all(&directory)
        .map_err(|error| format!("Unable to create config directory: {error}"))?;

    Ok(directory.join(filename))
}

fn read_toml<T>(app: &AppHandle, filename: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de> + Default + Serialize,
{
    let path = config_path(app, filename)?;

    if !Path::new(&path).exists() {
        let value = T::default();
        write_toml(app, filename, &value)?;
        return Ok(value);
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Unable to read {}: {error}", path.display()))?;

    toml::from_str(&content).map_err(|error| format!("Unable to parse {}: {error}", path.display()))
}

fn write_toml<T: Serialize>(app: &AppHandle, filename: &str, value: &T) -> Result<(), String> {
    let path = config_path(app, filename)?;
    let temporary_path = path.with_extension("toml.tmp");
    let content = toml::to_string_pretty(value)
        .map_err(|error| format!("Unable to serialize {filename}: {error}"))?;

    fs::write(&temporary_path, content)
        .map_err(|error| format!("Unable to write {}: {error}", temporary_path.display()))?;

    if path.exists() {
        fs::remove_file(&path)
            .map_err(|error| format!("Unable to replace {}: {error}", path.display()))?;
    }

    fs::rename(&temporary_path, &path)
        .map_err(|error| format!("Unable to replace {}: {error}", path.display()))
}

pub fn read_settings(app: &AppHandle) -> Result<SettingsData, String> {
    Ok(SettingsData {
        counters: read_toml::<CounterConfig>(app, "Counter.toml")?.counters,
        rosters: read_toml::<RosterConfig>(app, "Roster.toml")?.rosters,
        statuses: read_toml::<RosterStatusConfig>(app, "RosterStatus.toml")?.statuses,
    })
}

pub fn set_counter_count(app: &AppHandle, counter_id: &str, count: i64) -> Result<(), String> {
    let mut settings = read_settings(app)?;
    let counter = settings
        .counters
        .iter_mut()
        .find(|counter| counter.id == counter_id)
        .ok_or_else(|| format!("Counter not found: {counter_id}"))?;
    counter.count = count;
    write_settings(app, &settings)
}

pub fn write_settings(app: &AppHandle, settings: &SettingsData) -> Result<(), String> {
    write_toml(
        app,
        "Counter.toml",
        &CounterConfig {
            counters: settings.counters.clone(),
        },
    )?;
    write_toml(
        app,
        "Roster.toml",
        &RosterConfig {
            rosters: settings.rosters.clone(),
        },
    )?;
    write_toml(
        app,
        "RosterStatus.toml",
        &RosterStatusConfig {
            statuses: settings.statuses.clone(),
        },
    )
}
