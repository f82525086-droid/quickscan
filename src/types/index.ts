export type DetectionStatus = 'pending' | 'testing' | 'passed' | 'warning' | 'failed';

export interface DetectionItem {
  id: string;
  category: string;
  name: string;
  status: DetectionStatus;
  value?: string | number;
  details?: string;
  rawData?: Record<string, unknown>;
  screenshot?: string;
}

export interface HardwareInfo {
  cpu: {
    model: string;
    cores: number;
    verified: boolean;
  };
  memory: {
    total: number;
    verified: boolean;
  };
  storage: {
    model: string;
    capacity: number;
    verified: boolean;
  };
  serialNumber: {
    value: string;
    verified: boolean;
  };
}

export interface BatteryInfo {
  health: number;
  cycleCount: number;
  designCapacity: number;
  currentCapacity: number;
  isCharging: boolean;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface StorageInfo {
  model: string;
  capacity: number;
  used: number;
  smartStatus: 'healthy' | 'warning' | 'failing';
  powerOnHours: number;
  temperature?: number;
}

export interface SystemInfo {
  os: string;
  osVersion: string;
  hostname: string;
  isActivated: boolean;
  activationLock?: boolean;
  isRefurbished?: boolean;
  replacedParts?: string[];
}

export interface RefurbishmentInfo {
  isRefurbished: boolean;
  confidence: 'high' | 'medium' | 'low';
  indicators: RefurbishmentIndicator[];
  replacedParts: string[];
  details: {
    serialManufactureDate?: string;
    osInstallDate?: string;
    batteryManufactureDate?: string;
    storageFirstUseDate?: string;
    dateMismatch: boolean;
    refurbProgram?: string;
  };
}

export interface RefurbishmentIndicator {
  name: string;
  detected: boolean;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface NetworkInfo {
  wifi: {
    available: boolean;
    connected: boolean;
  };
  bluetooth: {
    available: boolean;
    enabled: boolean;
  };
}

export interface SensorInfo {
  ambientLight?: boolean;
  accelerometer?: boolean;
  gyroscope?: boolean;
}

export interface InteractiveTestResult {
  screen: {
    tested: boolean;
    hasDeadPixel: boolean;
    screenshot?: string;
  };
  keyboard: {
    tested: boolean;
    testedKeys: string[];
    totalKeys: number;
    failedKeys: string[];
    screenshot?: string;
  };
  trackpad: {
    tested: boolean;
    clickWorking: boolean;
    dragWorking: boolean;
    gestureWorking: boolean;
  };
  camera: {
    tested: boolean;
    working: boolean;
    screenshot?: string;
  };
  microphone: {
    tested: boolean;
    working: boolean;
  };
  speaker: {
    tested: boolean;
    leftChannel: boolean;
    rightChannel: boolean;
  };
}

export interface DetectionReport {
  id: string;
  generatedAt: string;
  deviceOverview: {
    model: string;
    os: string;
    serialNumber: string;
  };
  overallScore: number;
  summary: {
    passed: number;
    warning: number;
    failed: number;
  };
  hardware: HardwareInfo;
  battery: BatteryInfo;
  storage: StorageInfo;
  system: SystemInfo;
  network: NetworkInfo;
  sensors: SensorInfo;
  interactive: InteractiveTestResult;
  refurbishment?: RefurbishmentInfo;
  rawData: Record<string, unknown>;
}
