import React from 'react';
import { createRoot } from 'react-dom/client';
import { SafetyPanel } from '../../../../src/modules/iot/safety/SafetyAndEdge';
createRoot(document.getElementById('root')!).render(<SafetyPanel navigate={route=>{document.body.dataset.navigation=route;}}/>);
