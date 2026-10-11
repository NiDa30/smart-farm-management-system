export type FarmStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type AreaType = 'FARM' | 'ZONE' | 'GARDEN' | 'ROW' | 'PLANT';
export type PlantHealth = 'NORMAL' | 'WATCH' | 'SICK' | 'CRITICAL' | 'DEAD' | 'GOOD' | 'WARNING';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
export type RoleType = 'SYSTEM' | 'CUSTOM';
export type ScopeType = 'SYSTEM' | 'FARM' | 'CUSTOM_AREAS';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type TaskType =
  | 'WATERING'
  | 'FERTILIZING'
  | 'PRUNING'
  | 'WEEDING'
  | 'CLEANING'
  | 'INSPECTION'
  | 'PEST_CHECK'
  | 'TREATMENT'
  | 'HARVEST';

export type DiseaseCaseStatus =
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'TREATING'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export type ModuleKey =
  | 'PLANTS'
  | 'TASKS'
  | 'PESTS'
  | 'INVENTORY'
  | 'IOT'
  | 'COMMERCE'
  | 'REPORTS'
  | 'SYSTEM';

export interface PermissionActions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  type: RoleType;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: Record<ModuleKey, PermissionActions>;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  roleId: string;
  roleName: string;
  status: UserStatus;
  avatar?: string;
  lastLogin: string;
  scopeType: ScopeType;
  allowedAreaIds: string[];
  mustChangePassword?: boolean;
}

export interface FarmStats {
  zonesCount: number;
  gardensCount: number;
  rowsCount: number;
  plantsCount: number;
  devicesCount: number;
  usersCount: number;
}

export interface Farm {
  id: string;
  code: string;
  name: string;
  type: string;
  areaHa: number;
  mainCrop: string;
  description: string;
  status: FarmStatus;
  province: string;
  district: string;
  ward: string;
  address: string;
  latitude: number;
  longitude: number;
  areaUnit: string;
  weightUnit: string;
  volumeUnit: string;
  currency: string;
  timezone: string;
  language: string;
  stats: FarmStats;
}

export interface AreaNode {
  id: string;
  code: string;
  name: string;
  type: AreaType;
  parentId?: string;
  areaHa?: number;
  plantsCount?: number;
  devicesCount?: number;
  healthScore?: number;
  flaggedPlantsCount?: number;
  offlineDevicesCount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  soilPh?: number;
  soilMoisture?: number;
  notes?: string;
  children?: AreaNode[];
}

export interface Plant {
  id: string;
  code: string; // e.g. A001, A023
  name: string;
  rowId: string;
  rowName?: string;
  gardenId: string;
  gardenName?: string;
  zoneId: string;
  zoneName?: string;
  farmId: string;
  variety: string;
  plantedDate: string;
  ageMonths: number;
  ageYearsText?: string;
  stage: string;
  heightMeters: number;
  trunkDiameterCm: number;
  leavesCount: number;
  flowersCount?: number;
  bunchCount?: number; // số buồng
  fruitsCount: number; // số trái
  latestYieldKg?: number;
  health: PlantHealth;
  lat: number;
  lng: number;
  qrCode: string;
  lastWatered: string;
  lastFertilized: string;
  activeIssue?: string;
  imageUrl?: string;
  soilMoisture?: number;
  soilPh?: number;
}

export interface GrowthMeasurement {
  id: string;
  plantId: string;
  plantCode: string;
  date: string;
  heightMeters: number;
  trunkDiameterCm: number;
  leavesCount: number;
  flowersCount: number;
  bunchCount: number;
  fruitsCount: number;
  notes?: string;
  recordedBy: string;
  trendPercentage?: number;
}

export interface FarmTask {
  id: string;
  code: string;
  title: string;
  type: TaskType;
  typeLabel: string;
  plantId?: string;
  plantCode?: string;
  zoneId: string;
  zoneName: string;
  gardenId?: string;
  gardenName?: string;
  rowId?: string;
  rowName?: string;
  dueDate: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId: string;
  assigneeName: string;
  description: string;
  plannedSupply?: {
    supplyId: string;
    supplyName: string;
    plannedQty: number;
    unit: string;
  };
  actualSupplyUsed?: {
    supplyId: string;
    supplyName: string;
    actualQty: number;
    unit: string;
  };
  completedAt?: string;
  completedNotes?: string;
  costVnd?: number;
}

