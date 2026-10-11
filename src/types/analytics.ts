export type AnalyticsTimeRange =
  | 'TODAY'
  | '7_DAYS'
  | '30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export type ComparisonType =
  | 'PREVIOUS_PERIOD'
  | 'SAME_PERIOD_LAST_YEAR'
  | 'OTHER_ZONE'
  | 'OTHER_VARIETY'
  | 'NONE';

export type DataSourceType =
  | 'IOT_SENSOR'
  | 'MANUAL_ENTRY'
  | 'INVENTORY_TX'
  | 'SALES_ORDER'
  | 'HARVEST_LOG'
  | 'FINANCIAL_LEDGER'
  | 'AI_INFERENCE';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnomalyStatus = 'NEW' | 'REVIEWING' | 'CONFIRMED' | 'DISMISSED' | 'RESOLVED';

export interface GlobalFilterState {
  farmId: string;
  zoneId: string;
  cropId: string;
  varietyId: string;
  timeRange: AnalyticsTimeRange;
  customStartDate?: string;
  customEndDate?: string;
  comparisonType: ComparisonType;
  compareWithId?: string;
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  changePercent?: number;
  isPositiveChange?: boolean;
  comparisonBaseline?: string;
  formulaTooltip?: string;
  dataSource: DataSourceType;
  isEstimated?: boolean;
  statusColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  drilldownRoute?: string;
}

export interface AreaHealthScore {
  id: string;
  name: string;
  code: string;
  areaHa: number;
  totalPlants: number;
  healthyPlants: number;
  watchPlants: number;
  sickPlants: number;
  healthPercent: number;
  healthStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
  currentYieldKgPerHa: number;
  waterUsagePerKg: number; // L/kg
  activeDiseaseCases: number;
  openAlertsCount: number;
  anomalyFlag?: boolean;
  anomalyNote?: string;
}

export interface TreeRankingItem {
  id: string;
  code: string;
  name: string;
  variety: string;
  ageYears: number;
  zoneName: string;
  rowName: string;
  health: 'NORMAL' | 'WATCH' | 'SICK';
  growthRateScore: number; // %
  annualYieldFruits: number;
  annualCostVnd: number;
  annualProfitVnd: number;
  isOutlier?: boolean;
}

export interface AnomalyItem {
  id: string;
  code: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  objectType: 'PLANT' | 'ZONE' | 'DEVICE' | 'MATERIAL' | 'ORDER' | 'SYSTEM';
  objectId: string;
  objectName: string;
  metric: string;
  currentValue: string;
  normalRange: string;
  deviationPercent: number;
  confidenceScore: number; // 0 - 100%
  detectedAt: string;
  explanation: string;
  evidenceData: {
    label: string;
    value: string;
    correlationNote?: string;
  }[];
  recommendedAction: string;
  targetModuleRoute: string;
  targetModuleActionLabel: string;
}

export interface BenchmarkComparisonItem {
  key: string;
  label: string;
  unit: string;
  valA: number | string;
  valB: number | string;
  deltaPercent: number;
  winner: 'A' | 'B' | 'EQUAL' | 'NONE';
  insight: string;
  isPotentialEfficiencyIssue?: boolean;
}

export interface ForecastModelData {
  targetMetric: string;
  projectionLabel: string;
  expectedMin: number;
  expectedMax: number;
  expectedMean: number;
  unit: string;
  confidenceRate: number; // e.g. 82%
  trainingPeriodMonths: number;
  drivers: string[];
  historicalSeries: { period: string; value: number }[];
  forecastSeries: { period: string; expected: number; lower: number; upper: number }[];
  actionRecommendation: string;
  reorderDaysRemaining?: number;
  materialStockWarning?: boolean;
}

export interface CustomReportConfig {
  id: string;
  name: string;
  description: string;
  dataSource: 'PLANTS' | 'GROWTH' | 'DISEASE' | 'IOT' | 'INVENTORY' | 'SALES' | 'FINANCE';
  metrics: string[];
  dimensions: string[];
  filterZone?: string;
  filterTime?: string;
  chartType: 'TABLE' | 'BAR' | 'LINE' | 'AREA' | 'PIE' | 'HEATMAP';
  schedule?: {
    enabled: boolean;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    deliveryEmail: string;
    format: 'PDF' | 'EXCEL' | 'CSV';
  };
  createdAt: string;
  createdBy: string;
}
