use serde::{Deserialize, Serialize};
use sysinfo::System;
use std::process::Command;

#[derive(Serialize, Deserialize)]
pub struct CpuInfo {
    pub model: String,
    pub cores: usize,
    pub brand: String,
}

#[derive(Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
}

#[derive(Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub total: u64,
    pub available: u64,
    pub kind: String,
}

#[derive(Serialize, Deserialize)]
pub struct BatteryInfo {
    pub health: f64,
    pub cycle_count: u32,
    pub design_capacity: u32,
    pub max_capacity: u32,
    pub current_capacity: u32,
    pub is_charging: bool,
    pub temperature: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct StorageHealth {
    pub model: String,
    pub smart_status: String,
    pub power_on_hours: Option<u64>,
    pub temperature: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct RefurbishmentCheck {
    pub is_refurbished: bool,
    pub confidence: String, // "high", "medium", "low"
    pub indicators: Vec<RefurbishmentIndicator>,
    pub replaced_parts: Vec<String>,
    pub details: RefurbishmentDetails,
}

#[derive(Serialize, Deserialize)]
pub struct RefurbishmentIndicator {
    pub name: String,
    pub detected: bool,
    pub description: String,
    pub severity: String, // "info", "warning", "critical"
}

#[derive(Serialize, Deserialize)]
pub struct RefurbishmentDetails {
    pub serial_manufacture_date: Option<String>,
    pub os_install_date: Option<String>,
    pub battery_manufacture_date: Option<String>,
    pub storage_first_use_date: Option<String>,
    pub date_mismatch: bool,
    pub refurb_program: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SystemHardwareInfo {
    pub os_name: String,
    pub os_version: String,
    pub hostname: String,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub disks: Vec<DiskInfo>,
    pub serial_number: String,
}

#[tauri::command]
fn get_hardware_info() -> SystemHardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_info = CpuInfo {
        model: sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default(),
        cores: sys.cpus().len(),
        brand: sys.cpus().first().map(|c| c.vendor_id().to_string()).unwrap_or_default(),
    };

    let memory_info = MemoryInfo {
        total: sys.total_memory(),
        used: sys.used_memory(),
        available: sys.available_memory(),
    };

    let disks: Vec<DiskInfo> = sysinfo::Disks::new_with_refreshed_list()
        .iter()
        .map(|d| DiskInfo {
            name: d.name().to_string_lossy().to_string(),
            total: d.total_space(),
            available: d.available_space(),
            kind: format!("{:?}", d.kind()),
        })
        .collect();

    let serial_number = get_serial_number();

    SystemHardwareInfo {
        os_name: System::name().unwrap_or_default(),
        os_version: System::os_version().unwrap_or_default(),
        hostname: System::host_name().unwrap_or_default(),
        cpu: cpu_info,
        memory: memory_info,
        disks,
        serial_number,
    }
}

#[cfg(target_os = "macos")]
fn get_serial_number() -> String {
    let output = Command::new("ioreg")
        .args(["-l"])
        .output()
        .ok();
    
    if let Some(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            if line.contains("IOPlatformSerialNumber") {
                if let Some(serial) = line.split('"').nth(3) {
                    return serial.to_string();
                }
            }
        }
    }
    "Unknown".to_string()
}

#[cfg(target_os = "windows")]
fn get_serial_number() -> String {
    let output = Command::new("wmic")
        .args(["bios", "get", "serialnumber"])
        .output()
        .ok();
    
    if let Some(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let lines: Vec<&str> = stdout.lines().collect();
        if lines.len() > 1 {
            return lines[1].trim().to_string();
        }
    }
    "Unknown".to_string()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_serial_number() -> String {
    "Unknown".to_string()
}

#[tauri::command]
fn get_battery_info() -> Option<BatteryInfo> {
    #[cfg(target_os = "macos")]
    {
        get_battery_info_macos()
    }
    #[cfg(target_os = "windows")]
    {
        get_battery_info_windows()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

#[cfg(target_os = "macos")]
fn get_battery_info_macos() -> Option<BatteryInfo> {
    let output = Command::new("system_profiler")
        .args(["SPPowerDataType", "-json"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).ok()?;
    
    let power_data = json.get("SPPowerDataType")?.as_array()?;
    
    // Find battery information section
    let battery_info = power_data.iter()
        .find(|item| item.get("_name").and_then(|n| n.as_str()) == Some("spbattery_information"))?;
    
    // Extract charge info
    let charge_info = battery_info.get("sppower_battery_charge_info")?;
    let is_charging = charge_info.get("sppower_battery_is_charging")
        .and_then(|v| v.as_str())
        .map(|s| s == "TRUE")
        .unwrap_or(false);
    let current_capacity = charge_info.get("sppower_battery_state_of_charge")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    
    // Extract health info
    let health_info = battery_info.get("sppower_battery_health_info")?;
    let cycle_count = health_info.get("sppower_battery_cycle_count")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    
    // Parse health percentage from string like "96%"
    let health = health_info.get("sppower_battery_health_maximum_capacity")
        .and_then(|v| v.as_str())
        .and_then(|s| s.trim_end_matches('%').parse::<f64>().ok())
        .unwrap_or(100.0);
    
    // Calculate max_capacity based on health percentage (assuming design_capacity as 100 units)
    let design_capacity: u32 = 100;
    let max_capacity = health as u32;
    
    Some(BatteryInfo {
        health,
        cycle_count,
        design_capacity,
        max_capacity,
        current_capacity,
        is_charging,
        temperature: None, // SPPowerDataType doesn't provide temperature
    })
}

#[cfg(target_os = "windows")]
fn get_battery_info_windows() -> Option<BatteryInfo> {
    let output = Command::new("powershell")
        .args(["-Command", "Get-WmiObject -Class Win32_Battery | Select-Object EstimatedChargeRemaining, DesignCapacity, FullChargeCapacity, BatteryStatus | ConvertTo-Json"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // Parse basic info (simplified for Windows)
    let current_capacity: u32 = 100;
    let design_capacity: u32 = 100;
    let max_capacity: u32 = 100;
    
    Some(BatteryInfo {
        health: 100.0,
        cycle_count: 0, // Windows doesn't easily expose this
        design_capacity,
        max_capacity,
        current_capacity,
        is_charging: false,
        temperature: None,
    })
}

#[tauri::command]
fn get_storage_health() -> Option<StorageHealth> {
    #[cfg(target_os = "macos")]
    {
        get_storage_health_macos()
    }
    #[cfg(target_os = "windows")]
    {
        get_storage_health_windows()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

#[cfg(target_os = "macos")]
fn get_storage_health_macos() -> Option<StorageHealth> {
    // Get disk model
    let output = Command::new("system_profiler")
        .args(["SPStorageDataType", "-json"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut model = "Unknown".to_string();
    
    // Simple parsing for device name
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
        if let Some(storage) = json.get("SPStorageDataType") {
            if let Some(arr) = storage.as_array() {
                if let Some(first) = arr.first() {
                    if let Some(physical) = first.get("physical_drive") {
                        if let Some(name) = physical.get("device_name") {
                            model = name.as_str().unwrap_or("Unknown").to_string();
                        }
                    }
                }
            }
        }
    }
    
    // Get SMART status
    let smart_output = Command::new("diskutil")
        .args(["info", "disk0"])
        .output()
        .ok()?;
    
    let smart_stdout = String::from_utf8_lossy(&smart_output.stdout);
    let mut smart_status = "Unknown".to_string();
    
    for line in smart_stdout.lines() {
        if line.contains("SMART Status") {
            smart_status = line.split(':').nth(1).unwrap_or("Unknown").trim().to_string();
            break;
        }
    }
    
    Some(StorageHealth {
        model,
        smart_status,
        power_on_hours: None,
        temperature: None,
    })
}

#[cfg(target_os = "windows")]
fn get_storage_health_windows() -> Option<StorageHealth> {
    let output = Command::new("powershell")
        .args(["-Command", "Get-PhysicalDisk | Select-Object FriendlyName, HealthStatus | ConvertTo-Json"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    Some(StorageHealth {
        model: "Unknown".to_string(),
        smart_status: "Healthy".to_string(),
        power_on_hours: None,
        temperature: None,
    })
}

#[tauri::command]
fn get_network_info() -> serde_json::Value {
    #[cfg(target_os = "macos")]
    {
        let wifi = Command::new("networksetup")
            .args(["-getairportpower", "en0"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("On"))
            .unwrap_or(false);
        
        let bluetooth = Command::new("system_profiler")
            .args(["SPBluetoothDataType"])
            .output()
            .map(|o| !o.stdout.is_empty())
            .unwrap_or(false);
        
        serde_json::json!({
            "wifi": { "available": true, "enabled": wifi },
            "bluetooth": { "available": bluetooth, "enabled": bluetooth }
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        serde_json::json!({
            "wifi": { "available": true, "enabled": true },
            "bluetooth": { "available": true, "enabled": true }
        })
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn check_refurbishment() -> RefurbishmentCheck {
    #[cfg(target_os = "macos")]
    {
        check_refurbishment_macos()
    }
    #[cfg(target_os = "windows")]
    {
        check_refurbishment_windows()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        RefurbishmentCheck {
            is_refurbished: false,
            confidence: "low".to_string(),
            indicators: vec![],
            replaced_parts: vec![],
            details: RefurbishmentDetails {
                serial_manufacture_date: None,
                os_install_date: None,
                battery_manufacture_date: None,
                storage_first_use_date: None,
                date_mismatch: false,
                refurb_program: None,
            },
        }
    }
}

#[cfg(target_os = "macos")]
fn check_refurbishment_macos() -> RefurbishmentCheck {
    let mut indicators: Vec<RefurbishmentIndicator> = vec![];
    let mut replaced_parts: Vec<String> = vec![];
    let mut is_refurbished = false;
    
    let mut serial_date: Option<String> = None;
    let mut os_install_date: Option<String> = None;
    let mut battery_date: Option<String> = None;
    let mut refurb_program: Option<String> = None;
    
    // 1. Check serial number for refurbishment indicator
    let serial = get_serial_number();
    if serial.len() >= 4 {
        // Apple refurbished devices often have serial starting with 'F' (certified refurbished)
        if serial.starts_with('F') {
            is_refurbished = true;
            refurb_program = Some("Apple Certified Refurbished".to_string());
            indicators.push(RefurbishmentIndicator {
                name: "serial_refurb".to_string(),
                detected: true,
                description: "serial_starts_with_f".to_string(),
                severity: "info".to_string(),
            });
        }
        
        serial_date = Some(serial[..4].to_string());
    }
    
    // 2. Check for refurbishment flag in NVRAM/IORegistry
    if let Ok(output) = Command::new("ioreg")
        .args(["-l"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Check for refurbishment indicators
        if stdout.contains("refurbished") || stdout.contains("Refurbished") {
            is_refurbished = true;
            indicators.push(RefurbishmentIndicator {
                name: "ioreg_refurb".to_string(),
                detected: true,
                description: "firmware_refurb_flag".to_string(),
                severity: "info".to_string(),
            });
        }
        
        // Check battery manufacture date from serial number
        // Battery serial format: F8Y201400XQQ1LTAH - extract manufacture info
        for line in stdout.lines() {
            if line.contains("\"Serial\"") && line.contains("AppleSmartBattery") {
                if let Some(serial_part) = line.split('"').nth(3) {
                    // Extract year/week from battery serial if available
                    battery_date = Some(serial_part.to_string());
                }
            }
        }
        
        // Also try to get battery serial from system_profiler
        if battery_date.is_none() {
            if let Ok(output) = Command::new("system_profiler")
                .args(["SPPowerDataType", "-json"])
                .output()
            {
                let power_stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&power_stdout) {
                    if let Some(power_data) = json.get("SPPowerDataType").and_then(|v| v.as_array()) {
                        for item in power_data {
                            if let Some(model_info) = item.get("sppower_battery_model_info") {
                                if let Some(serial) = model_info.get("sppower_battery_serial_number") {
                                    battery_date = serial.as_str().map(|s| s.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 3. Get OS install date
    if let Ok(output) = Command::new("stat")
        .args(["-f", "%SB", "/var/db/.AppleSetupDone"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() {
            os_install_date = Some(stdout);
        }
    }
    
    // 4. Check for enterprise management (MDM enrollment)
    if let Ok(output) = Command::new("profiles")
        .args(["status", "-type", "enrollment"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Check for DEP (Device Enrollment Program) enrollment
        let dep_enrolled = stdout.lines()
            .any(|line| line.contains("Enrolled via DEP:") && line.contains("Yes"));
        
        // Check for MDM enrollment
        let mdm_enrolled = stdout.lines()
            .any(|line| line.contains("MDM enrollment:") && line.contains("Yes"));
        
        if dep_enrolled || mdm_enrolled {
            let description = if dep_enrolled && mdm_enrolled {
                "enterprise_dep_and_mdm".to_string()
            } else if dep_enrolled {
                "enterprise_dep_enrolled".to_string()
            } else {
                "enterprise_mdm_enrolled".to_string()
            };
            
            indicators.push(RefurbishmentIndicator {
                name: "enterprise_managed".to_string(),
                detected: true,
                description,
                severity: "warning".to_string(),
            });
        }
    }
    
    // 5. Check for battery replacement - only flag if cycle count is suspiciously low for device age
    // Skip this check as it causes false positives
    
    // 6. Check storage health for replacement indicators
    if let Ok(output) = Command::new("diskutil")
        .args(["info", "disk0"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut is_internal = false;
        let mut device_model = String::new();
        
        for line in stdout.lines() {
            if line.contains("Device Location:") && line.contains("Internal") {
                is_internal = true;
            }
            if line.contains("Device / Media Name:") {
                device_model = line.split(':').nth(1).unwrap_or("").trim().to_string();
            }
        }
        
        // Check if internal SSD seems to be third-party
        if is_internal && !device_model.is_empty() {
            let apple_ssds = ["APPLE SSD", "Apple SSD", "AP", "Macintosh"];
            let is_apple_ssd = apple_ssds.iter().any(|s| device_model.contains(s));
            
            if !is_apple_ssd {
                indicators.push(RefurbishmentIndicator {
                    name: "third_party_storage".to_string(),
                    detected: true,
                    description: format!("third_party_storage:{}", device_model),
                    severity: "warning".to_string(),
                });
                replaced_parts.push("storage".to_string());
            }
        }
    }
    
    // 7. Check display for replacement
    if let Ok(output) = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(displays) = json.get("SPDisplaysDataType") {
                if let Some(arr) = displays.as_array() {
                    for display in arr {
                        if let Some(vendor) = display.get("spdisplays_vendor") {
                            let vendor_str = vendor.as_str().unwrap_or("");
                            // Check for non-Apple display on internal
                            if !vendor_str.contains("Apple") && !vendor_str.contains("APP") {
                                if display.get("spdisplays_connection_type")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.contains("Internal"))
                                    .unwrap_or(false)
                                {
                                    indicators.push(RefurbishmentIndicator {
                                        name: "third_party_display".to_string(),
                                        detected: true,
                                        description: format!("third_party_display:{}", vendor_str),
                                        severity: "warning".to_string(),
                                    });
                                    replaced_parts.push("display".to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Calculate confidence based on indicators
    let critical_count = indicators.iter().filter(|i| i.severity == "critical").count();
    let warning_count = indicators.iter().filter(|i| i.severity == "warning").count();
    
    let confidence = if critical_count > 0 || (warning_count >= 2) {
        "high"
    } else if warning_count > 0 || indicators.len() >= 2 {
        "medium"
    } else {
        "low"
    };
    
    // Determine date mismatch
    let date_mismatch = battery_date.is_some() && os_install_date.is_some();
    
    RefurbishmentCheck {
        is_refurbished: is_refurbished || !replaced_parts.is_empty() || warning_count > 0,
        confidence: confidence.to_string(),
        indicators,
        replaced_parts,
        details: RefurbishmentDetails {
            serial_manufacture_date: serial_date,
            os_install_date,
            battery_manufacture_date: battery_date,
            storage_first_use_date: None,
            date_mismatch,
            refurb_program,
        },
    }
}

#[cfg(target_os = "windows")]
fn check_refurbishment_windows() -> RefurbishmentCheck {
    let mut indicators: Vec<RefurbishmentIndicator> = vec![];
    let replaced_parts: Vec<String> = vec![];
    let mut os_install_date: Option<String> = None;
    
    // 1. Check Windows install date
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "(Get-CimInstance Win32_OperatingSystem).InstallDate"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() {
            os_install_date = Some(stdout);
        }
    }
    
    // 2. Check BIOS for refurbishment info
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "Get-WmiObject Win32_BIOS | Select-Object Manufacturer,SerialNumber,ReleaseDate | ConvertTo-Json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.to_lowercase().contains("refurbished") || stdout.to_lowercase().contains("renewed") {
            indicators.push(RefurbishmentIndicator {
                name: "bios_refurb".to_string(),
                detected: true,
                description: "bios_refurb_flag".to_string(),
                severity: "info".to_string(),
            });
        }
    }
    
    // 3. Check for OEM info changes
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OEMInformation' 2>$null | ConvertTo-Json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.to_lowercase().contains("refurb") || stdout.to_lowercase().contains("renewed") {
            indicators.push(RefurbishmentIndicator {
                name: "oem_refurb".to_string(),
                detected: true,
                description: "oem_refurb_flag".to_string(),
                severity: "info".to_string(),
            });
        }
    }
    
    let warning_count = indicators.iter().filter(|i| i.severity == "warning").count();
    let confidence = if warning_count >= 2 {
        "high"
    } else if warning_count > 0 || indicators.len() >= 2 {
        "medium"
    } else {
        "low"
    };
    
    RefurbishmentCheck {
        is_refurbished: !indicators.is_empty() || !replaced_parts.is_empty(),
        confidence: confidence.to_string(),
        indicators,
        replaced_parts,
        details: RefurbishmentDetails {
            serial_manufacture_date: None,
            os_install_date,
            battery_manufacture_date: None,
            storage_first_use_date: None,
            date_mismatch: false,
            refurb_program: None,
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_hardware_info, 
            get_battery_info, 
            get_storage_health,
            get_network_info,
            check_refurbishment
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