export interface NutritionPlan {
  id: string;
  treeType: string;
  variety: string;
  ageRange: string;
  stage: string;
  fertilizerName: string;
  dosagePerTree: number;
  unit: string;
  cycleDays: number;
  applicationMethod: string;
  conditions: string;
  technicalNotes: string;
}

export interface FertilizationLog {
  id: string;
  date: string;
  plantCode: string;
  zoneName: string;
  fertilizerName: string;
  dosage: number;
  unit: string;
  applicatorName: string;
  costVnd: number;
  resultNotes: string;
}

export interface IrrigationZone {
  id: string;
  name: string;
  plantCodeRange: string;
  currentSoilMoisture: number;
  targetMoisture: number;
  lastWatered: string;
  lastWaterVolumeLiters: number;
  status: 'IDLE' | 'IRRIGATING' | 'ALERT';
  mode: 'AUTO' | 'MANUAL';
  iotRuleId?: string;
}

export interface EnvironmentMetric {
  zoneId: string;
  zoneName: string;
  ph: number;
  ec: number;
  soilMoisture: number;
  airTemp: number;
  humidity: number;
  rainMm: number;
  source: 'IOT' | 'MANUAL' | 'LAB_TEST';
  timestamp: string;
}

export interface PestDisease {
  id: string;
  code: string;
  name: string;
  scientificName: string;
  affectedPlant: string;
  affectedParts: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  symptoms: string;
  causes: string;
  prevention: string;
  treatment: string;
  imageUrl?: string;
  suitablePesticideIds: string[];
}

export interface Pesticide {
  id: string;
  code: string;
  tradeName: string;
  activeIngredient: string;
  category: 'BIOLOGICAL' | 'CHEMICAL' | 'PHEROMONE' | 'ORGANIC';
  uses: string;
  targetPests: string[];
  dosage: string;
  safetyIntervalDays: number;
  priceVnd: number;
  stockQty: number;
  stockUnit: string;
  supplier: string;
  precautions: string;
}

export interface DiseaseCase {
  id: string;
  code: string; // e.g. CASE-2026-0127
  plantId: string;
  plantCode: string;
  plantVariety: string;
  zoneName: string;
  gardenName: string;
  rowName: string;
  diseaseId: string;
  diseaseName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedDate: string;
  status: DiseaseCaseStatus;
  diagnosisNotes: string;
  proposedTreatments: {
    id: string;
    title: string;
    pesticideId?: string;
    pesticideName?: string;
    dosage?: string;
    costVnd?: number;
    effectiveness: string;
  }[];
  selectedTreatment?: {
    treatmentId: string;
    pesticideName: string;
    dosage: string;
    appliedDate: string;
    appliedBy: string;
    resultNotes?: string;
  };
  timeline: {
    date: string;
    stage: string;
    note: string;
    actor: string;
  }[];
}

export interface HarvestBatch {
  id: string;
  code: string; // e.g. HARV-2026-1005
  date: string;
  zoneName: string;
  gardenName: string;
  selectedPlants: string[];
  totalFruitsCount: number;
  totalWeightKg: number;
  gradeA_Kg: number;
  gradeB_Kg: number;
  reject_Kg: number;
  notes?: string;
  generatedLotCode: string;
  harvestedBy?: string;
  status?: 'PENDING_STORAGE' | 'STORED' | 'PROCESSED';
}

export interface PlantLifecycleEvent {
  id: string;
  plantId: string;
  date: string;
  type:
    | 'PLANTED'
    | 'GROWTH_CHECK'
    | 'FERTILIZED'
    | 'WATERED'
    | 'PEST_DETECTED'
    | 'TREATED'
    | 'HARVESTED'
    | 'PRUNED';
  typeLabel: string;
  title: string;
  description: string;
  actor: string;
}

export interface LegacyIoTDevice {
  id: string;
  code: string;
  name: string;
  type: 'ESP32' | 'GATEWAY' | 'SOIL_SENSOR' | 'VALVE' | 'PUMP' | 'WEATHER_STATION';
  zoneId: string;
  gardenId?: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  lastPing: string;
  batteryPercent: number;
  signalDbm: number;
  telemetry: {
    temp?: number;
    humidity?: number;
    soilMoisture?: number;
    soilPh?: number;
    soilEc?: number;
    flowRateLiters?: number;
    state?: 'OPEN' | 'CLOSED' | 'RUNNING' | 'STOPPED';
  };
}

