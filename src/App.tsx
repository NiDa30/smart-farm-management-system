/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppSidebar } from './components/common/AppSidebar';
import { AppTopbar } from './components/common/AppTopbar';

// System Module Screens
import { SystemDashboard } from './modules/system/dashboard/SystemDashboard';
import { FarmList } from './modules/system/farms/FarmList';
import { FarmDetail } from './modules/system/farms/FarmDetail';
import { FarmWizard } from './modules/system/farms/FarmWizard';
import { AreaStructure } from './modules/system/areas/AreaStructure';
import { FarmMap } from './modules/system/map/FarmMap';
import { UserList } from './modules/system/users/UserList';
import { UserDetail } from './modules/system/users/UserDetail';
import { UserForm } from './modules/system/users/UserForm';
import { RoleList } from './modules/system/roles/RoleList';
import { RolePermission } from './modules/system/roles/RolePermission';
import { AuditLog } from './modules/system/audit/AuditLog';
import { SystemSettings } from './modules/system/settings/SystemSettings';

// Production Module Screens (Phân hệ 2 - Sản xuất & Cây trồng)
import { ProductionDashboard } from './modules/production/dashboard/ProductionDashboard';
import { GardenMap } from './modules/production/map/GardenMap';
import { PlantList } from './modules/production/plants/PlantList';
import { PlantDetail } from './modules/production/plants/PlantDetail';
import { PlantForm } from './modules/production/plants/PlantForm';
import { GrowthTracking } from './modules/production/growth/GrowthTracking';
import { TaskManager } from './modules/production/tasks/TaskManager';
import { NutritionManager } from './modules/production/nutrition/NutritionManager';
import { IrrigationManager } from './modules/production/irrigation/IrrigationManager';
import { EnvironmentMonitoring } from './modules/production/environment/EnvironmentMonitoring';
import { DiseaseLibrary } from './modules/production/diseases/DiseaseLibrary';
import { PesticideList } from './modules/production/pesticides/PesticideList';
import { DiseaseCaseManager } from './modules/production/cases/DiseaseCaseManager';
import { HarvestManager } from './modules/production/harvest/HarvestManager';
import { TraceabilityView } from './modules/production/traceability/TraceabilityView';

// Resource & Inventory Module Screens (Phân hệ 3 - Vật tư nông nghiệp)
import { ResourceDashboard } from './modules/resources/dashboard/ResourceDashboard';
import { MaterialList } from './modules/resources/materials/MaterialList';
import { SupplierList } from './modules/resources/suppliers/SupplierList';
import { PurchaseManager } from './modules/resources/purchases/PurchaseManager';
import { InventoryManager } from './modules/resources/inventory/InventoryManager';
import { AssetManager } from './modules/resources/assets/AssetManager';
import { IoTAssetManager } from './modules/resources/iot-devices/IoTAssetManager';

// IoT & Automation Module Screens (Phân hệ 4 - IoT & Tự động hóa)
import { IoTDashboard } from './modules/iot/dashboard/IoTDashboard';
import { DeviceMonitor } from './modules/iot/devices/DeviceMonitor';
import { SensorRealtime } from './modules/iot/realtime/SensorRealtime';
import { HistoricalData } from './modules/iot/history/HistoricalData';
import { PumpControl } from './modules/iot/control/PumpControl';
import { DigitalTwinView } from './modules/iot/digital-twin/DigitalTwinView';
import { AutomationManager } from './modules/iot/automation/AutomationManager';
import { IoTAlertCenter } from './modules/iot/alerts/IoTAlertCenter';
import { IoTTopology } from './modules/iot/topology/IoTTopology';
import { WaterEnergyMonitor } from './modules/iot/resources/WaterEnergyMonitor';
import { SafetyAndEdge } from './modules/iot/safety/SafetyAndEdge';
import { IoTEventLogger } from './modules/iot/events/IoTEventLogger';

