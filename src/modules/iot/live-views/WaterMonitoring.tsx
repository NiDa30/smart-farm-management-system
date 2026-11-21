import React, { useState } from 'react';
import { Droplets } from 'lucide-react';
import { WaterNodesPanel } from '../nodes/WaterNodesPanel';
import { WaterAlertCenter } from '../alerts/WaterAlertCenter';

/** Water stations (tank level, flow, pressure) with history drill-down, and water alerts. */
export const WaterMonitoring: React.FC = () => {
  const [, setBusy] = useState(false);
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Droplets size={20} />Giám sát nước</h1>
      <WaterNodesPanel />
      <section aria-label="Cảnh báo trạm nước"><WaterAlertCenter onBusyChange={setBusy} /></section>
    </div>
  );
};
