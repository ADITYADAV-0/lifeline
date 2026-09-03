import { Router } from 'express';

const router = Router();

const metrics = {
  activeAmbulances: 42,
  totalIncidentsToday: 189,
  avgResponseTimeMin: 4.8,
  bloodBankReservePct: 87,
  systemHealthScore: 98,
};

const complianceList = [
  {
    id: 'LIC-8821',
    facilityName: 'Central Health Regional Blood Bank',
    type: 'Blood Bank Category A',
    licenseId: 'MED-GOV-2026-9041',
    status: 'COMPLIANT',
    lastInspection: '2026-07-15',
  },
  {
    id: 'LIC-8822',
    facilityName: 'Metro Ambulance Rapid Care Fleet',
    type: 'Emergency EMS Provider',
    licenseId: 'EMS-GOV-2026-1182',
    status: 'COMPLIANT',
    lastInspection: '2026-08-01',
  },
  {
    id: 'LIC-8823',
    facilityName: 'Bay Area Urgent Care Hub',
    type: 'Urgent Care & Triage',
    licenseId: 'UC-GOV-2026-4402',
    status: 'AUDIT_PENDING',
    lastInspection: '2026-04-10',
  },
];

const transactions = [
  {
    id: 'TXN-99104',
    timestamp: '14:20:11',
    facility: 'St. Jude Trauma Center',
    serviceType: 'Emergency Dispatch & O- Blood Transfer',
    amountUsd: 1450.0,
    status: 'SETTLED',
  },
  {
    id: 'TXN-99105',
    timestamp: '14:05:40',
    facility: 'Central Health Regional Blood Bank',
    serviceType: 'Logistics Courier Clearance Token',
    amountUsd: 320.0,
    status: 'SETTLED',
  },
];

const anomalies = [
  {
    id: 'ANOM-102',
    title: 'Surge in O-Negative Emergency Requests',
    severity: 'HIGH',
    description: 'Demand for O-Negative blood increased by 310% in Metro District 4 due to multi-vehicle incident.',
    location: 'District 4 Transit Corridor',
    timestamp: '12 mins ago',
  },
  {
    id: 'ANOM-103',
    title: 'Ambulance Response Time Delay Warning',
    severity: 'MEDIUM',
    description: 'Average response time in North Sector elevated from 4.2 min to 6.8 min due to construction traffic.',
    location: 'North Highway 101 Exit',
    timestamp: '25 mins ago',
  },
];

router.get('/metrics', (_req, res) => {
  res.json({ success: true, metrics });
});

router.get('/compliance', (_req, res) => {
  res.json({ success: true, compliance: complianceList });
});

router.get('/transactions', (_req, res) => {
  res.json({ success: true, transactions });
});

router.get('/anomalies', (_req, res) => {
  res.json({ success: true, anomalies });
});

export default router;