// Sales & Commerce Module Screens (Phân hệ 5 - Kinh doanh & Khách hàng)
import { SalesDashboard } from './modules/sales/dashboard/SalesDashboard';
import { CustomerManager } from './modules/sales/customers/CustomerManager';
import { CRMActivityManager } from './modules/sales/crm/CRMActivityManager';
import { ProductCatalog } from './modules/sales/products/ProductCatalog';
import { PostHarvestClassificationView } from './modules/sales/classification/PostHarvestClassification';
import { FinishedGoodsInventoryView } from './modules/sales/inventory/FinishedGoodsInventory';
import { PricingManager } from './modules/sales/pricing/PricingManager';
import { QuotationManager } from './modules/sales/quotations/QuotationManager';
import { OrderManager } from './modules/sales/orders/OrderManager';
import { SupplyPlanningView } from './modules/sales/supply-plan/SupplyPlanningView';
import { DeliveryManager } from './modules/sales/deliveries/DeliveryManager';
import { PaymentAndDebtManager } from './modules/sales/payments/PaymentAndDebtManager';
import { ClaimsAndReturnsManager } from './modules/sales/claims/ClaimsAndReturnsManager';
import { SalesTraceabilityView } from './modules/sales/traceability/SalesTraceabilityView';

// Phân hệ 6 — Báo cáo & Phân tích BI Analytics
import { ExecutiveDashboard } from './modules/analytics/dashboard/ExecutiveDashboard';
import { ProductionAnalytics } from './modules/analytics/production/ProductionAnalytics';
import { IoTResourceAnalytics } from './modules/analytics/iot/IoTResourceAnalytics';
import { ResourceAnalytics } from './modules/analytics/resources/ResourceAnalytics';
import { SalesFinanceAnalytics } from './modules/analytics/sales/SalesFinanceAnalytics';
import { BenchmarkView } from './modules/analytics/benchmark/BenchmarkView';
import { AnomalyCenter } from './modules/analytics/anomalies/AnomalyCenter';
import { ForecastCenter } from './modules/analytics/forecast/ForecastCenter';
import { ReportBuilder } from './modules/analytics/reports/ReportBuilder';
import { ReportsPreview } from './modules/reports/ReportsPreview';