export interface AuditDiff {
  field: string;
  fieldLabel: string;
  before: string;
  after: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK' | 'ASSIGN_ROLE' | 'CONFIG' | 'AUTH';
  actionLabel: string;
  module: ModuleKey;
  moduleLabel: string;
  target: string;
  ip: string;
  diff?: AuditDiff[];
  details?: string;
}

export interface SystemSettingsState {
  general: {
    systemName: string;
    logoUrl: string;
    primaryColor: string;
    language: string;
    timezone: string;
  };
  format: {
    dateFormat: string;
    timeFormat: string;
    currency: string;
    weightUnit: string;
    areaUnit: string;
    volumeUnit: string;
    decimalPlaces: number;
  };
  notifications: {
    iotCritical: { inApp: boolean; email: boolean; sms: boolean };
    taskOverdue: { inApp: boolean; email: boolean; sms: boolean };
    lowInventory: { inApp: boolean; email: boolean; sms: boolean };
    pestsAlert: { inApp: boolean; email: boolean; sms: boolean };
    weatherWarning: { inApp: boolean; email: boolean; sms: boolean };
  };
  security: {
    minPasswordLength: number;
    sessionTimeoutMins: number;
    failedLoginLimit: number;
    requireStrongPassword: boolean;
    autoLockInactive: boolean;
    enforce2FA: boolean;
  };
  integrations: {
    mqttBrokerUrl: string;
    mqttPort: number;
    weatherApiKey: string;
    qrDomain: string;
    smsGatewayEnabled: boolean;
  };
  backup: {
    lastBackup: string;
    backupStatus: 'SUCCESS' | 'RUNNING' | 'FAILED';
    autoBackupDaily: boolean;
    retentionDays: number;
  };
}

// ==========================================
// PHÂN HỆ 3 — VẬT TƯ NÔNG NGHIỆP TYPES
// ==========================================

export type MaterialCategory =
  | 'FERTILIZER'
  | 'PESTICIDE'
  | 'SEEDLING'
  | 'TOOL'
  | 'PACKAGING'
  | 'IRRIGATION_PART'
  | 'FUEL'
  | 'OTHER';

export type MaterialStatus =
  | 'NORMAL'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'EXPIRING'
  | 'EXPIRED';

export interface Material {
  id: string;
  code: string; // e.g. FERT-001
  name: string; // NPK 16-16-8
  category: MaterialCategory;
  categoryLabel: string;
  unit: string; // kg, lít, bao...
  spec: string; // Bao 25kg, Can 5L...
  manufacturer: string;
  currentStock: number;
  minStock: number;
  latestPrice: number;
  latestExpiry: string;
  status: MaterialStatus;
  warehouseId: string;
  warehouseName: string;
  description?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  manager: string;
  totalItems: number;
  totalValue: number;
}

export interface MaterialBatchTransaction {
  date: string;
  type: 'IMPORT' | 'EXPORT' | 'TRANSFER' | 'ADJUST';
  qtyChange: number;
  remainingQty: number;
  refType: string;
  refCode: string;
  actor: string;
}

export interface MaterialBatch {
  id: string;
  batchNumber: string; // LOT-NPK-251005
  materialId: string;
  materialName: string;
  materialCode: string;
  supplierId: string;
  supplierName: string;
  initialQty: number;
  currentQty: number;
  reservedQty: number;
  unit: string;
  importDate: string;
  expiryDate: string;
  unitPrice: number;
  warehouseId: string;
  warehouseName: string;
  locationRack: string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRING' | 'EXPIRED';
  transactions: MaterialBatchTransaction[];
}

export interface SupplierProduct {
  materialId: string;
  materialName: string;
  price: number;
  unit: string;
  moq: number; // Minimum Order Qty
  leadTimeDays: number;
  updatedDate: string;
}

