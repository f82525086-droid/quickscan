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
    let output = Command::new("ioreg")
        .args(["-r", "-c", "AppleSmartBattery", "-w0"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    let mut cycle_count: u32 = 0;
    let mut design_capacity: u32 = 0;
    let mut max_capacity: u32 = 0;
    let mut raw_max_capacity: u32 = 0;
    let mut current_capacity: u32 = 0;
    let mut is_charging = false;
    let mut temperature: Option<f64> = None;
    
    for line in stdout.lines() {
        let line = line.trim();
        if line.contains("\"CycleCount\"") && !line.contains("CycleCountLastQmax") {
            if let Some(val) = extract_number(line) {
                cycle_count = val as u32;
            }
        } else if line.contains("\"DesignCapacity\"") && !line.contains("DesignCapacityUI") {
            if let Some(val) = extract_number(line) {
                design_capacity = val as u32;
            }
        } else if line.contains("\"AppleRawMaxCapacity\"") {
            // 新版 macOS 使用 AppleRawMaxCapacity 作为真实最大容量
            if let Some(val) = extract_number(line) {
                raw_max_capacity = val as u32;
            }
        } else if line.contains("\"MaxCapacity\"") && !line.contains("MaxCapacityUI") && !line.contains("AppleRawMaxCapacity") {
            if let Some(val) = extract_number(line) {
                max_capacity = val as u32;
            }
        } else if line.contains("\"CurrentCapacity\"") && !line.contains("CurrentCapacityUI") {
            if let Some(val) = extract_number(line) {
                current_capacity = val as u32;
            }
        } else if line.contains("\"IsCharging\"") {
            is_charging = line.contains("Yes");
        } else if line.contains("\"Temperature\"") {
            if let Some(val) = extract_number(line) {
                temperature = Some(val as f64 / 100.0);
            }
        }
    }
    
    // 优先使用 AppleRawMaxCapacity（新版 macOS），否则用 MaxCapacity
    let actual_max_capacity = if raw_max_capacity > 0 {
        raw_max_capacity
    } else if max_capacity > 100 {
        // 旧版 macOS，MaxCapacity 是 mAh 值
        max_capacity
    } else {
        // MaxCapacity 是百分比，无法计算真实健康度
        design_capacity
    };
    
    let health = if design_capacity > 0 && actual_max_capacity > 0 {
        (actual_max_capacity as f64 / design_capacity as f64) * 100.0
    } else {
        100.0
    };
    
    Some(BatteryInfo {
        health,
        cycle_count,
        design_capacity,
        max_capacity: actual_max_capacity,
        current_capacity,
        is_charging,
        temperature,
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

fn extract_number(line: &str) -> Option<i64> {
    line.split('=')
        .nth(1)?
        .trim()
        .parse::<i64>()
        .ok()
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
                description: "序列号以 F 开头，表示 Apple 官方翻新机".to_string(),
                severity: "info".to_string(),
            });
        }
        
        // Extract manufacture date from serial (for older serials)
        // Characters 4-5 often encode year/week
        serial_date = Some(format!("序列号: {}", &serial[..4]));
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
                description: "系统固件中发现翻新标记".to_string(),
                severity: "info".to_string(),
            });
        }
        
        // Check battery manufacture date
        for line in stdout.lines() {
            if line.contains("BatteryManufactureDate") || line.contains("ManufactureDate") {
                if let Some(date_part) = line.split('=').nth(1) {
                    battery_date = Some(date_part.trim().to_string());
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
    
    // 4. Check system profiler for hardware changes
    if let Ok(output) = Command::new("system_profiler")
        .args(["SPHardwareDataType", "-json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(hw_data) = json.get("SPHardwareDataType") {
                if let Some(arr) = hw_data.as_array() {
                    if let Some(first) = arr.first() {
                        // Check provisioning UDID for enterprise management
                        if first.get("provisioning_UDID").is_some() {
                            indicators.push(RefurbishmentIndicator {
                                name: "enterprise_managed".to_string(),
                                detected: true,
                                description: "设备曾被企业管理，可能是退役设备".to_string(),
                                severity: "warning".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    // 5. Check for battery replacement
    if let Ok(output) = Command::new("ioreg")
        .args(["-r", "-c", "AppleSmartBattery", "-w0"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Very low cycle count with old serial might indicate battery replacement
        let mut cycle_count: u32 = 0;
        for line in stdout.lines() {
            if line.contains("\"CycleCount\"") && !line.contains("CycleCountLastQmax") {
                if let Some(val) = extract_number(line.trim()) {
                    cycle_count = val as u32;
                }
            }
        }
        
        // If cycle count is very low but device appears old, might be replaced battery
        if cycle_count < 50 {
            indicators.push(RefurbishmentIndicator {
                name: "low_battery_cycles".to_string(),
                detected: true,
                description: format!("电池循环次数极低 ({} 次)，可能是新更换的电池", cycle_count),
                severity: "info".to_string(),
            });
        }
    }
    
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
            let apple_ssds = ["APPLE SSD", "Apple SSD", "AP"];
            let is_apple_ssd = apple_ssds.iter().any(|s| device_model.contains(s));
            
            if !is_apple_ssd && !device_model.contains("Macintosh") {
                indicators.push(RefurbishmentIndicator {
                    name: "third_party_storage".to_string(),
                    detected: true,
                    description: format!("检测到非原装存储设备: {}", device_model),
                    severity: "warning".to_string(),
                });
                replaced_parts.push("存储硬盘 (SSD)".to_string());
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
                                        description: format!("检测到非原装显示屏: {}", vendor_str),
                                        severity: "warning".to_string(),
                                    });
                                    replaced_parts.push("显示屏".to_string());
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
    let mut replaced_parts: Vec<String> = vec![];
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
                description: "BIOS 中发现翻新标记".to_string(),
                severity: "info".to_string(),
            });
        }
    }
    
    // 3. Check battery info
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "Get-WmiObject Win32_Battery | Select-Object DesignCapacity,FullChargeCapacity,EstimatedChargeRemaining | ConvertTo-Json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(design) = json.get("DesignCapacity").and_then(|v| v.as_u64()) {
                if let Some(full) = json.get("FullChargeCapacity").and_then(|v| v.as_u64()) {
                    let health = (full as f64 / design as f64) * 100.0;
                    // Very high health on older device might indicate battery replacement
                    if health > 95.0 {
                        indicators.push(RefurbishmentIndicator {
                            name: "high_battery_health".to_string(),
                            detected: true,
                            description: format!("电池健康度异常高 ({:.1}%)，可能是新更换的电池", health),
                            severity: "info".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 4. Check for OEM info changes
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OEMInformation' 2>$null | ConvertTo-Json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.to_lowercase().contains("refurb") || stdout.to_lowercase().contains("renewed") {
            indicators.push(RefurbishmentIndicator {
                name: "oem_refurb".to_string(),
                detected: true,
                description: "OEM 信息中发现翻新标记".to_string(),
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