const AppContent: React.FC = () => {
  const { currentRoute, feedbackToast } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Router Dispatcher
  const renderRoute = () => {
    // Exact Dashboard
    if (currentRoute === '/system/dashboard' || currentRoute === '/') {
      return <SystemDashboard />;
    }

    // Farms
    if (currentRoute === '/system/farms/new') {
      return <FarmWizard editMode={false} />;
    }
    if (currentRoute.startsWith('/system/farms/') && currentRoute.endsWith('/edit')) {
      const parts = currentRoute.split('/');
      const farmId = parts[3];
      return <FarmWizard editMode={true} initialFarmId={farmId} />;
    }
    if (currentRoute.startsWith('/system/farms/') && currentRoute !== '/system/farms') {
      return <FarmDetail />;
    }
    if (currentRoute === '/system/farms') {
      return <FarmList />;
    }

    // Areas
    if (currentRoute.startsWith('/system/areas')) {
      return <AreaStructure />;
    }

    // Map
    if (currentRoute.startsWith('/system/map')) {
      return <FarmMap />;
    }

    // Users
    if (currentRoute === '/system/users/new') {
      return <UserForm editMode={false} />;
    }
    if (currentRoute.startsWith('/system/users/') && currentRoute.endsWith('/edit')) {
      const parts = currentRoute.split('/');
      const userId = parts[3];
      return <UserForm editMode={true} userId={userId} />;
    }
    if (currentRoute.startsWith('/system/users/') && currentRoute !== '/system/users') {
      const parts = currentRoute.split('/');
      const userId = parts[3];
      return <UserDetail userId={userId} />;
    }
    if (currentRoute === '/system/users') {
      return <UserList />;
    }

    // Roles & Permissions
    if (currentRoute.startsWith('/system/roles/') && currentRoute !== '/system/roles') {
      const parts = currentRoute.split('/');
      const roleId = parts[3];
      return <RolePermission roleId={roleId} />;
    }
    if (currentRoute === '/system/roles') {
      return <RoleList />;
    }

    // Audit Log
    if (currentRoute.startsWith('/system/audit')) {
      return <AuditLog />;
    }

    // Settings
    if (currentRoute.startsWith('/system/settings')) {
      return <SystemSettings />;
    }

    // ==========================================
    // PHÂN HỆ 2 — SẢN XUẤT & CÂY TRỒNG ROUTES
    // ==========================================
    if (currentRoute === '/production/dashboard' || currentRoute === '/production') {
      return <ProductionDashboard />;
    }
    if (currentRoute === '/production/map') {
      return <GardenMap />;
    }
    if (currentRoute === '/production/plants/new') {
      return <PlantForm editMode={false} />;
    }
    if (currentRoute.startsWith('/production/plants/') && currentRoute.endsWith('/edit')) {
      const parts = currentRoute.split('/');
      const plantId = parts[3];
      return <PlantForm editMode={true} plantId={plantId} />;
    }
    if (currentRoute.startsWith('/production/plants/') && currentRoute !== '/production/plants') {
      const parts = currentRoute.split('/');
      const plantId = parts[3];
      return <PlantDetail plantId={plantId} />;
    }
    if (currentRoute === '/production/plants') {
      return <PlantList />;
    }
    if (currentRoute.startsWith('/production/growth')) {
      return <GrowthTracking />;
    }
    if (currentRoute.startsWith('/production/tasks')) {
      return <TaskManager />;
    }
    if (currentRoute.startsWith('/production/nutrition')) {
      return <NutritionManager />;
    }
    if (currentRoute.startsWith('/production/irrigation')) {
      return <IrrigationManager />;
    }
    if (currentRoute.startsWith('/production/environment')) {
      return <EnvironmentMonitoring />;
    }
    if (currentRoute.startsWith('/production/diseases')) {
      return <DiseaseLibrary />;
    }
    if (currentRoute.startsWith('/production/pesticides')) {
      return <PesticideList />;
    }
    if (currentRoute.startsWith('/production/disease-cases')) {
      return <DiseaseCaseManager />;
    }
    if (currentRoute.startsWith('/production/harvests')) {
      return <HarvestManager />;
    }
    if (currentRoute.startsWith('/production/traceability')) {
      return <TraceabilityView />;
    }

    // ==========================================
    // PHÂN HỆ 3 — VẬT TƯ NÔNG NGHIỆP ROUTES
    // ==========================================
    if (
      currentRoute === '/resources/dashboard' ||
      currentRoute === '/resources' ||
      currentRoute === '/inventory/dashboard' ||
      currentRoute === '/inventory'
    ) {
      return <ResourceDashboard />;
    }
    if (currentRoute.startsWith('/resources/materials')) {
      return <MaterialList />;
    }
    if (currentRoute.startsWith('/resources/suppliers')) {
      return <SupplierList />;
    }
    if (currentRoute.startsWith('/resources/purchases')) {
      return <PurchaseManager />;
    }
    if (currentRoute.startsWith('/resources/inventory')) {
      return <InventoryManager />;
    }
    if (currentRoute.startsWith('/resources/assets')) {
      return <AssetManager />;
    }
    if (currentRoute.startsWith('/resources/iot-devices')) {
      return <IoTAssetManager />;
    }

    // ==========================================
    // PHÂN HỆ 4 — IoT & TỰ ĐỘNG HÓA ROUTES
    // ==========================================
    if (currentRoute === '/iot/dashboard' || currentRoute === '/iot') {
      return <IoTDashboard />;
    }
    if (currentRoute.startsWith('/iot/devices')) {
      return <DeviceMonitor />;
    }
    if (currentRoute.startsWith('/iot/realtime')) {
      return <SensorRealtime />;
    }
    if (currentRoute.startsWith('/iot/history')) {
      return <HistoricalData />;
    }
    if (currentRoute.startsWith('/iot/control')) {
      return <PumpControl />;
    }
    if (currentRoute.startsWith('/iot/digital-twin')) {
      return <DigitalTwinView />;
    }
    if (
      currentRoute.startsWith('/iot/automation') ||
      currentRoute.startsWith('/iot/schedules')
    ) {
      return <AutomationManager />;
    }
    if (currentRoute.startsWith('/iot/alerts')) {
      return <IoTAlertCenter />;
    }
    if (currentRoute.startsWith('/iot/topology')) {
      return <IoTTopology />;
    }
    if (
      currentRoute.startsWith('/iot/resources') ||
      currentRoute.startsWith('/iot/water') ||
      currentRoute.startsWith('/iot/energy')
    ) {
      return <WaterEnergyMonitor />;
    }
    if (
      currentRoute.startsWith('/iot/safety') ||
      currentRoute.startsWith('/iot/edge') ||
      currentRoute.startsWith('/iot/ota') ||
      currentRoute.startsWith('/iot/config')
    ) {
      return <SafetyAndEdge />;
    }
    if (currentRoute.startsWith('/iot/events')) {
      return <IoTEventLogger />;
    }

    // ==========================================
    // PHÂN HỆ 5 — KINH DOANH & KHÁCH HÀNG ROUTES
    // ==========================================
    if (
      currentRoute === '/sales/dashboard' ||
      currentRoute === '/sales' ||
      currentRoute === '/commerce/dashboard' ||
      currentRoute === '/commerce'
    ) {
      return <SalesDashboard />;
    }
    if (currentRoute.startsWith('/sales/customers')) {
      return <CustomerManager />;
    }
    if (currentRoute.startsWith('/sales/crm')) {
      return <CRMActivityManager />;
    }
    if (currentRoute.startsWith('/sales/products')) {
      return <ProductCatalog />;
    }
    if (currentRoute.startsWith('/sales/classification')) {
      return <PostHarvestClassificationView />;
    }
    if (currentRoute.startsWith('/sales/inventory')) {
      return <FinishedGoodsInventoryView />;
    }
    if (
      currentRoute.startsWith('/sales/pricing') ||
      currentRoute.startsWith('/sales/pricing-rules')
    ) {
      return <PricingManager />;
    }
    if (currentRoute.startsWith('/sales/quotations')) {
      return <QuotationManager />;
    }
    if (
      currentRoute.startsWith('/sales/orders') ||
      currentRoute.startsWith('/sales/allocation')
    ) {
      return <OrderManager />;
    }
    if (currentRoute.startsWith('/sales/supply-plan')) {
      return <SupplyPlanningView />;
    }
    if (currentRoute.startsWith('/sales/deliveries')) {
      return <DeliveryManager />;
    }
    if (
      currentRoute.startsWith('/sales/payments') ||
      currentRoute.startsWith('/sales/receivables')
    ) {
      return <PaymentAndDebtManager />;
    }
    if (
      currentRoute.startsWith('/sales/claims') ||
      currentRoute.startsWith('/sales/returns')
    ) {
      return <ClaimsAndReturnsManager />;
    }
    if (currentRoute.startsWith('/sales/traceability')) {
      return <SalesTraceabilityView />;
    }

    // ==========================================
    // PHÂN HỆ 6 — BÁO CÁO & PHÂN TÍCH ROUTES
    // ==========================================
    if (
      currentRoute === '/analytics/dashboard' ||
      currentRoute === '/analytics' ||
      currentRoute === '/reports' ||
      currentRoute === '/reports/dashboard'
    ) {
      return <ExecutiveDashboard />;
    }
    if (
      currentRoute.startsWith('/analytics/production') ||
      currentRoute.startsWith('/analytics/yield') ||
      currentRoute.startsWith('/analytics/growth') ||
      currentRoute.startsWith('/analytics/disease') ||
      currentRoute.startsWith('/analytics/nutrition')
    ) {
      return <ProductionAnalytics />;
    }
    if (
      currentRoute.startsWith('/analytics/iot') ||
      currentRoute.startsWith('/analytics/water') ||
      currentRoute.startsWith('/analytics/energy') ||
      currentRoute.startsWith('/analytics/environment') ||
      currentRoute.startsWith('/analytics/automation')
    ) {
      return <IoTResourceAnalytics />;
    }
    if (
      currentRoute.startsWith('/analytics/resources') ||
      currentRoute.startsWith('/analytics/inventory') ||
      currentRoute.startsWith('/analytics/assets') ||
      currentRoute.startsWith('/analytics/maintenance')
    ) {
      return <ResourceAnalytics />;
    }
    if (
      currentRoute.startsWith('/analytics/sales') ||
      currentRoute.startsWith('/analytics/revenue') ||
      currentRoute.startsWith('/analytics/customers') ||
      currentRoute.startsWith('/analytics/receivables') ||
      currentRoute.startsWith('/analytics/cost') ||
      currentRoute.startsWith('/analytics/profit') ||
      currentRoute.startsWith('/analytics/profitability')
    ) {
      return <SalesFinanceAnalytics />;
    }
    if (currentRoute.startsWith('/analytics/benchmark')) {
      return <BenchmarkView />;
    }
    if (currentRoute.startsWith('/analytics/anomalies')) {
      return <AnomalyCenter />;
    }
    if (currentRoute.startsWith('/analytics/forecast')) {
      return <ForecastCenter />;
    }
    if (
      currentRoute.startsWith('/analytics/reports') ||
      currentRoute.startsWith('/reports/builder')
    ) {
      return <ReportBuilder />;
    }

    return <SystemDashboard />;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7F8] text-slate-800 antialiased font-sans">
      {/* Collapsible Sidebar */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <AppTopbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Scrollable Viewport Frame */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5F7F8]">
          <div className="max-w-7xl mx-auto">{renderRoute()}</div>
        </main>
      </div>

      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border ${
              feedbackToast.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-700'
                : feedbackToast.type === 'info'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-emerald-700 text-white border-emerald-800'
            }`}
          >
            <span>✓ {feedbackToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