export interface Supplier {
  id: string;
  code: string; // SUP-001
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  supplyCategory: string;
  rating: number; // 1 to 5
  status: 'ACTIVE' | 'INACTIVE';
  totalOrders: number;
  totalSpend: number;
  currentDebt: number;
  paymentTerms: string;
  products: SupplierProduct[];
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'SHIPPING'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface PurchaseReceiptItem {
  materialId: string;
  materialName?: string;
  qty: number;
  lotNumber: string;
  expiryDate: string;
}

export interface PurchaseReceipt {
  receiptId: string;
  receivedDate: string;
  receivedBy: string;
  warehouseName: string;
  items: PurchaseReceiptItem[];
  invoiceNumber?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  code: string; // PO-2026-00125
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  deliveryDate?: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
  receipts: PurchaseReceipt[];
}

export interface StockIssueItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  batchId: string;
  batchNumber: string;
  qty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface StockIssue {
  id: string;
  code: string; // ISSUE-2026-0042
  date: string;
  warehouseId: string;
  warehouseName: string;
  issueType: 'TASK' | 'PLANT' | 'ZONE' | 'EQUIPMENT' | 'DISPOSAL' | 'OTHER';
  issueTypeLabel: string;
  targetId?: string;
  targetName: string; // e.g. "Bón phân A001-A020" / "Cây #A023"
  items: StockIssueItem[];
  totalCost: number;
  issuedBy: string;
  receiver: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  code: string;
  date: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  items: {
    materialId: string;
    materialName: string;
    batchNumber: string;
    qty: number;
    unit: string;
  }[];
  transferredBy: string;
  notes?: string;
}

export interface InventoryCountItem {
  materialId: string;
  materialName: string;
  batchNumber: string;
  unit: string;
  systemQty: number;
  actualQty: number;
  diffQty: number;
  reason: string;
}

export interface InventoryCount {
  id: string;
  code: string;
  date: string;
  warehouseName: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  items: InventoryCountItem[];
  conductedBy: string;
  approvedBy?: string;
}

export type AssetStatus =
  | 'IN_STOCK'
  | 'INSTALLING'
  | 'ACTIVE'
  | 'MAINTENANCE'
  | 'BROKEN'
  | 'RETIRED';

export interface FarmAsset {
  id: string;
  code: string; // PUMP-P01
  name: string;
  type:
    | 'PUMP'
    | 'TRACTOR'
    | 'CUTTER'
    | 'FILTER'
    | 'DRYING'
    | 'GENERATOR'
    | 'VEHICLE'
    | 'TOOL';
  typeLabel: string;
  model: string;
  serialNumber: string;
  location: string;
  zoneName: string;
  purchaseDate: string;
  purchasePrice: number;
  supplierName: string;
  status: AssetStatus;
  nextMaintenanceDate: string;
  lastMaintenanceDate: string;
  totalMaintenanceCost: number;
  logs: {
    date: string;
    type: string;
    description: string;
    cost: number;
    actor: string;
  }[];
}

export interface IoTAssetItem {
  id: string;
  deviceId: string; // SM-03
  name: string; // Soil Moisture 03
  type: 'SOIL_SENSOR' | 'WEATHER_STATION' | 'VALVE' | 'PUMP' | 'GATEWAY' | 'FLOW_METER';
  typeLabel: string;
  model: string;
  serialNumber: string;
  supplierName: string;
  purchaseDate: string;
  purchasePrice: number;
  firmware: string;
  assetStatus: AssetStatus;
  installStatus: 'UNINSTALLED' | 'INSTALLED';
  zoneId?: string;
  zoneName?: string;
  gardenName?: string;
  servedTarget?: string; // A021–A040
  gatewayId?: string;
  gatewayName?: string;
  installDate?: string;
  installedBy?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationIntervalDays?: number;
}

export type MaintenanceType =
  | 'PERIODIC'
  | 'HOUR_BASED'
  | 'REPAIR'
  | 'PART_REPLACEMENT'
  | 'CLEANING'
  | 'INSPECTION';

export type MaintenanceStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE';

export interface MaintenanceRecord {
  id: string;
  code: string; // MAINT-2026-0089
  assetId: string;
  assetCode: string;
  assetName: string;
  isIoT: boolean;
  type: MaintenanceType;
  typeLabel: string;
  scheduledDate: string;
  completedDate?: string;
  status: MaintenanceStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeName: string;
  reason: string;
  tasksDescription: string;
  partsUsed: {
    materialId?: string;
    partName: string;
    qty: number;
    unitCost: number;
    totalCost: number;
  }[];
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
}

export interface CalibrationRecord {
  id: string;
  code: string; // CALIB-2026-0012
  deviceId: string;
  deviceName: string;
  deviceType: string;
  date: string;
  standardValue: string;
  beforeValue: string;
  afterValue: string;
  errorMargin: string;
  resultStatus: 'PASS' | 'ADJUSTED' | 'FAIL';
  performedBy: string;
  nextDueDate: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'MATERIAL'
  | 'MAINTENANCE'
  | 'UTILITY'
  | 'LABOR'
  | 'EQUIPMENT'
  | 'OTHER';

export interface FarmExpense {
  id: string;
  code: string; // EXP-2026-0156
  date: string;
  category: ExpenseCategory;
  categoryLabel: string;
  targetType: 'FARM' | 'ZONE' | 'PLANT' | 'TASK' | 'DEVICE' | 'HARVEST';
  targetId?: string;
  targetName: string; // "Cây #A023", "Khu Bắc", "Máy bơm P01"
  sourceRef: string; // e.g. "Xuất vật tư ISSUE-2026-0042"
  amount: number;
  notes: string;
  recordedBy: string;
}

export type AlertCategory =
  | 'LOW_STOCK'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'MAINTENANCE_DUE'
  | 'CALIBRATION_DUE'
  | 'ASSET_BROKEN'
  | 'PRICE_INCREASE'
  | 'SUPPLIER_DEBT';

export interface ResourceAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: AlertCategory;
  categoryLabel: string;
  targetId: string;
  targetName: string;
  message: string;
  date: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  actionRoute: string;
  actionLabel: string;
}

// ==========================================
// PHÂN HỆ 4 — IoT & TỰ ĐỘNG HÓA TYPES
// ==========================================

export type IoTDeviceType =
  | 'SENSOR'
  | 'ACTUATOR'
  | 'GATEWAY'
  | 'WEATHER_STATION'
  | 'CONTROLLER';

export type IoTSensorType =
  | 'SOIL_MOISTURE'
  | 'SOIL_PH'
  | 'SOIL_EC'
  | 'AIR_TEMP'
  | 'AIR_HUMIDITY'
  | 'SOLAR_RADIATION'
  | 'WATER_FLOW'
  | 'TANK_LEVEL'
  | 'RAIN_GAUGE';

export type IoTActuatorType =
  | 'PUMP'
  | 'VALVE'
  | 'RELAY'
  | 'FAN'
  | 'MIST'
  | 'LIGHT';

export type IoTDeviceStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'DEGRADED'
  | 'WARNING'
  | 'ERROR'
  | 'MAINTENANCE'
  | 'DISABLED';

export interface IoTDeviceActuatorState {
  state: 'ON' | 'OFF' | 'OPEN' | 'CLOSED';
  mode: 'AUTO' | 'MANUAL';
  runtimeTodayMinutes: number;
  currentAmpere: number;
  flowRateLpm: number;
  energyKwh: number;
  manualOverrideUntil?: string | null;
  manualOverrideReason?: string;
}

export interface IoTDevice {
  id: string; // e.g. "SM-03", "PUMP-P01", "VALVE-V01", "GW-ESP32-04"
  code?: string;
  name: string;
  type: IoTDeviceType | 'SOIL_SENSOR' | 'VALVE' | 'PUMP' | 'ESP32';
  sensorType?: IoTSensorType;
  actuatorType?: IoTActuatorType;
  location: string; // "Khu A - Vườn 01"
  zoneId: string; // "zone-north", "zone-south", etc.
  gardenId?: string;
  plantRange?: string; // "A021–A040"
  gatewayId: string; // "ESP32-04"
  status: IoTDeviceStatus;
  lastSeenSeconds: number;
  lastSeenTimestamp: string;
  lastPing?: string;
  signalDbm: number; // e.g. -62
  batteryPercent: number; // e.g. 84
  firmwareVersion: string; // "v1.2.4"
  latestFirmware: string; // "v1.3.0"
  currentValue?: number | string;
  unit?: string;
  normalRange?: { min: number; max: number };
  isStale?: boolean;
  healthScore: number; // 0 - 100
  assetRefId?: string; // Link to Module 3 Farm Asset / IoT Asset
  samplingIntervalSeconds: number;
  uploadIntervalSeconds: number;
  mqttTopic: string;
  actuatorState?: IoTDeviceActuatorState;
  telemetry?: {
    temp?: number;
    humidity?: number;
    soilMoisture?: number;
    soilPh?: number;
    soilEc?: number;
    flowRateLiters?: number;
    state?: 'OPEN' | 'CLOSED' | 'RUNNING' | 'STOPPED';
  };
}

export interface RealtimeMetric {
  id: string;
  deviceId: string;
  name: string;
  metricType: IoTSensorType;
  value: number;
  previousValue: number;
  unit: string;
  normalRange: { min: number; max: number };
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'STALE';
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendDelta: number;
  updatedSecondsAgo: number;
  zone: string;
  relatedRule?: string;
  historyPoints: { time: string; value: number }[];
}

export type AutomationRuleType =
  | 'IRRIGATION'
  | 'NUTRITION'
  | 'MISTING'
  | 'SAFETY'
  | 'VENTILATION';

export type AutomationRuleMode = 'AUTO' | 'SEMI_AUTO' | 'NOTIFY_ONLY';

export interface RuleCondition {
  id: string;
  deviceId: string;
  deviceName: string;
  metric: string;
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  threshold: number | string | boolean;
  unit?: string;
  logicalOp?: 'AND' | 'OR';
}

export interface RuleAction {
  id: string;
  step: number;
  targetDeviceId: string;
  targetDeviceName: string;
  command: 'START' | 'STOP' | 'OPEN' | 'CLOSE' | 'SET_VALUE' | 'WAIT';
  value?: any;
  durationMinutes?: number;
}

export interface IoTAutomationRule {
  id: string;
  code: string; // "RULE-IRR-01"
  name: string;
  description: string;
  zone: string;
  zoneId: string;
  type: AutomationRuleType;
  mode: AutomationRuleMode;
  priority: number; // 1-100 (100 highest / Safety rule)
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'ERROR';
  isEdgeRule: boolean; // Runs on ESP32 gateway locally
  conditions: RuleCondition[];
  actions: RuleAction[];
  safety: {
    maxRuntimeMinutes: number;
    cooldownMinutes: number;
    maxRunsPerDay: number;
  };
  lastRun: string;
  totalRuns: number;
  successRate: number;
  runsToday: number;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  zone: string;
  triggerSummary: string;
  actionSummary: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED_BY_SAFETY' | 'RUNNING';
  durationMinutes: number;
  waterUsedLiters: number;
  energyUsedKwh: number;
  timeline: {
    time: string;
    step: string;
    status: 'SUCCESS' | 'WARN' | 'ERROR' | 'INFO';
    message: string;
  }[];
}

export type IoTAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type IoTAlertType =
  | 'NO_FLOW'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_LOW'
  | 'SENSOR_HIGH'
  | 'SENSOR_ANOMALY'
  | 'TANK_LOW'
  | 'PUMP_OVER_RUNTIME'
  | 'LOW_BATTERY'
  | 'LOW_SIGNAL'
  | 'VALVE_FAILURE'
  | 'GATEWAY_OFFLINE'
  | 'AUTOMATION_FAILURE';

export interface IoTAlert {
  id: string;
  code: string; // "ALERT-2026-0127"
  severity: IoTAlertSeverity;
  type: IoTAlertType;
  title: string;
  message: string;
  deviceId: string;
  deviceName: string;
  location: string;
  startedAt: string;
  duration: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  suggestedActions: string[];
  relatedPumpId?: string;
  relatedValveId?: string;
}

export interface IoTEventLog {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  eventType:
    | 'STATE_CHANGE'
    | 'TELEMETRY'
    | 'COMMAND_SENT'
    | 'COMMAND_ACK'
    | 'COMMAND_TIMEOUT'
    | 'RULE_TRIGGER'
    | 'CONFIG_UPDATE'
    | 'OTA_START'
    | 'OTA_SUCCESS'
    | 'SAFETY_TRIP';
  message: string;
  source: 'AUTOMATION' | 'MANUAL' | 'EDGE_CONTROLLER' | 'SYSTEM';
  severity: 'INFO' | 'WARN' | 'ERROR';
}

export interface FailSafeRule {
  id: string;
  code: string;
  name: string;
  description: string;
  triggerCondition: string;
  actionTaken: string;
  isEdgeEnabled: boolean;
  priority: number;
  status: 'ARMED' | 'TRIGGERED' | 'BYPASS';
  lastTripped?: string;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: 'CLOUD' | 'BROKER' | 'GATEWAY' | 'NODE' | 'SENSOR' | 'ACTUATOR';
  status: 'ONLINE' | 'WARNING' | 'ERROR' | 'OFFLINE';
  ip?: string;
  signal?: string;
  parentId?: string;
  subCount?: number;
}

// ==========================================
// PHÂN HỆ 5 — KINH DOANH & KHÁCH HÀNG TYPES
// ==========================================

export type CustomerType =
  | 'RETAIL'
  | 'WHOLESALE'
  | 'DEALER'
  | 'DISTRIBUTOR'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'SUPERMARKET'
  | 'ENTERPRISE';

export interface Customer {
  id: string;
  code: string; // e.g. KH-0023
  name: string;
  customerType: CustomerType;
  typeLabel: string;
  phone: string;
  email?: string;
  taxCode?: string;
  address: string;
  deliveryAddress: string;
  priceGroupId: string; // "PG-DEALER", "PG-RETAIL", etc.
  priceGroupName: string;
  creditLimitVnd: number;
  paymentTermsDays: number;
  currentDebtVnd: number;
  totalOrdersCount: number;
  totalRevenueVnd: number;
  averageOrderVnd: number;
  lastPurchaseDate: string;
  purchaseFrequencyDays: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  assignedSalesRep: string;
  notes?: string;
}

export type CRMActivityType =
  | 'CALL'
  | 'MEETING'
  | 'MESSAGE'
  | 'EMAIL'
  | 'FOLLOW_UP'
  | 'NOTE';

export interface CRMActivity {
  id: string;
  customerId: string;
  customerName: string;
  type: CRMActivityType;
  date: string;
  title: string;
  notes: string;
  performedBy: string;
  status: 'COMPLETED' | 'SCHEDULED' | 'PENDING';
  scheduledDate?: string;
  outcome?: string;
}

export interface CommercialProduct {
  id: string;
  sku: string; // "SKU-COC-A"
  name: string;
  cropSource: string; // "Dừa xiêm xanh"
  grade: 'A' | 'B' | 'STANDARD' | 'PREMIUM';
  specifications: string;
  salesUnit: string; // "trái", "kg", "buồng"
  standardPriceVnd: number;
  minPriceVnd: number;
  onHand: number;
  reserved: number;
  available: number; // On Hand - Reserved
  minThreshold: number;
  category: string;
  status: 'ACTIVE' | 'DISCONTINUED';
  imageUrl?: string;
}

export interface ClassificationResultItem {
  grade: 'A' | 'B' | 'REJECT';
  qty: number;
  percentage: number;
  targetProductId?: string;
  targetProductName?: string;
  targetLotCode?: string;
  notes: string;
}

export interface PostHarvestClassification {
  id: string;
  code: string; // CLASS-20261005-01
  harvestBatchId: string;
  harvestBatchCode: string;
  harvestDate: string;
  areaName: string;
  plantCodes: string[];
  totalHarvestQty: number;
  unit: string;
  classifiedDate: string;
  inspectorName: string;
  results: ClassificationResultItem[];
  status: 'COMPLETED' | 'DRAFT';
}

export interface FinishedGoodsLot {
  id: string;
  lotCode: string; // LOT-COC-A-20261005
  productId: string;
  productSku: string;
  productName: string;
  harvestBatchId: string;
  harvestBatchCode: string;
  farmArea: string;
  plantCodes: string[];
  initialQty: number;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  unit: string;
  harvestDate: string;
  packagedDate: string;
  expiryDate: string;
  warehouseLocation: string;
  qualityGrade: string;
  qrCode: string;
}

export interface PriceListItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  priceVnd: number;
  minPriceVnd: number;
}

