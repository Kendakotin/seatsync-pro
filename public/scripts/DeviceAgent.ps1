# ============================================================
# Device Inventory Agent for Lovable Cloud
# Collects full hardware/software inventory and syncs to cloud
# ============================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiEndpoint = "https://jqvqyabkswlufahmloqh.supabase.co/functions/v1/device-agent",
    
    [Parameter(Mandatory=$false)]
    [switch]$Register,
    
    [Parameter(Mandatory=$false)]
    [switch]$Sync,
    
    [Parameter(Mandatory=$false)]
    [switch]$Status,
    
    [Parameter(Mandatory=$false)]
    [switch]$Install
)

$ConfigPath = "$env:ProgramData\DeviceAgent"
$KeyFile = "$ConfigPath\device.key"
$LogFile = "$ConfigPath\agent.log"

# Ensure config directory exists
if (-not (Test-Path $ConfigPath)) {
    New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host $Message
}

function Get-DeviceId {
    # Generate unique device ID from hardware
    $bios = Get-WmiObject Win32_BIOS
    $cs = Get-WmiObject Win32_ComputerSystem
    $raw = "$($bios.SerialNumber)-$($cs.Manufacturer)-$($cs.Model)"
    $hash = [System.BitConverter]::ToString(
        [System.Security.Cryptography.SHA256]::Create().ComputeHash(
            [System.Text.Encoding]::UTF8.GetBytes($raw)
        )
    ).Replace("-", "").Substring(0, 16)
    return "DEV-$hash"
}

function Get-FullInventory {
    Write-Log "Collecting device inventory..."
    
    # Computer System
    $cs = Get-WmiObject Win32_ComputerSystem
    $bios = Get-WmiObject Win32_BIOS
    $os = Get-WmiObject Win32_OperatingSystem
    
    # CPU
    $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
    
    # Memory
    $ramBytes = (Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum
    $ramGb = [math]::Round($ramBytes / 1GB, 2)
    
    # Disk
    $disk = Get-WmiObject Win32_DiskDrive | Select-Object -First 1
    $diskSizeGb = [math]::Round($disk.Size / 1GB, 2)
    $diskType = if ($disk.MediaType -match "SSD" -or $disk.Model -match "SSD|NVMe") { "SSD" } else { "HDD" }
    
    # Network
    $network = Get-WmiObject Win32_NetworkAdapterConfiguration | 
        Where-Object { $_.IPEnabled -eq $true } | 
        Select-Object -First 1
    
    # Logged in user
    $loggedInUser = (Get-WmiObject Win32_ComputerSystem).UserName
    
    # BitLocker status
    $bitlocker = $false
    try {
        $blStatus = Get-BitLockerVolume -MountPoint "C:" -ErrorAction SilentlyContinue
        $bitlocker = $blStatus.ProtectionStatus -eq "On"
    } catch { }
    
    # Antivirus
    $avStatus = "Unknown"
    try {
        $av = Get-WmiObject -Namespace "root\SecurityCenter2" -Class AntiVirusProduct -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($av) {
            $avStatus = $av.displayName
        }
    } catch { }
    
    # Installed Software (limit to 500)
    Write-Log "Collecting installed software..."
    $software = @()
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    foreach ($path in $regPaths) {
        Get-ItemProperty $path -ErrorAction SilentlyContinue | 
            Where-Object { $_.DisplayName } | 
            ForEach-Object { $software += $_.DisplayName }
    }
    $software = $software | Sort-Object -Unique | Select-Object -First 500
    
    # Last boot time
    $lastBoot = $os.ConvertToDateTime($os.LastBootUpTime).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    return @{
        device_id = Get-DeviceId
        hostname = $env:COMPUTERNAME
        serial_number = $bios.SerialNumber
        brand = $cs.Manufacturer
        model = $cs.Model
        cpu = $cpu.Name
        ram_gb = $ramGb
        disk_space_gb = $diskSizeGb
        disk_type = $diskType
        os_name = $os.Caption
        os_version = $os.Version
        os_build = $os.BuildNumber
        logged_in_user = $loggedInUser
        ip_address = $network.IPAddress[0]
        mac_address = $network.MACAddress
        domain = $cs.Domain
        installed_software = $software
        last_boot_time = $lastBoot
        encryption_status = $bitlocker
        antivirus_status = $avStatus
    }
}

function Invoke-Register {
    Write-Log "Registering device..."
    
    $deviceId = Get-DeviceId
    $body = @{
        device_id = $deviceId
        hostname = $env:COMPUTERNAME
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$ApiEndpoint`?action=register" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body
        
        if ($response.registration_key) {
            $response.registration_key | Out-File -FilePath $KeyFile -Force
            Write-Log "Registration successful!"
            Write-Log "Registration Key: $($response.registration_key)"
            Write-Log "Status: $($response.status)"
            Write-Log ""
            Write-Log "Key saved to: $KeyFile"
            Write-Log "Please contact your administrator to approve this device."
        }
    } catch {
        Write-Log "Registration failed: $($_.Exception.Message)"
    }
}

function Invoke-Sync {
    if (-not (Test-Path $KeyFile)) {
        Write-Log "Device not registered. Run with -Register first."
        return
    }
    
    $deviceKey = Get-Content $KeyFile -Raw
    $deviceKey = $deviceKey.Trim()
    
    # Check status first
    try {
        $status = Invoke-RestMethod -Uri "$ApiEndpoint`?action=status&key=$deviceKey" -Method GET
        if ($status.status -ne "approved") {
            Write-Log "Device not approved yet. Current status: $($status.status)"
            return
        }
    } catch {
        Write-Log "Failed to check status: $($_.Exception.Message)"
        return
    }
    
    Write-Log "Syncing device inventory..."
    $inventory = Get-FullInventory
    $body = $inventory | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$ApiEndpoint`?action=sync" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ "x-device-key" = $deviceKey } `
            -Body $body
        
        Write-Log "Sync successful at $($response.synced_at)"
    } catch {
        Write-Log "Sync failed: $($_.Exception.Message)"
    }
}

