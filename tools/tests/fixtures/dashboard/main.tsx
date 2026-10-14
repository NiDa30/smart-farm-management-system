import React from 'react';
import { createRoot } from 'react-dom/client';
import { IoTOverview } from '../../../../src/modules/iot/dashboard/IoTDashboard';
createRoot(document.getElementById('root')!).render(<IoTOverview navigate={route=>{document.body.dataset.navigation=route;}}/>);