export interface PriceList {
  id: string;
  code: string; // PL-RETAIL, PL-DEALER
  name: string;
  effectiveDate: string;
  expiryDate?: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  items: PriceListItem[];
}

export interface PriceRule {
  id: string;
  productId: string;
  productName: string;
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage?: number;
  unitPriceVnd: number;
  customerSpecificId?: string;
  customerSpecificName?: string;
}

export interface PriceHistoryRecord {
  id: string;
  date: string;
  priceListId: string;
  priceListName: string;
  productId: string;
  productName: string;
  oldPriceVnd: number;
  newPriceVnd: number;
  changedBy: string;
  reason: string;
}

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface QuotationItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceVnd: number;
  discountVnd: number;
  subtotalVnd: number;
  availableQty: number;
}

export interface Quotation {
  id: string;
  code: string; // QT-2026-0052
  customerId: string;
  customerCode: string;
  customerName: string;
  priceListId: string;
  priceListName: string;
  date: string;
  validUntil: string;
  paymentTermsDays: number;
  items: QuotationItem[];
  subtotalVnd: number;
  discountTotalVnd: number;
  taxVnd: number;
  totalAmountVnd: number;
  status: QuotationStatus;
  convertedOrderId?: string;
  createdBy: string;
  notes?: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'ALLOCATED'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface OrderItemAllocatedLot {
  lotId: string;
  lotCode: string;
  qty: number;
}

export interface SalesOrderItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantityOrdered: number;
  quantityAllocated: number;
  quantityDelivered: number;
  unitPriceVnd: number;
  discountVnd: number;
  subtotalVnd: number;
  allocatedLots: OrderItemAllocatedLot[];
}

