import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  AreaNode,
  AuditLogEntry,
  CalibrationRecord,
  DiseaseCase,
  DiseaseCaseStatus,
  EnvironmentMetric,
  Farm,
  FarmAsset,
  FarmExpense,
  FarmTask,
  FertilizationLog,
  GrowthMeasurement,
  HarvestBatch,
  InventoryCount,
  IoTAssetItem,
  IoTDevice,
  IrrigationZone,
  MaintenanceRecord,
  Material,
  MaterialBatch,
  NutritionPlan,
  PestDisease,
  Pesticide,
  Plant,
  PlantLifecycleEvent,
  PurchaseOrder,
  PurchaseOrderStatus,
  ResourceAlert,
  Role,
  StockIssue,
  StockTransfer,
  Supplier,
  SystemSettingsState,
  User,
  Warehouse,
  RealtimeMetric,
  IoTAutomationRule,
  AutomationExecution,
  IoTAlert,
  IoTEventLog,
  FailSafeRule,
  TopologyNode,
  Customer,
  CRMActivity,
  CommercialProduct,
  PostHarvestClassification,
  FinishedGoodsLot,
  PriceList,
  PriceRule,
  PriceHistoryRecord,
  Quotation,
  QuotationStatus,
  SalesOrder,
  OrderStatus,
  DeliveryNote,
  DeliveryStatus,
  SalesPayment,
  CustomerDebtAging,
  SalesReturn,
  CustomerClaim,
  ExpectedHarvestProjection,
} from '../types';
import {
  INITIAL_AREAS_TREE,
  INITIAL_AUDIT_LOGS,
  INITIAL_FARMS,
  INITIAL_ROLES,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../data/mockData';
import {
  INITIAL_IOT_DEVICES,
  INITIAL_REALTIME_METRICS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_AUTOMATION_EXECUTIONS,
  INITIAL_IOT_ALERTS,
  INITIAL_IOT_EVENT_LOGS,
  INITIAL_FAILSAFE_RULES,
  INITIAL_TOPOLOGY_NODES,
} from '../data/iotMockData';
import {
  INITIAL_DISEASE_CASES,
  INITIAL_ENV_METRICS,
  INITIAL_FARM_TASKS,
  INITIAL_FERTILIZATION_LOGS,
  INITIAL_GROWTH_MEASUREMENTS,
  INITIAL_HARVEST_BATCHES,
  INITIAL_IRRIGATION_ZONES,
  INITIAL_LIFECYCLE_EVENTS,
  INITIAL_NUTRITION_PLANS,
  INITIAL_PEST_DISEASES,
  INITIAL_PESTICIDES,
  INITIAL_PRODUCTION_PLANTS,
} from '../data/productionMockData';
import {
  INITIAL_CALIBRATION_RECORDS,
  INITIAL_FARM_ASSETS,
  INITIAL_FARM_EXPENSES,
  INITIAL_INVENTORY_COUNTS,
  INITIAL_IOT_ASSETS,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_MATERIALS,
  INITIAL_MATERIAL_BATCHES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RESOURCE_ALERTS,
  INITIAL_STOCK_ISSUES,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_SUPPLIERS,
  INITIAL_WAREHOUSES,
} from '../data/resourceMockData';
import {
  INITIAL_CUSTOMERS,
  INITIAL_CRM_ACTIVITIES,
  INITIAL_COMMERCIAL_PRODUCTS,
  INITIAL_CLASSIFICATIONS,
  INITIAL_FINISHED_GOODS_LOTS,
  INITIAL_PRICE_LISTS,
  INITIAL_PRICE_RULES,
  INITIAL_PRICE_HISTORY,
  INITIAL_QUOTATIONS,
  INITIAL_SALES_ORDERS,
  INITIAL_DELIVERIES,
  INITIAL_PAYMENTS,
  INITIAL_DEBT_AGING,
  INITIAL_SALES_RETURNS,
  INITIAL_CUSTOMER_CLAIMS,
  INITIAL_EXPECTED_HARVESTS,
} from '../data/salesMockData';

interface AppContextType {
  activeFarmId: string;
  setActiveFarmId: (id: string) => void;
  farms: Farm[];
  activeFarm: Farm;
  areasTree: AreaNode;
  selectedAreaId: string;
  setSelectedAreaId: (id: string) => void;
  plants: Plant[];
  iotDevices: IoTDevice[];
  users: User[];
  roles: Role[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettingsState;
  currentRoute: string;
  navigate: (route: string) => void;
  selectedPlant: Plant | null;
  setSelectedPlant: (plant: Plant | null) => void;
  selectedDevice: IoTDevice | null;
  setSelectedDevice: (device: IoTDevice | null) => void;
  addFarm: (farm: Farm) => void;
  updateFarm: (id: string, farm: Partial<Farm>) => void;
  archiveFarm: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  toggleLockUser: (id: string) => void;
  bulkLockUsers: (ids: string[]) => void;
  bulkAssignRole: (ids: string[], roleId: string) => void;
  updateRolePermissions: (roleId: string, permissions: Role['permissions']) => void;
  duplicateRole: (roleId: string, newName: string) => void;
  deleteRole: (roleId: string) => { success: boolean; message: string };
  updateSettings: (newSettings: SystemSettingsState) => void;
  runBackupNow: () => void;
  isBackingUp: boolean;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  activeUser: User;
  setActiveUser: (user: User) => void;
  feedbackToast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;

  // Phân hệ 2: Sản xuất & Cây trồng State & Actions
  growthMeasurements: GrowthMeasurement[];
  tasks: FarmTask[];
  nutritionPlans: NutritionPlan[];
  fertilizationLogs: FertilizationLog[];
  irrigationZones: IrrigationZone[];
  envMetrics: EnvironmentMetric[];
  pestDiseases: PestDisease[];
  pesticides: Pesticide[];
  diseaseCases: DiseaseCase[];
  harvestBatches: HarvestBatch[];
  lifecycleEvents: PlantLifecycleEvent[];
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, p: Partial<Plant>) => void;
  addGrowthMeasurement: (record: GrowthMeasurement) => void;
  completeTask: (taskId: string, actualSupplyQty?: number, notes?: string) => void;
  createTask: (task: FarmTask) => void;
  createDiseaseCase: (caseData: DiseaseCase) => void;
  updateDiseaseCaseStatus: (caseId: string, status: DiseaseCaseStatus, note?: string) => void;
  applyTreatmentToCase: (caseId: string, treatmentId: string) => void;
  createHarvestBatch: (batch: HarvestBatch) => void;
  quickSearchPlant: (code: string) => Plant | undefined;

  // Phân hệ 3: Vật tư nông nghiệp State & Actions
  materials: Material[];
  warehouses: Warehouse[];
  materialBatches: MaterialBatch[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  stockIssues: StockIssue[];
  stockTransfers: StockTransfer[];
  inventoryCounts: InventoryCount[];
  farmAssets: FarmAsset[];
  iotAssets: IoTAssetItem[];
  maintenanceRecords: MaintenanceRecord[];
  calibrationRecords: CalibrationRecord[];
  farmExpenses: FarmExpense[];
  resourceAlerts: ResourceAlert[];

  addMaterial: (m: Material) => void;
  updateMaterial: (id: string, m: Partial<Material>) => void;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  receivePurchaseOrder: (
    poId: string,
    receiptItems: { materialId: string; qty: number; lotNumber: string; expiryDate: string }[],
    warehouseName?: string,
    invoiceNumber?: string,
    notes?: string
  ) => void;
  quickDirectPurchase: (
    supplierId: string,
    materialId: string,
    qty: number,
    unitPrice: number,
    lotNumber: string,
    expiryDate: string,
    warehouseName: string,
    notes?: string
  ) => void;
  issueStock: (issue: StockIssue) => void;
  transferStock: (transfer: StockTransfer) => void;
  submitInventoryCount: (count: InventoryCount) => void;
  addFarmAsset: (asset: FarmAsset) => void;
  updateFarmAsset: (id: string, a: Partial<FarmAsset>) => void;
  addIoTAsset: (iot: IoTAssetItem) => void;
  installIoTAsset: (
    deviceId: string,
    zoneId: string,
    zoneName: string,
    gardenName: string,
    servedTarget: string,
    gatewayId: string,
    gatewayName: string
  ) => void;
  createMaintenanceRecord: (record: MaintenanceRecord) => void;
  completeMaintenanceRecord: (
    recordId: string,
    actualCost: number,
    partsUsed?: { partName: string; qty: number; unitCost: number; totalCost: number }[],
    notes?: string
  ) => void;
  createCalibrationRecord: (record: CalibrationRecord) => void;
  dismissAlert: (alertId: string) => void;

  // Phân hệ 4 — IoT & Tự động hóa
  realtimeMetrics: RealtimeMetric[];
  automationRules: IoTAutomationRule[];
  automationExecutions: AutomationExecution[];
  iotAlerts: IoTAlert[];
  iotEventLogs: IoTEventLog[];
  failsafeRules: FailSafeRule[];
  topologyNodes: TopologyNode[];
  controlActuator: (
    deviceId: string,
    command: 'START' | 'STOP' | 'OPEN' | 'CLOSE',
    durationMinutes?: number,
    manualReason?: string
  ) => Promise<boolean>;
  toggleRuleStatus: (ruleId: string) => void;
  createAutomationRule: (rule: IoTAutomationRule) => void;
  updateAutomationRule: (rule: IoTAutomationRule) => void;
  deleteAutomationRule: (ruleId: string) => void;
  acknowledgeIoTAlert: (alertId: string) => void;
  resolveIoTAlert: (alertId: string) => void;
  updateDeviceConfig: (
    deviceId: string,
    samplingSec: number,
    uploadSec: number
  ) => void;
  triggerOTAUpdate: (deviceId: string) => void;
  createMaintenanceFromIoT: (deviceId: string, title: string) => void;

  // Phân hệ 5 — Kinh doanh & Khách hàng
  customers: Customer[];
  crmActivities: CRMActivity[];
  commercialProducts: CommercialProduct[];
  classifications: PostHarvestClassification[];
  finishedGoodsLots: FinishedGoodsLot[];
  priceLists: PriceList[];
  priceRules: PriceRule[];
  priceHistory: PriceHistoryRecord[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  deliveries: DeliveryNote[];
  salesPayments: SalesPayment[];
  debtAging: CustomerDebtAging[];
  salesReturns: SalesReturn[];
  customerClaims: CustomerClaim[];
  expectedHarvests: ExpectedHarvestProjection[];

  addCustomer: (customer: Omit<Customer, 'id' | 'code' | 'currentDebtVnd' | 'totalOrdersCount' | 'totalRevenueVnd' | 'averageOrderVnd'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addCRMActivity: (activity: Omit<CRMActivity, 'id'>) => void;
  performClassification: (classificationData: Omit<PostHarvestClassification, 'id' | 'code' | 'status'>) => void;
  updateCommercialProduct: (id: string, updates: Partial<CommercialProduct>) => void;
  createQuotation: (quotation: Omit<Quotation, 'id' | 'code' | 'convertedOrderId'>) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
  convertQuotationToOrder: (quotationId: string) => string;
  createSalesOrder: (order: Omit<SalesOrder, 'id' | 'code' | 'timeline' | 'paidAmountVnd' | 'outstandingAmountVnd' | 'paymentStatus' | 'status' | 'creditExceededWarning'>) => void;
  allocateOrderLots: (orderId: string, itemAllocations: { productId: string; allocatedLots: { lotId: string; lotCode: string; qty: number }[] }[]) => void;
  autoAllocateOrder: (orderId: string) => void;
  createDeliveryFromOrder: (orderId: string, deliveryData: { vehicle: string; driverName: string; driverPhone: string; plannedDate: string; notes?: string }) => void;
  confirmPickingAndDispatch: (deliveryId: string) => void;
  confirmDeliverySuccess: (deliveryId: string, recipientName: string, notes?: string) => void;
  recordSalesPayment: (payment: Omit<SalesPayment, 'id' | 'code'>) => void;
  createCustomerClaim: (claim: Omit<CustomerClaim, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateClaimStatus: (claimId: string, status: CustomerClaim['status'], resolutionOutcome?: string) => void;
  createSalesReturn: (returnRecord: Omit<SalesReturn, 'id' | 'code' | 'status'>) => void;
  updatePriceListItem: (priceListId: string, productId: string, newPrice: number, changedBy: string, reason: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFarmId, setActiveFarmId] = useState<string>('farm-001');
  const [farms, setFarms] = useState<Farm[]>(INITIAL_FARMS);
  const [areasTree] = useState<AreaNode>(INITIAL_AREAS_TREE);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('zone-north');
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PRODUCTION_PLANTS);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>(INITIAL_IOT_DEVICES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [settings, setSettings] = useState<SystemSettingsState>(INITIAL_SETTINGS);
  const [currentRoute, setCurrentRoute] = useState<string>('/production/dashboard');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [activeUser, setActiveUser] = useState<User>(INITIAL_USERS[0]);
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Phân hệ 2 State
  const [growthMeasurements, setGrowthMeasurements] = useState<GrowthMeasurement[]>(
    INITIAL_GROWTH_MEASUREMENTS
  );
  const [tasks, setTasks] = useState<FarmTask[]>(INITIAL_FARM_TASKS);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>(INITIAL_NUTRITION_PLANS);
  const [fertilizationLogs, setFertilizationLogs] = useState<FertilizationLog[]>(
    INITIAL_FERTILIZATION_LOGS
  );
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZone[]>(
    INITIAL_IRRIGATION_ZONES
  );
  const [envMetrics] = useState<EnvironmentMetric[]>(INITIAL_ENV_METRICS);
  const [pestDiseases] = useState<PestDisease[]>(INITIAL_PEST_DISEASES);
  const [pesticides, setPesticides] = useState<Pesticide[]>(INITIAL_PESTICIDES);
  const [diseaseCases, setDiseaseCases] = useState<DiseaseCase[]>(INITIAL_DISEASE_CASES);
  const [harvestBatches, setHarvestBatches] = useState<HarvestBatch[]>(INITIAL_HARVEST_BATCHES);
  const [lifecycleEvents, setLifecycleEvents] = useState<PlantLifecycleEvent[]>(
    INITIAL_LIFECYCLE_EVENTS
  );

  // Phân hệ 3 State
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [materialBatches, setMaterialBatches] = useState<MaterialBatch[]>(INITIAL_MATERIAL_BATCHES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>(INITIAL_STOCK_ISSUES);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(INITIAL_STOCK_TRANSFERS);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>(INITIAL_INVENTORY_COUNTS);
  const [farmAssets, setFarmAssets] = useState<FarmAsset[]>(INITIAL_FARM_ASSETS);
  const [iotAssets, setIotAssets] = useState<IoTAssetItem[]>(INITIAL_IOT_ASSETS);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(INITIAL_MAINTENANCE_RECORDS);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>(INITIAL_CALIBRATION_RECORDS);
  const [farmExpenses, setFarmExpenses] = useState<FarmExpense[]>(INITIAL_FARM_EXPENSES);
  const [resourceAlerts, setResourceAlerts] = useState<ResourceAlert[]>(INITIAL_RESOURCE_ALERTS);

  // Phân hệ 4 State — IoT & Tự động hóa
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetric[]>(INITIAL_REALTIME_METRICS);
  const [automationRules, setAutomationRules] = useState<IoTAutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [automationExecutions, setAutomationExecutions] = useState<AutomationExecution[]>(INITIAL_AUTOMATION_EXECUTIONS);
  const [iotAlerts, setIotAlerts] = useState<IoTAlert[]>(INITIAL_IOT_ALERTS);
  const [iotEventLogs, setIotEventLogs] = useState<IoTEventLog[]>(INITIAL_IOT_EVENT_LOGS);
  const [failsafeRules, setFailsafeRules] = useState<FailSafeRule[]>(INITIAL_FAILSAFE_RULES);
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>(INITIAL_TOPOLOGY_NODES);

  // Phân hệ 5 State — Kinh doanh & Khách hàng
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [crmActivities, setCrmActivities] = useState<CRMActivity[]>(INITIAL_CRM_ACTIVITIES);
  const [commercialProducts, setCommercialProducts] = useState<CommercialProduct[]>(INITIAL_COMMERCIAL_PRODUCTS);
  const [classifications, setClassifications] = useState<PostHarvestClassification[]>(INITIAL_CLASSIFICATIONS);
  const [finishedGoodsLots, setFinishedGoodsLots] = useState<FinishedGoodsLot[]>(INITIAL_FINISHED_GOODS_LOTS);
  const [priceLists, setPriceLists] = useState<PriceList[]>(INITIAL_PRICE_LISTS);
  const [priceRules] = useState<PriceRule[]>(INITIAL_PRICE_RULES);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>(INITIAL_PRICE_HISTORY);
  const [quotations, setQuotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>(INITIAL_DELIVERIES);
  const [salesPayments, setSalesPayments] = useState<SalesPayment[]>(INITIAL_PAYMENTS);
  const [debtAging, setDebtAging] = useState<CustomerDebtAging[]>(INITIAL_DEBT_AGING);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(INITIAL_SALES_RETURNS);
  const [customerClaims, setCustomerClaims] = useState<CustomerClaim[]>(INITIAL_CUSTOMER_CLAIMS);
  const [expectedHarvests] = useState<ExpectedHarvestProjection[]>(INITIAL_EXPECTED_HARVESTS);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const activeFarm = useMemo(() => {
    return farms.find((f) => f.id === activeFarmId) || farms[0];
  }, [farms, activeFarmId]);

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newLog: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: formatted,
      ...entry,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addFarm = (farm: Farm) => {
    setFarms((prev) => [farm, ...prev]);
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'CREATE',
      actionLabel: 'Tạo trang trại mới',
      module: 'SYSTEM',
      moduleLabel: 'Hệ thống & Trang trại',
      target: `${farm.name} (${farm.code})`,
      ip: '113.161.42.88',
      details: `Đã khởi tạo trang trại quy mô ${farm.areaHa} ha tại ${farm.province}.`,
    });
    showToast(`Đã thêm thành công trang trại "${farm.name}"`);
  };

  const updateFarm = (id: string, updated: Partial<Farm>) => {
    setFarms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updated } : f))
    );
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Cập nhật trang trại',
      module: 'SYSTEM',
      moduleLabel: 'Hệ thống & Trang trại',
      target: `Trang trại #${id}`,
      ip: '113.161.42.88',
      details: 'Cập nhật thông số diện tích và cấu hình đơn vị đo lường.',
    });
    showToast('Cập nhật thông tin trang trại thành công');
  };

  const archiveFarm = (id: string) => {
    const target = farms.find((f) => f.id === id);
    if (!target) return;
    setFarms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'INACTIVE' } : f))
    );
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Lưu trữ / Tạm ngưng trang trại',
      module: 'SYSTEM',
      moduleLabel: 'Hệ thống & Trang trại',
      target: `${target.name} (${target.code})`,
      ip: '113.161.42.88',
      details: 'Chuyển trạng thái sang Tạm ngưng hoạt động (Lưu trữ an toàn, không xóa vật lý).',
    });
    showToast(`Đã tạm ngưng trang trại "${target.name}"`);
  };

  const addUser = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    showToast(`Đã tạo người dùng "${newUser.name}"`);
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );
    showToast('Đã lưu thay đổi thông tin người dùng');
  };

  const toggleLockUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextStatus = target.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u))
    );
    showToast(
      nextStatus === 'LOCKED'
        ? `Đã khóa tài khoản ${target.name}`
        : `Đã mở khóa tài khoản ${target.name}`,
      nextStatus === 'LOCKED' ? 'warning' : 'success'
    );
  };

  const bulkLockUsers = (ids: string[]) => {
    setUsers((prev) =>
      prev.map((u) => (ids.includes(u.id) ? { ...u, status: 'LOCKED' } : u))
    );
    showToast(`Đã khóa thành công ${ids.length} tài khoản`, 'warning');
  };

  const bulkAssignRole = (ids: string[], roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    setUsers((prev) =>
      prev.map((u) =>
        ids.includes(u.id)
          ? { ...u, roleId: role.id, roleName: role.name }
          : u
      )
    );
    showToast(`Đã gán vai trò "${role.name}" cho ${ids.length} người dùng`);
  };

  const updateRolePermissions = (roleId: string, permissions: Role['permissions']) => {
    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole) return;
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions } : r))
    );
    showToast(`Đã lưu ma trận phân quyền cho vai trò "${targetRole.name}"`);
  };

  const duplicateRole = (roleId: string, newName: string) => {
    const sourceRole = roles.find((r) => r.id === roleId);
    if (!sourceRole) return;
    const newRole: Role = {
      ...sourceRole,
      id: `role-${Date.now()}`,
      code: `CUSTOM_${Date.now().toString().slice(-4)}`,
      name: newName,
      description: `Bản sao chép từ ${sourceRole.name}`,
      userCount: 0,
      type: 'CUSTOM',
      status: 'ACTIVE',
    };
    setRoles((prev) => [...prev, newRole]);
    showToast(`Đã nhân bản vai trò mới: "${newName}"`);
  };

  const deleteRole = (roleId: string) => {
    const target = roles.find((r) => r.id === roleId);
    if (!target) return { success: false, message: 'Không tìm thấy vai trò' };
    if (target.type === 'SYSTEM') {
      return { success: false, message: 'Không thể xóa vai trò mặc định của hệ thống!' };
    }
    if (target.userCount > 0) {
      return {
        success: false,
        message: `Không thể xóa vì đang có ${target.userCount} người dùng thuộc vai trò này.`,
      };
    }
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    showToast(`Đã xóa vai trò "${target.name}"`);
    return { success: true, message: 'Đã xóa vai trò' };
  };

  const updateSettings = (newSettings: SystemSettingsState) => {
    setSettings(newSettings);
    showToast('Đã lưu cấu hình hệ thống');
  };

  const runBackupNow = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      showToast('Sao lưu dữ liệu hệ thống thành công!', 'success');
    }, 1200);
  };

  // -------------------------------------------------------------
  // Phân hệ 2: Specific Logic & Automated Workflows
  // -------------------------------------------------------------
  const addPlant = (plant: Plant) => {
    setPlants((prev) => [plant, ...prev]);
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'CREATE',
      actionLabel: 'Xuống giống / Thêm cá thể cây',
      module: 'PLANTS',
      moduleLabel: 'Sản xuất & Cây trồng',
      target: `Cây ${plant.name} (${plant.code})`,
      ip: '113.161.42.88',
      details: `Đăng ký mã QR định danh ${plant.qrCode} tại ${plant.zoneName} - ${plant.rowName}`,
    });
    // Record first lifecycle event
    const initialLife: PlantLifecycleEvent = {
      id: `life-${Date.now()}`,
      plantId: plant.id,
      date: plant.plantedDate || '05/10/2026',
      type: 'PLANTED',
      typeLabel: 'Xuống giống',
      title: `Trồng cây giống ${plant.variety}`,
      description: `Định danh cá thể ${plant.code} tại ${plant.zoneName} - ${plant.gardenName} - ${plant.rowName}.`,
      actor: activeUser.name,
    };
    setLifecycleEvents((prev) => [initialLife, ...prev]);
    showToast(`Đã thêm thành công cá thể cây ${plant.code}`);
  };

  const updatePlant = (id: string, p: Partial<Plant>) => {
    setPlants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...p } : item))
    );
    showToast(`Đã cập nhật hồ sơ cây`);
  };

  const addGrowthMeasurement = (record: GrowthMeasurement) => {
    setGrowthMeasurements((prev) => [record, ...prev]);
    // update plant's latest stats
    setPlants((prev) =>
      prev.map((pl) => {
        if (pl.id === record.plantId || pl.code === record.plantCode) {
          return {
            ...pl,
            heightMeters: record.heightMeters,
            trunkDiameterCm: record.trunkDiameterCm,
            leavesCount: record.leavesCount,
            flowersCount: record.flowersCount,
            bunchCount: record.bunchCount,
            fruitsCount: record.fruitsCount,
          };
        }
        return pl;
      })
    );
    // add lifecycle event
    const event: PlantLifecycleEvent = {
      id: `life-${Date.now()}`,
      plantId: record.plantId,
      date: record.date,
      type: 'GROWTH_CHECK',
      typeLabel: 'Sinh trưởng',
      title: `Ghi nhận chỉ số sinh trưởng định kỳ (${record.fruitsCount} quả, ${record.heightMeters}m)`,
      description: record.notes || 'Số liệu phát triển tán lá và buồng trái đo lường thực tế.',
      actor: record.recordedBy || activeUser.name,
    };
    setLifecycleEvents((prev) => [event, ...prev]);
    showToast(`Đã ghi nhận chỉ số sinh trưởng cây ${record.plantCode}`);
  };

  // EXPERIENCE 3: HOÀN THÀNH CÔNG VIỆC TỰ ĐỘNG CẬP NHẬT TẤT CẢ LIÊN QUAN
  const completeTask = (taskId: string, actualSupplyQty?: number, notes?: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nowStr = new Date().toLocaleDateString('vi-VN');
    const nowTimeStr = `${nowStr} ${new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    // 1. Mark task completed
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'COMPLETED',
              completedAt: nowTimeStr,
              completedNotes: notes || t.completedNotes,
              actualSupplyUsed: t.plannedSupply
                ? {
                    ...t.plannedSupply,
                    actualQty: actualSupplyQty ?? t.plannedSupply.plannedQty,
                  }
                : undefined,
            }
          : t
      )
    );

    // 2. Automatically deduct supply stock if supply used
    if (task.plannedSupply) {
      const qtyUsed = actualSupplyQty ?? task.plannedSupply.plannedQty;
      setPesticides((prev) =>
        prev.map((p) =>
          p.tradeName.includes(task.plannedSupply!.supplyName) ||
          task.plannedSupply!.supplyName.includes(p.tradeName)
            ? { ...p, stockQty: Math.max(0, p.stockQty - qtyUsed) }
            : p
        )
      );
    }

    // 3. Update target Plant's lastFertilized or lastWatered or issue
    if (task.plantCode) {
      setPlants((prev) =>
        prev.map((pl) => {
          if (pl.code === task.plantCode) {
            const updated: Partial<Plant> = {};
            if (task.type === 'FERTILIZING') {
              updated.lastFertilized = `${nowStr} (Vừa hoàn thành)`;
            } else if (task.type === 'WATERING') {
              updated.lastWatered = `${nowStr} (Vừa hoàn thành)`;
            } else if (task.type === 'TREATMENT') {
              updated.health = 'WATCH';
              updated.activeIssue = 'Đã xử lý thuốc bảo vệ thực vật, đang theo dõi hồi phục';
            }
            return { ...pl, ...updated };
          }
          return pl;
        })
      );

      // 4. Record event on Plant's Lifecycle Timeline automatically
      const lifeEvent: PlantLifecycleEvent = {
        id: `life-${Date.now()}`,
        plantId: task.plantId || `plant-${task.plantCode.toLowerCase()}`,
        date: nowStr,
        type:
          task.type === 'FERTILIZING'
            ? 'FERTILIZED'
            : task.type === 'WATERING'
            ? 'WATERED'
            : task.type === 'TREATMENT'
            ? 'TREATED'
            : 'GROWTH_CHECK',
        typeLabel: task.typeLabel,
        title: `Hoàn thành: ${task.title}`,
        description: `${notes || 'Thực hiện đúng quy chuẩn kỹ thuật.'} ${
          task.plannedSupply
            ? `Vật tư: ${actualSupplyQty ?? task.plannedSupply.plannedQty} ${
                task.plannedSupply.unit
              } ${task.plannedSupply.supplyName}.`
            : ''
        }`,
        actor: activeUser.name,
      };
      setLifecycleEvents((prev) => [lifeEvent, ...prev]);

      // If fertilizing, record in Fertilization history
      if (task.type === 'FERTILIZING' && task.plannedSupply) {
        setFertilizationLogs((prev) => [
          {
            id: `fert-${Date.now()}`,
            date: nowStr,
            plantCode: task.plantCode!,
            zoneName: task.zoneName,
            fertilizerName: task.plannedSupply!.supplyName,
            dosage: actualSupplyQty ?? task.plannedSupply!.plannedQty,
            unit: task.plannedSupply!.unit,
            applicatorName: activeUser.name,
            costVnd: task.costVnd || 45000,
            resultNotes: notes || 'Hoàn thành bón định kỳ.',
          },
          ...prev,
        ]);
      }
    }

    // 5. Add audit log
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Hoàn thành công việc chăm sóc',
      module: 'TASKS',
      moduleLabel: 'Sản xuất & Công việc',
      target: `${task.title} (${task.code})`,
      ip: '113.161.42.88',
      details: `Tự động trừ kho vật tư và cập nhật timeline cây ${task.plantCode || 'phân khu'}.`,
    });

    showToast(`✓ Đã hoàn thành công việc: Tự động trừ kho & cập nhật nhật ký cây!`);
  };

  const createTask = (newTask: FarmTask) => {
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Đã giao công việc mới: ${newTask.title}`);
  };

  // EXPERIENCE 2: SÂU BỆNH & PHÁC ĐỒ ĐIỀU TRỊ
  const createDiseaseCase = (caseData: DiseaseCase) => {
    setDiseaseCases((prev) => [caseData, ...prev]);
    // update target plant status to SICK or WATCH
    setPlants((prev) =>
      prev.map((pl) =>
        pl.code === caseData.plantCode
          ? {
              ...pl,
              health: caseData.severity === 'CRITICAL' ? 'CRITICAL' : 'SICK',
              activeIssue: `Ghi nhận ${caseData.diseaseName} (${caseData.code})`,
            }
          : pl
      )
    );
    // add lifecycle event
    const event: PlantLifecycleEvent = {
      id: `life-${Date.now()}`,
      plantId: caseData.plantId,
      date: caseData.detectedDate,
      type: 'PEST_DETECTED',
      typeLabel: 'Sâu bệnh',
      title: `Phát hiện: ${caseData.diseaseName}`,
      description: caseData.diagnosisNotes,
      actor: activeUser.name,
    };
    setLifecycleEvents((prev) => [event, ...prev]);
    showToast(`Đã mở ca theo dõi sâu bệnh ${caseData.code}`);
  };

  const updateDiseaseCaseStatus = (
    caseId: string,
    status: DiseaseCaseStatus,
    note?: string
  ) => {
    const targetCase = diseaseCases.find((c) => c.id === caseId);
    if (!targetCase) return;

    const nowStr = new Date().toLocaleDateString('vi-VN');
    setDiseaseCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status,
            timeline: [
              ...c.timeline,
              {
                date: `${nowStr} ${new Date().toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`,
                stage:
                  status === 'DIAGNOSING'
                    ? 'Chẩn đoán'
                    : status === 'TREATING'
                    ? 'Điều trị'
                    : status === 'MONITORING'
                    ? 'Theo dõi'
                    : status === 'RESOLVED'
                    ? 'Đã xử lý'
                    : 'Đóng case',
                note: note || `Chuyển trạng thái sang ${status}`,
                actor: activeUser.name,
              },
            ],
          };
        }
        return c;
      })
    );

    // If case is resolved or closed, restore plant health to WATCH or NORMAL
    if (status === 'RESOLVED' || status === 'CLOSED') {
      setPlants((prev) =>
        prev.map((pl) =>
          pl.code === targetCase.plantCode
            ? {
                ...pl,
                health: 'NORMAL',
                activeIssue: undefined,
              }
            : pl
        )
      );
    }

    showToast(`Đã cập nhật trạng thái case ${targetCase.code}`);
  };

  const applyTreatmentToCase = (caseId: string, treatmentId: string) => {
    const targetCase = diseaseCases.find((c) => c.id === caseId);
    if (!targetCase) return;
    const opt = targetCase.proposedTreatments.find((t) => t.id === treatmentId);
    if (!opt) return;

    const nowStr = new Date().toLocaleDateString('vi-VN');
    setDiseaseCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: 'MONITORING',
            selectedTreatment: {
              treatmentId: opt.id,
              pesticideName: opt.pesticideName || opt.title,
              dosage: opt.dosage || 'Theo khuyến cáo kỹ thuật',
              appliedDate: nowStr,
              appliedBy: activeUser.name,
              resultNotes: 'Đã triển khai phác đồ điều trị, bắt đầu theo dõi hiệu quả.',
            },
            timeline: [
              ...c.timeline,
              {
                date: `${nowStr} 15:30`,
                stage: 'Điều trị',
                note: `Áp dụng ${opt.title}. Liều lượng: ${opt.dosage}`,
                actor: activeUser.name,
              },
              {
                date: `${nowStr} 17:00`,
                stage: 'Theo dõi',
                note: 'Bắt đầu giai đoạn theo dõi phục hồi búp đọt.',
                actor: activeUser.name,
              },
            ],
          };
        }
        return c;
      })
    );

    // add lifecycle event
    const event: PlantLifecycleEvent = {
      id: `life-${Date.now()}`,
      plantId: targetCase.plantId,
      date: nowStr,
      type: 'TREATED',
      typeLabel: 'Điều trị',
      title: `Áp dụng phác đồ điều trị cho ${targetCase.diseaseName}`,
      description: `Thuốc: ${opt.pesticideName}. Hiệu quả kỳ vọng: ${opt.effectiveness}`,
      actor: activeUser.name,
    };
    setLifecycleEvents((prev) => [event, ...prev]);

    showToast(`Đã áp dụng phương án điều trị thành công!`);
  };

  const createHarvestBatch = (batch: HarvestBatch) => {
    setHarvestBatches((prev) => [batch, ...prev]);
    // update plant's yield & harvest dates
    batch.selectedPlants.forEach((code) => {
      setPlants((prev) =>
        prev.map((pl) =>
          pl.code === code
            ? {
                ...pl,
                fruitsCount: Math.max(10, pl.fruitsCount - 15),
                latestYieldKg: +(batch.totalWeightKg / batch.selectedPlants.length).toFixed(1),
              }
            : pl
        )
      );
      // lifecycle event
      const ev: PlantLifecycleEvent = {
        id: `life-${Date.now()}-${code}`,
        plantId: `plant-${code.toLowerCase()}`,
        date: batch.date,
        type: 'HARVESTED',
        typeLabel: 'Thu hoạch',
        title: `Thu hoạch vào đợt ${batch.code}`,
        description: `Mã lô phát hành: ${batch.generatedLotCode}. Phân loại A: ${batch.gradeA_Kg} kg.`,
        actor: activeUser.name,
      };
      setLifecycleEvents((prev) => [ev, ...prev]);
    });

    showToast(`Tạo thành công đợt thu hoạch ${batch.code} và phát hành mã lô ${batch.generatedLotCode}`);
  };

  const quickSearchPlant = (code: string) => {
    const clean = code.trim().toUpperCase();
    return plants.find(
      (p) => p.code.toUpperCase() === clean || p.code.toUpperCase().includes(clean)
    );
  };

  // ==========================================
  // PHÂN HỆ 3: VẬT TƯ NÔNG NGHIỆP HANDLERS
  // ==========================================

  const addMaterial = (m: Material) => {
    setMaterials((prev) => [m, ...prev]);
    showToast(`Đã thêm vật tư mới: ${m.name}`);
  };

  const updateMaterial = (id: string, m: Partial<Material>) => {
    setMaterials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...m } : item))
    );
    showToast('Đã cập nhật thông tin vật tư');
  };

  const addSupplier = (s: Supplier) => {
    setSuppliers((prev) => [s, ...prev]);
    showToast(`Đã thêm nhà cung cấp: ${s.name}`);
  };

  const updateSupplier = (id: string, s: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...s } : item))
    );
    showToast('Đã cập nhật nhà cung cấp');
  };

  const createPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => [po, ...prev]);
    showToast(`Đã tạo đơn mua hàng ${po.code}`);
  };

  const receivePurchaseOrder = (
    poId: string,
    receiptItems: { materialId: string; qty: number; lotNumber: string; expiryDate: string }[],
    warehouseName = 'Kho tổng An Phú',
    invoiceNumber?: string,
    notes?: string
  ) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    let totalReceivedQty = 0;
    let totalReceivedValue = 0;

    // 1. Update Material Stocks & Batches
    receiptItems.forEach((item) => {
      totalReceivedQty += item.qty;
      const poItem = po.items.find((pi) => pi.materialId === item.materialId);
      const unitPrice = poItem ? poItem.unitPrice : 0;
      totalReceivedValue += item.qty * unitPrice;

      // Increase material stock
      setMaterials((prev) =>
        prev.map((mat) => {
          if (mat.id === item.materialId) {
            const newStock = mat.currentStock + item.qty;
            const newStatus =
              newStock <= 0
                ? 'OUT_OF_STOCK'
                : newStock <= mat.minStock
                ? 'LOW_STOCK'
                : 'NORMAL';
            return {
              ...mat,
              currentStock: newStock,
              status: newStatus,
              latestPrice: unitPrice > 0 ? unitPrice : mat.latestPrice,
              latestExpiry: item.expiryDate || mat.latestExpiry,
            };
          }
          return mat;
        })
      );

      // Create / Update Batch
      setMaterialBatches((prev) => {
        const existing = prev.find(
          (b) => b.batchNumber === item.lotNumber && b.materialId === item.materialId
        );
        const transEntry = {
          date: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          type: 'IMPORT' as const,
          qtyChange: item.qty,
          remainingQty: (existing ? existing.currentQty : 0) + item.qty,
          refType: 'PURCHASE_ORDER',
          refCode: po.code,
          actor: activeUser.name,
        };

        if (existing) {
          return prev.map((b) =>
            b.id === existing.id
              ? {
                  ...b,
                  currentQty: b.currentQty + item.qty,
                  status: 'ACTIVE' as const,
                  transactions: [...b.transactions, transEntry],
                }
              : b
          );
        } else {
          const newBatch: MaterialBatch = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            batchNumber: item.lotNumber,
            materialId: item.materialId,
            materialName: poItem?.materialName || 'Vật tư',
            materialCode: poItem?.materialCode || '',
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            initialQty: item.qty,
            currentQty: item.qty,
            reservedQty: 0,
            unit: poItem?.unit || 'kg',
            importDate: new Date().toLocaleDateString('vi-VN'),
            expiryDate: item.expiryDate,
            unitPrice: unitPrice,
            warehouseId: po.warehouseId,
            warehouseName: warehouseName,
            locationRack: 'Kệ nhận hàng A-01',
            status: 'ACTIVE',
            transactions: [transEntry],
          };
          return [newBatch, ...prev];
        }
      });
    });

    // 2. Update Purchase Order item receivedQty and overall status
    const newReceipt = {
      receiptId: `rcpt-${Date.now()}`,
      receivedDate: new Date().toLocaleDateString('vi-VN'),
      receivedBy: activeUser.name,
      warehouseName,
      items: receiptItems,
      invoiceNumber,
      notes,
    };

    setPurchaseOrders((prev) =>
      prev.map((p) => {
        if (p.id === poId) {
          const updatedItems = p.items.map((it) => {
            const rec = receiptItems.find((r) => r.materialId === it.materialId);
            const added = rec ? rec.qty : 0;
            return {
              ...it,
              receivedQty: it.receivedQty + added,
            };
          });
          const allDone = updatedItems.every((it) => it.receivedQty >= it.orderedQty);
          return {
            ...p,
            items: updatedItems,
            status: allDone ? 'COMPLETED' : 'PARTIALLY_RECEIVED',
            receipts: [...p.receipts, newReceipt],
          };
        }
        return p;
      })
    );

    // 3. Update Supplier Debt & Spend
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === po.supplierId) {
          return {
            ...s,
            currentDebt: s.currentDebt + totalReceivedValue,
            totalSpend: s.totalSpend + totalReceivedValue,
          };
        }
        return s;
      })
    );

    // 4. Audit Log
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Nhận hàng đơn mua',
      module: 'INVENTORY',
      moduleLabel: 'Vật tư & Mua hàng',
      target: `${po.code} (${totalReceivedQty} vật tư)`,
      ip: '192.168.1.105',
      details: `Nhận hàng từ ${po.supplierName}, tồn kho tự động tăng +${totalReceivedQty}`,
    });

    showToast(`✓ Đã nhận ${totalReceivedQty} vật tư từ ${po.code}. Tồn kho đã tự động tăng!`);
  };

  const quickDirectPurchase = (
    supplierId: string,
    materialId: string,
    qty: number,
    unitPrice: number,
    lotNumber: string,
    expiryDate: string,
    warehouseName: string,
    notes?: string
  ) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    const mat = materials.find((m) => m.id === materialId);
    const poCode = `PO-QUICK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPO: PurchaseOrder = {
      id: `po-quick-${Date.now()}`,
      code: poCode,
      supplierId,
      supplierName: sup ? sup.name : 'Nhà cung cấp trực tiếp',
      orderDate: new Date().toLocaleDateString('vi-VN'),
      expectedDeliveryDate: new Date().toLocaleDateString('vi-VN'),
      deliveryDate: new Date().toLocaleDateString('vi-VN'),
      warehouseId: 'wh-main',
      warehouseName,
      items: [
        {
          materialId,
          materialName: mat ? mat.name : 'Vật tư',
          materialCode: mat ? mat.code : '',
          unit: mat ? mat.unit : 'kg',
          orderedQty: qty,
          receivedQty: qty,
          unitPrice,
          discountPercent: 0,
          subtotal: qty * unitPrice,
        },
      ],
      subtotal: qty * unitPrice,
      taxAmount: 0,
      shippingFee: 0,
      totalAmount: qty * unitPrice,
      status: 'COMPLETED',
      notes: notes || 'Mua hàng trực tiếp tại đại lý',
      receipts: [
        {
          receiptId: `rcpt-q-${Date.now()}`,
          receivedDate: new Date().toLocaleDateString('vi-VN'),
          receivedBy: activeUser.name,
          warehouseName,
          items: [
            {
              materialId,
              materialName: mat ? mat.name : 'Vật tư',
              qty,
              lotNumber: lotNumber || `LOT-${Date.now().toString().slice(-6)}`,
              expiryDate: expiryDate || '2027-12-31',
            },
          ],
        },
      ],
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Increase stock
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId
          ? {
              ...m,
              currentStock: m.currentStock + qty,
              latestPrice: unitPrice,
              status: 'NORMAL',
            }
          : m
      )
    );

    // Record expense
    const newExp: FarmExpense = {
      id: `exp-${Date.now()}`,
      code: `EXP-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      category: 'MATERIAL',
      categoryLabel: 'Mua nhanh vật tư',
      targetType: 'FARM',
      targetName: 'Trang trại Dừa An Phú',
      sourceRef: `Mua trực tiếp ${poCode}`,
      amount: qty * unitPrice,
      notes: notes || `Mua nhanh ${qty} ${mat?.unit || 'kg'} ${mat?.name}`,
      recordedBy: activeUser.name,
    };
    setFarmExpenses((prev) => [newExp, ...prev]);

    showToast(`✓ Mua nhanh thành công: +${qty} ${mat?.unit || 'kg'} vào ${warehouseName}`);
  };

  const issueStock = (issue: StockIssue) => {
    setStockIssues((prev) => [issue, ...prev]);

    // Deduct stock for each item
    issue.items.forEach((item) => {
      setMaterials((prev) =>
        prev.map((m) => {
          if (m.id === item.materialId) {
            const nextStock = Math.max(0, m.currentStock - item.qty);
            const nextStatus =
              nextStock === 0
                ? 'OUT_OF_STOCK'
                : nextStock <= m.minStock
                ? 'LOW_STOCK'
                : 'NORMAL';
            return {
              ...m,
              currentStock: nextStock,
              status: nextStatus,
            };
          }
          return m;
        })
      );

      // Deduct batch
      setMaterialBatches((prev) =>
        prev.map((b) => {
          if (b.id === item.batchId || b.batchNumber === item.batchNumber) {
            const rem = Math.max(0, b.currentQty - item.qty);
            const trans = {
              date: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString(
                'vi-VN',
                { hour: '2-digit', minute: '2-digit' }
              )}`,
              type: 'EXPORT' as const,
              qtyChange: -item.qty,
              remainingQty: rem,
              refType: 'STOCK_ISSUE',
              refCode: issue.code,
              actor: activeUser.name,
            };
            return {
              ...b,
              currentQty: rem,
              status: rem === 0 ? ('DEPLETED' as const) : b.status,
              transactions: [...b.transactions, trans],
            };
          }
          return b;
        })
      );
    });

    // Record Farm Expense
    const newExp: FarmExpense = {
      id: `exp-${Date.now()}`,
      code: `EXP-${Date.now().toString().slice(-6)}`,
      date: issue.date,
      category: 'MATERIAL',
      categoryLabel: 'Xuất sử dụng vật tư',
      targetType:
        issue.issueType === 'PLANT' ? 'PLANT' : issue.issueType === 'TASK' ? 'TASK' : 'ZONE',
      targetId: issue.targetId,
      targetName: issue.targetName,
      sourceRef: `Xuất kho ${issue.code}`,
      amount: issue.totalCost,
      notes: issue.notes || `Xuất phục vụ ${issue.targetName}`,
      recordedBy: activeUser.name,
    };
    setFarmExpenses((prev) => [newExp, ...prev]);

    // If target is a plant, update plant lifecycle & cost
    if (issue.issueType === 'PLANT' && issue.targetId) {
      const targetPlant = plants.find(
        (p) => p.id === issue.targetId || p.code === issue.targetName.replace(/\D/g, '')
      );
      if (targetPlant) {
        const ev: PlantLifecycleEvent = {
          id: `life-${Date.now()}`,
          plantId: targetPlant.id,
          date: issue.date,
          type: 'FERTILIZED',
          typeLabel: 'Dinh dưỡng / Vật tư',
          title: `Sử dụng vật tư (${issue.code})`,
          description: `Xuất ${issue.items
            .map((it) => `${it.qty} ${it.unit} ${it.materialName}`)
            .join(', ')} phục vụ cây. Chi phí: ${issue.totalCost.toLocaleString('vi-VN')} đ`,
          actor: activeUser.name,
        };
        setLifecycleEvents((prev) => [ev, ...prev]);
      }
    }

    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Xuất kho vật tư',
      module: 'INVENTORY',
      moduleLabel: 'Kho & Tồn kho',
      target: `${issue.code} -> ${issue.targetName}`,
      ip: '192.168.1.105',
      details: `Xuất ${issue.items.reduce(
        (sum, it) => sum + it.qty,
        0
      )} vật tư cho ${issue.targetName}. Chi phí: ${issue.totalCost.toLocaleString('vi-VN')} đ`,
    });

    showToast(`✓ Đã xuất kho ${issue.code}. Kho tự động giảm và chi phí đã phân bổ cho ${issue.targetName}`);
  };

  const transferStock = (transfer: StockTransfer) => {
    setStockTransfers((prev) => [transfer, ...prev]);
    showToast(
      `✓ Đã điều chuyển ${transfer.items.reduce((sum, it) => sum + it.qty, 0)} vật tư từ ${
        transfer.fromWarehouseName
      } sang ${transfer.toWarehouseName}`
    );
  };

  const submitInventoryCount = (count: InventoryCount) => {
    setInventoryCounts((prev) => [count, ...prev]);
    // adjust discrepancies
    count.items.forEach((item) => {
      if (item.diffQty !== 0) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === item.materialId
              ? {
                  ...m,
                  currentStock: Math.max(0, m.currentStock + item.diffQty),
                }
              : m
          )
        );
      }
    });

    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'UPDATE',
      actionLabel: 'Kiểm kê kho & Điều chỉnh',
      module: 'INVENTORY',
      moduleLabel: 'Kiểm kê',
      target: count.code,
      ip: '192.168.1.105',
      details: `Kiểm kê kho ${count.warehouseName}, chênh lệch đã được hiệu chỉnh tồn kho.`,
    });

    showToast(`✓ Đã duyệt kết quả kiểm kê ${count.code}. Tồn kho hệ thống đã được đồng bộ!`);
  };

  const addFarmAsset = (asset: FarmAsset) => {
    setFarmAssets((prev) => [asset, ...prev]);
    showToast(`Đã thêm thiết bị tài sản: ${asset.name}`);
  };

  const updateFarmAsset = (id: string, a: Partial<FarmAsset>) => {
    setFarmAssets((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...a } : item))
    );
    showToast('Đã cập nhật thiết bị tài sản');
  };

  const addIoTAsset = (iot: IoTAssetItem) => {
    setIotAssets((prev) => [iot, ...prev]);
    showToast(`Đã thêm thiết bị IoT: ${iot.name}`);
  };

  const installIoTAsset = (
    deviceId: string,
    zoneId: string,
    zoneName: string,
    gardenName: string,
    servedTarget: string,
    gatewayId: string,
    gatewayName: string
  ) => {
    setIotAssets((prev) =>
      prev.map((item) => {
        if (item.deviceId === deviceId || item.id === deviceId) {
          return {
            ...item,
            assetStatus: 'ACTIVE',
            installStatus: 'INSTALLED',
            zoneId,
            zoneName,
            gardenName,
            servedTarget,
            gatewayId,
            gatewayName,
            installDate: new Date().toLocaleDateString('vi-VN'),
            installedBy: activeUser.name,
          };
        }
        return item;
      })
    );

    showToast(`✓ Đã lắp đặt và kích hoạt thiết bị IoT ${deviceId} tại ${zoneName} (${servedTarget})`);
  };

  const createMaintenanceRecord = (record: MaintenanceRecord) => {
    setMaintenanceRecords((prev) => [record, ...prev]);
    showToast(`Đã tạo phiếu bảo trì ${record.code} cho ${record.assetName}`);
  };

  const completeMaintenanceRecord = (
    recordId: string,
    actualCost: number,
    partsUsed?: { partName: string; qty: number; unitCost: number; totalCost: number }[],
    notes?: string
  ) => {
    const rec = maintenanceRecords.find((r) => r.id === recordId);
    if (!rec) return;

    setMaintenanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: 'COMPLETED',
              completedDate: new Date().toLocaleDateString('vi-VN'),
              actualCost,
              partsUsed: partsUsed || r.partsUsed,
              notes: notes || r.notes,
            }
          : r
      )
    );

    // Update asset
    setFarmAssets((prev) =>
      prev.map((a) => {
        if (a.id === rec.assetId || a.code === rec.assetCode) {
          return {
            ...a,
            status: 'ACTIVE',
            lastMaintenanceDate: new Date().toLocaleDateString('vi-VN'),
            totalMaintenanceCost: a.totalMaintenanceCost + actualCost,
          };
        }
        return a;
      })
    );

    // Record expense
    const newExp: FarmExpense = {
      id: `exp-${Date.now()}`,
      code: `EXP-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      category: 'MAINTENANCE',
      categoryLabel: 'Bảo trì sửa chữa máy',
      targetType: 'DEVICE',
      targetName: rec.assetName,
      sourceRef: `Phiếu bảo trì ${rec.code}`,
      amount: actualCost,
      notes: notes || `Hoàn tất bảo trì ${rec.assetName}`,
      recordedBy: activeUser.name,
    };
    setFarmExpenses((prev) => [newExp, ...prev]);

    showToast(`✓ Đã hoàn tất bảo trì ${rec.code}. Chi phí ${actualCost.toLocaleString('vi-VN')} đ đã được hạch toán.`);
  };

  const createCalibrationRecord = (record: CalibrationRecord) => {
    setCalibrationRecords((prev) => [record, ...prev]);
    showToast(`Đã lưu kết quả hiệu chuẩn ${record.code}`);
  };

  const dismissAlert = (alertId: string) => {
    setResourceAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'DISMISSED' } : a))
    );
    showToast('Đã đóng cảnh báo');
  };

  // Phân hệ 4 — IoT & Tự động hóa Handlers
  const controlActuator = async (
    deviceId: string,
    command: 'START' | 'STOP' | 'OPEN' | 'CLOSE',
    durationMinutes?: number,
    manualReason?: string
  ): Promise<boolean> => {
    const dev = iotDevices.find((d) => d.id === deviceId);
    if (!dev) return false;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    // Log command sent
    const sendLog: IoTEventLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      deviceId: dev.id,
      deviceName: dev.name,
      eventType: 'COMMAND_SENT',
      message: `Gửi lệnh [${command}] tới thiết bị qua MQTT topic: ${dev.mqttTopic}`,
      source: 'MANUAL',
      severity: 'INFO',
    };
    setIotEventLogs((prev) => [sendLog, ...prev]);

    // Simulate network delay & device ACK
    await new Promise((r) => setTimeout(r, 450));

    const newState =
      command === 'START'
        ? 'ON'
        : command === 'STOP'
        ? 'OFF'
        : command === 'OPEN'
        ? 'OPEN'
        : 'CLOSED';
    const isRunning = newState === 'ON' || newState === 'OPEN';

    setIotDevices((prev) =>
      prev.map((d) => {
        if (d.id === deviceId) {
          return {
            ...d,
            lastSeenSeconds: 1,
            lastSeenTimestamp: 'Vừa xong',
            actuatorState: {
              ...d.actuatorState!,
              state: newState,
              mode: manualReason ? 'MANUAL' : 'AUTO',
              flowRateLpm: d.actuatorType === 'PUMP' && isRunning ? 342 : 0,
              currentAmpere: d.actuatorType === 'PUMP' && isRunning ? 14.2 : 0,
              manualOverrideUntil: manualReason
                ? new Date(Date.now() + (durationMinutes || 15) * 60000).toISOString()
                : null,
              manualOverrideReason: manualReason,
            },
          };
        }
        return d;
      })
    );

    // If Pump turned on, also update FLOW-01 metric
    if (dev.actuatorType === 'PUMP') {
      setRealtimeMetrics((prev) =>
        prev.map((m) =>
          m.metricType === 'WATER_FLOW'
            ? { ...m, value: isRunning ? 342 : 0, updatedSecondsAgo: 1 }
            : m
        )
      );
    }

    // Log ACK
    const ackLog: IoTEventLog = {
      id: `log-${Date.now() + 1}`,
      timestamp: timeStr,
      deviceId: dev.id,
      deviceName: dev.name,
      eventType: 'COMMAND_ACK',
      message: `Thiết bị xác nhận thực thi lệnh [${command}] thành công (ACK 14ms). Trạng thái hiện tại: ${newState}.`,
      source: 'EDGE_CONTROLLER',
      severity: 'INFO',
    };
    setIotEventLogs((prev) => [ackLog, ...prev]);

    showToast(`Đã điều khiển ${dev.name}: ${newState} thành công!`, 'success');
    return true;
  };

  const toggleRuleStatus = (ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, status: r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : r
      )
    );
    showToast('Đã thay đổi trạng thái kích hoạt của Rule');
  };

  const createAutomationRule = (rule: IoTAutomationRule) => {
    setAutomationRules((prev) => [rule, ...prev]);
    showToast(`Đã tạo Rule tự động hóa ${rule.name}!`, 'success');
  };

  const updateAutomationRule = (rule: IoTAutomationRule) => {
    setAutomationRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    showToast(`Đã cập nhật Rule ${rule.code}!`, 'success');
  };

  const deleteAutomationRule = (ruleId: string) => {
    setAutomationRules((prev) => prev.filter((r) => r.id !== ruleId));
    showToast('Đã xóa Rule tự động hóa', 'info');
  };

  const acknowledgeIoTAlert = (alertId: string) => {
    setIotAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
    showToast('Đã tiếp nhận xử lý cảnh báo IoT');
  };

  const resolveIoTAlert = (alertId: string) => {
    setIotAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'RESOLVED' } : a))
    );
    showToast('Đã đóng cảnh báo sự cố IoT thành công', 'success');
  };

  const updateDeviceConfig = (
    deviceId: string,
    samplingSec: number,
    uploadSec: number
  ) => {
    setIotDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              samplingIntervalSeconds: samplingSec,
              uploadIntervalSeconds: uploadSec,
            }
          : d
      )
    );
    const log: IoTEventLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      deviceId,
      deviceName: deviceId,
      eventType: 'CONFIG_UPDATE',
      message: `Cập nhật chu kỳ lấy mẫu: ${samplingSec}s, chu kỳ gửi tin: ${uploadSec}s`,
      source: 'MANUAL',
      severity: 'INFO',
    };
    setIotEventLogs((prev) => [log, ...prev]);
    showToast(`Đã nạp cấu hình mới cho ${deviceId} thành công!`, 'success');
  };

  const triggerOTAUpdate = (deviceId: string) => {
    const dev = iotDevices.find((d) => d.id === deviceId);
    if (!dev) return;
    showToast(`Bắt đầu truyền gói tin OTA Firmware ${dev.latestFirmware} tới ${dev.name}...`, 'info');
    setTimeout(() => {
      setIotDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? { ...d, firmwareVersion: d.latestFirmware }
            : d
        )
      );
      const log: IoTEventLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
        deviceId,
        deviceName: dev.name,
        eventType: 'OTA_SUCCESS',
        message: `Nâng cấp Firmware OTA thành công lên bản ${dev.latestFirmware}. Thiết bị đã tự khởi động lại.`,
        source: 'SYSTEM',
        severity: 'INFO',
      };
      setIotEventLogs((prev) => [log, ...prev]);
      showToast(`Nâng cấp Firmware cho ${dev.id} hoàn tất!`, 'success');
    }, 2500);
  };

  const createMaintenanceFromIoT = (deviceId: string, title: string) => {
    const dev = iotDevices.find((d) => d.id === deviceId);
    const newRecord: MaintenanceRecord = {
      id: `maint-${Date.now()}`,
      code: `MAINT-2026-0${maintenanceRecords.length + 1}`,
      assetId: dev?.assetRefId || `ast-${deviceId.toLowerCase()}`,
      assetCode: dev?.code || deviceId,
      assetName: dev ? dev.name : deviceId,
      isIoT: true,
      type: 'REPAIR',
      typeLabel: 'Sửa chữa khẩn cấp',
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeName: activeUser.name,
      reason: `Sự cố phát hiện từ Phân hệ 4 IoT: ${title}`,
      tasksDescription: `Kiểm tra cảm biến/thiết bị ${deviceId}, kiểm tra nguồn điện, anten và hiệu chuẩn lại tại hiện trường.`,
      partsUsed: [],
      estimatedCost: 350000,
    };
    createMaintenanceRecord(newRecord);
    showToast(`Đã tạo phiếu bảo trì kỹ thuật cho ${deviceId} (Phân hệ 3)!`, 'success');
  };

  // ==========================================
  // PHÂN HỆ 5 — KINH DOANH & KHÁCH HÀNG ACTIONS
  // ==========================================

  const addCustomer = (
    customerData: Omit<
      Customer,
      'id' | 'code' | 'currentDebtVnd' | 'totalOrdersCount' | 'totalRevenueVnd' | 'averageOrderVnd'
    >
  ) => {
    const nextCode = `KH-${String(customers.length + 100).padStart(4, '0')}`;
    const newCustomer: Customer = {
      ...customerData,
      id: `CUST-${Date.now()}`,
      code: nextCode,
      currentDebtVnd: 0,
      totalOrdersCount: 0,
      totalRevenueVnd: 0,
      averageOrderVnd: 0,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    addAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.roleName,
      action: 'CREATE',
      actionLabel: 'Tạo khách hàng mới',
      module: 'COMMERCE',
      moduleLabel: 'Kinh doanh & Khách hàng',
      target: `${newCustomer.name} (${newCustomer.code})`,
      ip: '113.161.42.88',
      details: `Đã thêm khách hàng ${newCustomer.name} thuộc nhóm ${newCustomer.typeLabel}, hạn mức công nợ ${newCustomer.creditLimitVnd.toLocaleString('vi-VN')}đ.`,
    });
    showToast(`Đã thêm khách hàng "${newCustomer.name}" thành công!`, 'success');
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    showToast('Đã cập nhật thông tin khách hàng thành công!', 'success');
  };

  const addCRMActivity = (activityData: Omit<CRMActivity, 'id'>) => {
    const newActivity: CRMActivity = {
      ...activityData,
      id: `CRM-ACT-${Date.now()}`,
    };
    setCrmActivities((prev) => [newActivity, ...prev]);
    showToast(`Đã ghi nhận hoạt động CRM: ${newActivity.title}`, 'info');
  };

  // Nguyên tắc 1: Thu hoạch không đồng nghĩa với hàng bán được
  const performClassification = (
    data: Omit<PostHarvestClassification, 'id' | 'code' | 'status'>
  ) => {
    const classCode = `CLASS-${data.harvestBatchCode.replace('HARV-', '')}-${String(classifications.length + 1).padStart(2, '0')}`;
    const newClassification: PostHarvestClassification = {
      ...data,
      id: `CLASS-${Date.now()}`,
      code: classCode,
      status: 'COMPLETED',
    };

    const newLots: FinishedGoodsLot[] = [];

    // Duyệt qua từng kết quả phân loại: Loại A, Loại B, Reject
    data.results.forEach((item) => {
      if (item.grade === 'REJECT') {
        // Nguyên tắc 1: 50 sản phẩm lỗi không được tính là hàng có thể bán
        // Không tạo Lô thành phẩm cho Reject
        return;
      }

      if (item.targetProductId && item.qty > 0) {
        const prod = commercialProducts.find((p) => p.id === item.targetProductId);
        const lotCode = item.targetLotCode || `LOT-${prod?.sku || 'PROD'}-${Date.now().toString().slice(-6)}`;
        
        const newLot: FinishedGoodsLot = {
          id: `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          lotCode,
          productId: item.targetProductId,
          productSku: prod?.sku || 'SKU-GEN',
          productName: item.targetProductName || prod?.name || 'Sản phẩm thương mại',
          harvestBatchId: data.harvestBatchId,
          harvestBatchCode: data.harvestBatchCode,
          farmArea: data.areaName,
          plantCodes: data.plantCodes,
          initialQty: item.qty,
          onHandQty: item.qty,
          reservedQty: 0,
          availableQty: item.qty,
          unit: data.unit,
          harvestDate: data.harvestDate,
          packagedDate: data.classifiedDate.split(' ')[0],
          expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          warehouseLocation: 'Kho TP Lạnh 01 - Kệ A3',
          qualityGrade: `Grade ${item.grade} (${prod?.cropSource || 'VietGAP'})`,
          qrCode: `SMARTFARM-${lotCode}-TRACEABILITY`,
        };
        newLots.push(newLot);

        // Cập nhật tăng On Hand & Available của sản phẩm thương mại
        setCommercialProducts((prev) =>
          prev.map((p) =>
            p.id === item.targetProductId
              ? {
                  ...p,
                  onHand: p.onHand + item.qty,
                  available: p.available + item.qty,
                }
              : p
          )
        );
      }
    });

    setFinishedGoodsLots((prev) => [...newLots, ...prev]);
    setClassifications((prev) => [newClassification, ...prev]);

    // Cập nhật trạng thái HarvestBatch trong Phân hệ 2 sang PROCESSED
    setHarvestBatches((prev) =>
      prev.map((h) =>
        h.id === data.harvestBatchId ? { ...h, status: 'PROCESSED' } : h
      )
    );

    const createdSummary = newLots.map((l) => `${l.productName}: +${l.onHandQty} ${l.unit}`).join(', ');
    showToast(`Phân loại sau thu hoạch thành công! Đã nhập kho thành phẩm: ${createdSummary}`, 'success');
  };

  const updateCommercialProduct = (id: string, updates: Partial<CommercialProduct>) => {
    setCommercialProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          // Nguyên tắc 2: Available = On Hand - Reserved
          updated.available = Math.max(0, updated.onHand - updated.reserved);
          return updated;
        }
        return p;
      })
    );
    showToast('Đã cập nhật sản phẩm thương mại!', 'success');
  };

  const createQuotation = (quotationData: Omit<Quotation, 'id' | 'code' | 'convertedOrderId'>) => {
    const qCode = `QT-2026-${String(quotations.length + 55).padStart(4, '0')}`;
    const newQuotation: Quotation = {
      ...quotationData,
      id: `QT-${Date.now()}`,
      code: qCode,
    };
    setQuotations((prev) => [newQuotation, ...prev]);
    showToast(`Đã tạo Báo giá ${qCode} cho ${newQuotation.customerName}!`, 'success');
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    );
    showToast(`Đã cập nhật trạng thái báo giá sang ${status}!`, 'info');
  };

  // Nguyên tắc 3: Một nghiệp vụ không nhập 2 lần (Chuyển Quotation -> Order)
  const convertQuotationToOrder = (quotationId: string): string => {
    const quote = quotations.find((q) => q.id === quotationId);
    if (!quote) return '';

    const cust = customers.find((c) => c.id === quote.customerId);
    const orderCode = `SO-2026-${String(salesOrders.length + 1030).padStart(4, '0')}`;
    const isCreditExceeded = cust ? cust.currentDebtVnd + quote.totalAmountVnd > cust.creditLimitVnd : false;

    const newOrder: SalesOrder = {
      id: `SO-${Date.now()}`,
      code: orderCode,
      quotationId: quote.id,
      customerId: quote.customerId,
      customerCode: quote.customerCode,
      customerName: quote.customerName,
      customerType: cust?.typeLabel || 'Khách hàng',
      customerPhone: cust?.phone || '0900000000',
      deliveryAddress: cust?.deliveryAddress || 'Kho khách hàng',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      items: quote.items.map((item) => ({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit,
        quantityOrdered: item.quantity,
        quantityAllocated: 0,
        quantityDelivered: 0,
        unitPriceVnd: item.unitPriceVnd,
        discountVnd: item.discountVnd,
        subtotalVnd: item.subtotalVnd,
        allocatedLots: [],
      })),
      subtotalVnd: quote.subtotalVnd,
      discountVnd: quote.discountTotalVnd,
      taxVnd: quote.taxVnd,
      shippingFeeVnd: 250000,
      totalAmountVnd: quote.totalAmountVnd + 250000,
      paidAmountVnd: 0,
      outstandingAmountVnd: quote.totalAmountVnd + 250000,
      paymentStatus: 'UNPAID',
      status: 'CONFIRMED',
      creditExceededWarning: isCreditExceeded,
      createdBy: activeUser.name,
      timeline: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          stage: 'CONFIRMED',
          note: `Chuyển trực tiếp từ Báo giá ${quote.code} sang Đơn hàng (không cần nhập lại dữ liệu)`,
          actor: activeUser.name,
        },
      ],
    };

    setSalesOrders((prev) => [newOrder, ...prev]);
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quotationId ? { ...q, status: 'CONVERTED', convertedOrderId: newOrder.id } : q
      )
    );

    if (isCreditExceeded) {
      showToast(`Cảnh báo: Đơn hàng mới sẽ làm công nợ của ${quote.customerName} vượt hạn mức tín dụng!`, 'warning');
    } else {
      showToast(`Đã chuyển Báo giá ${quote.code} thành Đơn hàng ${newOrder.code}!`, 'success');
    }

    return newOrder.id;
  };

  const createSalesOrder = (
    orderData: Omit<
      SalesOrder,
      'id' | 'code' | 'timeline' | 'paidAmountVnd' | 'outstandingAmountVnd' | 'paymentStatus' | 'status' | 'creditExceededWarning'
    >
  ) => {
    const cust = customers.find((c) => c.id === orderData.customerId);
    const orderCode = `SO-2026-${String(salesOrders.length + 1030).padStart(4, '0')}`;
    const isCreditExceeded = cust ? cust.currentDebtVnd + orderData.totalAmountVnd > cust.creditLimitVnd : false;

    const newOrder: SalesOrder = {
      ...orderData,
      id: `SO-${Date.now()}`,
      code: orderCode,
      paidAmountVnd: 0,
      outstandingAmountVnd: orderData.totalAmountVnd,
      paymentStatus: 'UNPAID',
      status: 'CONFIRMED',
      creditExceededWarning: isCreditExceeded,
      timeline: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          stage: 'CONFIRMED',
          note: 'Tạo đơn hàng mới',
          actor: activeUser.name,
        },
      ],
    };
    setSalesOrders((prev) => [newOrder, ...prev]);
    showToast(`Đã tạo Đơn hàng ${orderCode}!`, 'success');
  };

  // Nguyên tắc 2: Không bán vượt tồn + Giữ hàng / Allocation
  const allocateOrderLots = (
    orderId: string,
    itemAllocations: { productId: string; allocatedLots: { lotId: string; lotCode: string; qty: number }[] }[]
  ) => {
    setSalesOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item) => {
          const alloc = itemAllocations.find((a) => a.productId === item.productId);
          if (!alloc) return item;
          const totalAllocated = alloc.allocatedLots.reduce((acc, curr) => acc + curr.qty, 0);
          return {
            ...item,
            quantityAllocated: totalAllocated,
            allocatedLots: alloc.allocatedLots,
          };
        });

        return {
          ...order,
          items: updatedItems,
          status: 'ALLOCATED',
          timeline: [
            ...order.timeline,
            {
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
              stage: 'ALLOCATED',
              note: 'Đã phân bổ và giữ hàng từ các lô thành phẩm chỉ định',
              actor: activeUser.name,
            },
          ],
        };
      })
    );

    // Cập nhật các Lô thành phẩm (Tăng Reserved, Giảm Available)
    itemAllocations.forEach((alloc) => {
      alloc.allocatedLots.forEach((lotAlloc) => {
        setFinishedGoodsLots((prevLots) =>
          prevLots.map((lot) => {
            if (lot.id === lotAlloc.lotId) {
              const newReserved = lot.reservedQty + lotAlloc.qty;
              const newAvailable = Math.max(0, lot.onHandQty - newReserved);
              return {
                ...lot,
                reservedQty: newReserved,
                availableQty: newAvailable,
              };
            }
            return lot;
          })
        );

        // Cập nhật CommercialProduct tương ứng
        setCommercialProducts((prevProds) =>
          prevProds.map((prod) => {
            if (prod.id === alloc.productId) {
              const newReserved = prod.reserved + lotAlloc.qty;
              const newAvailable = Math.max(0, prod.onHand - newReserved);
              return {
                ...prod,
                reserved: newReserved,
                available: newAvailable,
              };
            }
            return prod;
          })
        );
      });
    });

    showToast('Đã giữ hàng (Reserved) thành công từ kho thành phẩm!', 'success');
  };

  // Tự động phân bổ theo FIFO (First In First Out theo ngày thu hoạch)
  const autoAllocateOrder = (orderId: string) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return;

    const allocations: { productId: string; allocatedLots: { lotId: string; lotCode: string; qty: number }[] }[] = [];

    order.items.forEach((item) => {
      let needed = item.quantityOrdered - item.quantityAllocated;
      if (needed <= 0) return;

      const lotsForProduct = finishedGoodsLots
        .filter((l) => l.productId === item.productId && l.availableQty > 0)
        .sort((a, b) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime());

      const itemLots: { lotId: string; lotCode: string; qty: number }[] = [...item.allocatedLots];

      for (const lot of lotsForProduct) {
        if (needed <= 0) break;
        const take = Math.min(needed, lot.availableQty);
        itemLots.push({ lotId: lot.id, lotCode: lot.lotCode, qty: take });
        needed -= take;
      }

      allocations.push({ productId: item.productId, allocatedLots: itemLots });
    });

    allocateOrderLots(orderId, allocations);
    showToast('Đã tự động phân bổ giữ hàng theo nguyên tắc FIFO (Ngày thu hoạch sớm nhất)!', 'success');
  };

  // Nguyên tắc 3: Tạo giao hàng trực tiếp từ Order
  const createDeliveryFromOrder = (
    orderId: string,
    deliveryData: { vehicle: string; driverName: string; driverPhone: string; plannedDate: string; notes?: string }
  ) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return;

    const delCode = `DEL-2026-${String(deliveries.length + 225).padStart(4, '0')}`;
    const newDelivery: DeliveryNote = {
      id: `DEL-${Date.now()}`,
      code: delCode,
      orderId: order.id,
      orderCode: order.code,
      customerId: order.customerId,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      contactPhone: order.customerPhone,
      plannedDate: deliveryData.plannedDate,
      vehicle: deliveryData.vehicle,
      driverName: deliveryData.driverName,
      driverPhone: deliveryData.driverPhone,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantityToDeliver: item.quantityAllocated || item.quantityOrdered,
        lots: item.allocatedLots,
      })),
      status: 'READY',
      notes: deliveryData.notes,
      timeline: [
        {
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          stage: 'READY',
          note: `Khởi tạo phiếu giao hàng từ đơn hàng ${order.code}`,
        },
      ],
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'PREPARING',
              timeline: [
                ...o.timeline,
                {
                  timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  stage: 'PREPARING',
                  note: `Đã tạo lệnh giao hàng ${delCode}`,
                  actor: activeUser.name,
                },
              ],
            }
          : o
      )
    );

    showToast(`Đã tạo Phiếu giao hàng ${delCode} từ đơn hàng ${order.code}!`, 'success');
  };

  // Xuất kho & Bắt đầu vận chuyển (Picking & Shipping)
  const confirmPickingAndDispatch = (deliveryId: string) => {
    const del = deliveries.find((d) => d.id === deliveryId);
    if (!del) return;

    // Giảm thực tế On Hand và Reserved trong kho thành phẩm
    del.items.forEach((item) => {
      item.lots.forEach((lotItem) => {
        setFinishedGoodsLots((prevLots) =>
          prevLots.map((l) => {
            if (l.id === lotItem.lotId) {
              const newOnHand = Math.max(0, l.onHandQty - lotItem.qty);
              const newReserved = Math.max(0, l.reservedQty - lotItem.qty);
              return {
                ...l,
                onHandQty: newOnHand,
                reservedQty: newReserved,
                availableQty: Math.max(0, newOnHand - newReserved),
              };
            }
            return l;
          })
        );

        setCommercialProducts((prevProds) =>
          prevProds.map((p) => {
            if (p.id === item.productId) {
              const newOnHand = Math.max(0, p.onHand - lotItem.qty);
              const newReserved = Math.max(0, p.reserved - lotItem.qty);
              return {
                ...p,
                onHand: newOnHand,
                reserved: newReserved,
                available: Math.max(0, newOnHand - newReserved),
              };
            }
            return p;
          })
        );
      });
    });

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'SHIPPING',
              timeline: [
                ...d.timeline,
                {
                  time: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  stage: 'SHIPPING',
                  note: `Thủ kho đã xuất hàng lên xe vận chuyển ${d.vehicle}`,
                },
              ],
            }
          : d
      )
    );

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === del.orderId
          ? {
              ...o,
              status: 'SHIPPING',
              timeline: [
                ...o.timeline,
                {
                  timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  stage: 'SHIPPING',
                  note: `Hàng đang được vận chuyển theo phiếu ${del.code}`,
                  actor: activeUser.name,
                },
              ],
            }
          : o
      )
    );

    showToast(`Đã xuất kho và chuyển phiếu ${del.code} sang ĐANG GIAO (SHIPPING)!`, 'success');
  };

  // Xác nhận giao hàng thành công
  const confirmDeliverySuccess = (deliveryId: string, recipientName: string, notes?: string) => {
    const del = deliveries.find((d) => d.id === deliveryId);
    if (!del) return;

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'DELIVERED',
              recipientName,
              actualDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
              notes: notes || d.notes,
              timeline: [
                ...d.timeline,
                {
                  time: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  stage: 'DELIVERED',
                  note: `Giao hàng thành công. Người nhận: ${recipientName}`,
                },
              ],
            }
          : d
      )
    );

    // Cập nhật Order & Công nợ khách hàng
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id === del.orderId) {
          const isFullyPaid = o.paidAmountVnd >= o.totalAmountVnd;
          return {
            ...o,
            status: isFullyPaid ? 'COMPLETED' : 'DELIVERED',
            items: o.items.map((i) => ({ ...i, quantityDelivered: i.quantityOrdered })),
            timeline: [
              ...o.timeline,
              {
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                stage: 'DELIVERED',
                note: `Đã giao đủ hàng cho khách hàng, ký nhận bởi ${recipientName}`,
                actor: del.driverName,
              },
            ],
          };
        }
        return o;
      })
    );

    // Tăng công nợ của khách hàng với số tiền outstanding của đơn
    const order = salesOrders.find((o) => o.id === del.orderId);
    if (order && order.outstandingAmountVnd > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === del.customerId
            ? {
                ...c,
                currentDebtVnd: c.currentDebtVnd + order.outstandingAmountVnd,
                totalOrdersCount: c.totalOrdersCount + 1,
                lastPurchaseDate: new Date().toISOString().split('T')[0],
              }
            : c
        )
      );
    }

    showToast(`Đã xác nhận giao hàng thành công phiếu ${del.code}!`, 'success');
  };

  // Ghi nhận thanh toán & cập nhật công nợ
  const recordSalesPayment = (paymentData: Omit<SalesPayment, 'id' | 'code'>) => {
    const payCode = `PAY-2026-${String(salesPayments.length + 515).padStart(4, '0')}`;
    const newPayment: SalesPayment = {
      ...paymentData,
      id: `PAY-${Date.now()}`,
      code: payCode,
    };
    setSalesPayments((prev) => [newPayment, ...prev]);

    // Giảm nợ cho khách hàng
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === paymentData.customerId
          ? {
              ...c,
              currentDebtVnd: Math.max(0, c.currentDebtVnd - paymentData.amountVnd),
              totalRevenueVnd: c.totalRevenueVnd + paymentData.amountVnd,
            }
          : c
      )
    );

    // Cập nhật Order nếu có orderId
    if (paymentData.orderId) {
      setSalesOrders((prev) =>
        prev.map((o) => {
          if (o.id === paymentData.orderId) {
            const newPaid = o.paidAmountVnd + paymentData.amountVnd;
            const newOut = Math.max(0, o.totalAmountVnd - newPaid);
            const pStatus = newOut === 0 ? 'PAID' : 'PARTIALLY_PAID';
            const oStatus = pStatus === 'PAID' && o.status === 'DELIVERED' ? 'COMPLETED' : o.status;

            return {
              ...o,
              paidAmountVnd: newPaid,
              outstandingAmountVnd: newOut,
              paymentStatus: pStatus,
              status: oStatus,
              timeline: [
                ...o.timeline,
                {
                  timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  stage: 'PAYMENT',
                  note: `Ghi nhận thanh toán ${paymentData.amountVnd.toLocaleString('vi-VN')}đ qua ${paymentData.paymentMethod}`,
                  actor: activeUser.name,
                },
              ],
            };
          }
          return o;
        })
      );
    }

    showToast(`Đã ghi nhận thanh toán ${newPayment.amountVnd.toLocaleString('vi-VN')}đ (${payCode})!`, 'success');
  };

  // Nguyên tắc 4: Khiếu nại truy xuất ngược nguồn gốc tới Harvest và Plants
  const createCustomerClaim = (claimData: Omit<CustomerClaim, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const claimCode = `CLAIM-2026-${String(customerClaims.length + 22).padStart(4, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newClaim: CustomerClaim = {
      ...claimData,
      id: `CLAIM-${Date.now()}`,
      code: claimCode,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    setCustomerClaims((prev) => [newClaim, ...prev]);
    showToast(`Đã tạo hồ sơ khiếu nại ${claimCode} và kích hoạt điều tra nguồn gốc!`, 'warning');
  };

  const updateClaimStatus = (claimId: string, status: CustomerClaim['status'], resolutionOutcome?: string) => {
    setCustomerClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status,
              resolutionOutcome: resolutionOutcome || c.resolutionOutcome,
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : c
      )
    );
    showToast(`Đã cập nhật trạng thái khiếu nại sang ${status}!`, 'info');
  };

  const createSalesReturn = (returnData: Omit<SalesReturn, 'id' | 'code' | 'status'>) => {
    const retCode = `RET-2026-${String(salesReturns.length + 35).padStart(4, '0')}`;
    const newReturn: SalesReturn = {
      ...returnData,
      id: `RET-${Date.now()}`,
      code: retCode,
      status: 'APPROVED',
    };
    setSalesReturns((prev) => [newReturn, ...prev]);
    showToast(`Đã lập phiếu trả hàng ${retCode}!`, 'info');
  };

  const updatePriceListItem = (
    priceListId: string,
    productId: string,
    newPrice: number,
    changedBy: string,
    reason: string
  ) => {
    let oldPrice = 0;
    let prodName = '';
    let plName = '';

    setPriceLists((prev) =>
      prev.map((pl) => {
        if (pl.id !== priceListId) return pl;
        plName = pl.name;
        const updatedItems = pl.items.map((item) => {
          if (item.productId === productId) {
            oldPrice = item.priceVnd;
            prodName = item.productName;
            return { ...item, priceVnd: newPrice };
          }
          return item;
        });
        return { ...pl, items: updatedItems };
      })
    );

    const historyRecord: PriceHistoryRecord = {
      id: `PH-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      priceListId,
      priceListName: plName,
      productId,
      productName: prodName,
      oldPriceVnd: oldPrice,
      newPriceVnd: newPrice,
      changedBy,
      reason,
    };
    setPriceHistory((prev) => [historyRecord, ...prev]);
    showToast(`Đã cập nhật giá mới cho ${prodName}: ${newPrice.toLocaleString('vi-VN')}đ (Lưu lịch sử)!`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        activeFarmId,
        setActiveFarmId,
        farms,
        activeFarm,
        areasTree,
        selectedAreaId,
        setSelectedAreaId,
        plants,
        iotDevices,
        users,
        roles,
        auditLogs,
        settings,
        currentRoute,
        navigate: setCurrentRoute,
        selectedPlant,
        setSelectedPlant,
        selectedDevice,
        setSelectedDevice,
        addFarm,
        updateFarm,
        archiveFarm,
        addUser,
        updateUser,
        toggleLockUser,
        bulkLockUsers,
        bulkAssignRole,
        updateRolePermissions,
        duplicateRole,
        deleteRole,
        updateSettings,
        runBackupNow,
        isBackingUp,
        addAuditLog,
        activeUser,
        setActiveUser,
        feedbackToast,
        showToast,

        // Phân hệ 2
        growthMeasurements,
        tasks,
        nutritionPlans,
        fertilizationLogs,
        irrigationZones,
        envMetrics,
        pestDiseases,
        pesticides,
        diseaseCases,
        harvestBatches,
        lifecycleEvents,
        addPlant,
        updatePlant,
        addGrowthMeasurement,
        completeTask,
        createTask,
        createDiseaseCase,
        updateDiseaseCaseStatus,
        applyTreatmentToCase,
        createHarvestBatch,
        quickSearchPlant,

        // Phân hệ 3
        materials,
        warehouses,
        materialBatches,
        suppliers,
        purchaseOrders,
        stockIssues,
        stockTransfers,
        inventoryCounts,
        farmAssets,
        iotAssets,
        maintenanceRecords,
        calibrationRecords,
        farmExpenses,
        resourceAlerts,
        addMaterial,
        updateMaterial,
        addSupplier,
        updateSupplier,
        createPurchaseOrder,
        receivePurchaseOrder,
        quickDirectPurchase,
        issueStock,
        transferStock,
        submitInventoryCount,
        addFarmAsset,
        updateFarmAsset,
        addIoTAsset,
        installIoTAsset,
        createMaintenanceRecord,
        completeMaintenanceRecord,
        createCalibrationRecord,
        dismissAlert,

        // Phân hệ 4 — IoT & Tự động hóa
        realtimeMetrics,
        automationRules,
        automationExecutions,
        iotAlerts,
        iotEventLogs,
        failsafeRules,
        topologyNodes,
        controlActuator,
        toggleRuleStatus,
        createAutomationRule,
        updateAutomationRule,
        deleteAutomationRule,
        acknowledgeIoTAlert,
        resolveIoTAlert,
        updateDeviceConfig,
        triggerOTAUpdate,
        createMaintenanceFromIoT,

        // Phân hệ 5 — Kinh doanh & Khách hàng
        customers,
        crmActivities,
        commercialProducts,
        classifications,
        finishedGoodsLots,
        priceLists,
        priceRules,
        priceHistory,
        quotations,
        salesOrders,
        deliveries,
        salesPayments,
        debtAging,
        salesReturns,
        customerClaims,
        expectedHarvests,
        addCustomer,
        updateCustomer,
        addCRMActivity,
        performClassification,
        updateCommercialProduct,
        createQuotation,
        updateQuotationStatus,
        convertQuotationToOrder,
        createSalesOrder,
        allocateOrderLots,
        autoAllocateOrder,
        createDeliveryFromOrder,
        confirmPickingAndDispatch,
        confirmDeliverySuccess,
        recordSalesPayment,
        createCustomerClaim,
        updateClaimStatus,
        createSalesReturn,
        updatePriceListItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