function Get-Status {
    if (-not (Test-Path $KeyFile)) {
        Write-Log "Device not registered. Run with -Register first."
        return
    }
    
    $deviceKey = Get-Content $KeyFile -Raw
    $deviceKey = $deviceKey.Trim()
    
    try {
        $response = Invoke-RestMethod -Uri "$ApiEndpoint`?action=status&key=$deviceKey" -Method GET
        Write-Log "Device Status: $($response.status)"
        Write-Log "Last Sync: $($response.last_sync_at)"
        Write-Log "Sync Count: $($response.sync_count)"
    } catch {
        Write-Log "Status check failed: $($_.Exception.Message)"
    }
}

function Install-ScheduledTask {
    Write-Log "Installing scheduled task for automatic sync..."
    
    $taskName = "DeviceInventorySync"
    $scriptPath = "$ConfigPath\DeviceAgent.ps1"
    
    # Copy script to config path
    Copy-Item -Path $PSCommandPath -Destination $scriptPath -Force
    
    # Create scheduled task (runs every 6 hours)
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -Sync"
    
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Hours 6) `
        -RepetitionDuration ([TimeSpan]::MaxValue)
    
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
    
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force
    
    Write-Log "Scheduled task installed: $taskName"
    Write-Log "Device inventory will sync every 6 hours."
}

# Main execution
if ($Register) {
    Invoke-Register
} elseif ($Sync) {
    Invoke-Sync
} elseif ($Status) {
    Get-Status
} elseif ($Install) {
    Invoke-Register
    Install-ScheduledTask
    Write-Log ""
    Write-Log "Installation complete!"
    Write-Log "1. Ask admin to approve this device in the management portal"
    Write-Log "2. Once approved, inventory will sync automatically every 6 hours"
} else {
    Write-Host @"
Device Inventory Agent

Usage:
  .\DeviceAgent.ps1 -Register    Register this device (first time setup)
  .\DeviceAgent.ps1 -Sync        Manually sync inventory to cloud
  .\DeviceAgent.ps1 -Status      Check registration status
  .\DeviceAgent.ps1 -Install     Register + install scheduled task

Config Location: $ConfigPath
"@
}