export interface SalesOrder {
  id: string;
  code: string; // SO-2026-1028
  quotationId?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerType: string;
  customerPhone: string;
  deliveryAddress: string;
  orderDate: string;
  deliveryDate: string;
  items: SalesOrderItem[];
  subtotalVnd: number;
  discountVnd: number;
  taxVnd: number;
  shippingFeeVnd: number;
  totalAmountVnd: number;
  paidAmountVnd: number;
  outstandingAmountVnd: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  creditExceededWarning: boolean;
  notes?: string;
  createdBy: string;
  timeline: {
    timestamp: string;
    stage: string;
    note: string;
    actor: string;
  }[];
}

export type DeliveryStatus =
  | 'PLANNED'
  | 'PICKING'
  | 'READY'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryItem {
  productId: string;
  productName: string;
  unit: string;
  quantityToDeliver: number;
  quantityActualDelivered?: number;
  lots: {
    lotId: string;
    lotCode: string;
    qty: number;
  }[];
}

export interface DeliveryNote {
  id: string;
  code: string; // DEL-2026-0221
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  contactPhone: string;
  plannedDate: string;
  actualDate?: string;
  vehicle: string;
  driverName: string;
  driverPhone: string;
  items: DeliveryItem[];
  status: DeliveryStatus;
  recipientName?: string;
  signatureUrl?: string;
  proofPhotoUrl?: string;
  notes?: string;
  timeline: {
    time: string;
    stage: string;
    note: string;
  }[];
}

export interface SalesPayment {
  id: string;
  code: string; // PAY-2026-0512
  orderId?: string;
  orderCode?: string;
  customerId: string;
  customerName: string;
  amountVnd: number;
  paymentDate: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'E_WALLET' | 'CREDIT_NOTE';
  transactionReference: string;
  bankName?: string;
  recordedBy: string;
  notes?: string;
}

export interface CustomerDebtAging {
  customerId: string;
  customerCode: string;
  customerName: string;
  customerType: string;
  creditLimitVnd: number;
  totalDebtVnd: number;
  currentPeriodVnd: number;
  days1to30Vnd: number;
  days31to60Vnd: number;
  days61to90Vnd: number;
  daysOver90Vnd: number;
  isOverLimit: boolean;
  oldestInvoiceDate: string;
}

export type ReturnReason =
  | 'DAMAGED'
  | 'QUALITY_MISMATCH'
  | 'WRONG_ITEM'
  | 'SUB_STANDARD'
  | 'OTHER';

export type ReturnResolution =
  | 'EXCHANGE'
  | 'REFUND'
  | 'CREDIT_NOTE'
  | 'PRICE_REDUCTION'
  | 'REJECT';

export interface SalesReturnItem {
  productId: string;
  productName: string;
  lotCode: string;
  returnQty: number;
  unit: string;
  reason: ReturnReason;
  resolution: ReturnResolution;
  refundAmountVnd: number;
}

export interface SalesReturn {
  id: string;
  code: string; // RET-2026-0034
  orderId: string;
  orderCode: string;
  deliveryId: string;
  customerId: string;
  customerName: string;
  items: SalesReturnItem[];
  returnDate: string;
  status: 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  notes: string;
}

export interface CustomerClaim {
  id: string;
  code: string; // CLAIM-2026-0021
  customerId: string;
  customerName: string;
  orderId: string;
  orderCode: string;
  deliveryId: string;
  deliveryCode: string;
  productId: string;
  productName: string;
  lotId: string;
  lotCode: string;
  harvestBatchId: string;
  farmArea: string;
  plantCodes: string[];
  quantityDefected: number;
  unit: string;
  issueDescription: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  photos: string[];
  investigationNotes: string;
  rootCause: string;
  correctiveAction: string;
  resolutionOutcome: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpectedHarvestProjection {
  id: string;
  cropName: string;
  areaName: string;
  plantCodes: string[];
  expectedDate: string;
  projectedQty: number;
  unit: string;
  confidenceRate: number;
  notes: string;
}


