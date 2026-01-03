export type SeatStatus = 'active' | 'buffer' | 'reserved' | 'down' | 'repair';
export type Shift = 'day' | 'night' | 'graveyard';

export interface Seat {
  id: string;
  seatId: string;
  account: string;
  program: string;
  site: string;
  floor: string;
  row: string;
  seatNumber: string;
  shift: Shift;
  agent: string | null;
  pcAssetTag: string;
  headsetId: string;
  phoneId: string;
  monitorId: string;
  networkPort: string;
  vlan: string;
  status: SeatStatus;
  imageVersion: string;
  specs: string;
  antivirusStatus: boolean;
  encryptionStatus: boolean;
  usbPolicyApplied: boolean;
  warrantyExpiry: string;
  lastMaintenance: string;
}

export interface Account {
  id: string;
  clientName: string;
  programName: string;
  totalSeats: number;
  activeSeats: number;
  goLiveDate: string;
  complianceScore: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  seatId?: string;
}

export interface KPIData {
  totalSeats: number;
  activeSeats: number;
  bufferSeats: number;
  downSeats: number;
  utilizationRate: number;
  complianceRate: number;
  assetReadinessRate: number;
  avgDowntimePer100Seats: number;
  costPerSeat: number;
  licenseComplianceRate: number;
}

export const accounts: Account[] = [
  { id: '1', clientName: 'TechCorp Global', programName: 'Customer Support', totalSeats: 450, activeSeats: 428, goLiveDate: '2023-03-15', complianceScore: 98 },
  { id: '2', clientName: 'FinServe Inc', programName: 'Banking Support', totalSeats: 320, activeSeats: 305, goLiveDate: '2022-11-01', complianceScore: 100 },
  { id: '3', clientName: 'HealthFirst', programName: 'Claims Processing', totalSeats: 180, activeSeats: 172, goLiveDate: '2023-06-20', complianceScore: 95 },
  { id: '4', clientName: 'RetailMax', programName: 'Order Management', totalSeats: 275, activeSeats: 260, goLiveDate: '2023-01-10', complianceScore: 97 },
  { id: '5', clientName: 'InsureCo', programName: 'Policy Services', totalSeats: 150, activeSeats: 142, goLiveDate: '2022-08-05', complianceScore: 99 },
];

export const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const statuses: SeatStatus[] = ['active', 'active', 'active', 'active', 'active', 'active', 'buffer', 'reserved', 'down', 'repair'];
  const shifts: Shift[] = ['day', 'night', 'graveyard'];
  const agents = ['John Smith', 'Maria Garcia', 'David Lee', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'James Wilson', 'Lisa Anderson', null];
  
  accounts.forEach((account, accIndex) => {
    for (let i = 0; i < 20; i++) {
      const floor = Math.floor(i / 10) + 1;
      const row = (i % 10) + 1;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      seats.push({
        id: `${accIndex}-${i}`,
        seatId: `ILG-FL${floor}-ROW${row}-S${(i % 12) + 1}`,
        account: account.clientName,
        program: account.programName,
        site: 'ILG Manila',
        floor: `Floor ${floor}`,
        row: `Row ${row}`,
        seatNumber: `S${(i % 12) + 1}`,
        shift: shifts[Math.floor(Math.random() * shifts.length)],
        agent: status === 'active' ? agents[Math.floor(Math.random() * (agents.length - 1))] : null,
        pcAssetTag: `PC-${String(1000 + accIndex * 100 + i).padStart(5, '0')}`,
        headsetId: `HS-${String(2000 + accIndex * 100 + i).padStart(5, '0')}`,
        phoneId: `PH-${String(3000 + accIndex * 100 + i).padStart(5, '0')}`,
        monitorId: `MN-${String(4000 + accIndex * 100 + i).padStart(5, '0')}`,
        networkPort: `NP-${floor}${row}${(i % 12) + 1}`,
        vlan: `VLAN${100 + accIndex}`,
        status,
        imageVersion: `v${account.clientName.substring(0, 2).toUpperCase()}-2024.01`,
        specs: 'Intel i5-12400 / 16GB / 512GB SSD',
        antivirusStatus: Math.random() > 0.05,
        encryptionStatus: Math.random() > 0.03,
        usbPolicyApplied: Math.random() > 0.02,
        warrantyExpiry: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
        lastMaintenance: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      });
    }
  });
  
  return seats;
};

export const seats = generateSeats();

export const alerts: Alert[] = [
  { id: '1', type: 'critical', title: '5 Workstations Down', description: 'Floor 2 experiencing hardware failures', timestamp: '2 min ago', seatId: 'ILG-FL2-ROW3-S12' },
  { id: '2', type: 'critical', title: 'License Expiring', description: 'CRM licenses expire in 3 days (45 seats)', timestamp: '15 min ago' },
  { id: '3', type: 'warning', title: 'EOL Hardware Alert', description: '23 workstations reaching end-of-life', timestamp: '1 hour ago' },
  { id: '4', type: 'warning', title: 'Antivirus Outdated', description: '12 seats with outdated definitions', timestamp: '2 hours ago' },
  { id: '5', type: 'info', title: 'New Hire Batch', description: '35 seats reserved for Monday onboarding', timestamp: '3 hours ago' },
];

export const kpiData: KPIData = {
  totalSeats: 1375,
  activeSeats: 1307,
  bufferSeats: 42,
  downSeats: 8,
  utilizationRate: 95.1,
  complianceRate: 97.8,
  assetReadinessRate: 94.2,
  avgDowntimePer100Seats: 2.3,
  costPerSeat: 245,
  licenseComplianceRate: 99.1,
};

export interface NewHire {
  id: string;
  hiringDate: string;
  requiredSeats: number;
  seatsReady: number;
  seatsPending: number;
  account: string;
  program: string;
  status: 'ready' | 'in-progress' | 'blocked';
}

export const newHires: NewHire[] = [
  { id: '1', hiringDate: '2024-01-15', requiredSeats: 35, seatsReady: 35, seatsPending: 0, account: 'TechCorp Global', program: 'Customer Support', status: 'ready' },
  { id: '2', hiringDate: '2024-01-18', requiredSeats: 20, seatsReady: 15, seatsPending: 5, account: 'FinServe Inc', program: 'Banking Support', status: 'in-progress' },
  { id: '3', hiringDate: '2024-01-22', requiredSeats: 50, seatsReady: 12, seatsPending: 38, account: 'RetailMax', program: 'Order Management', status: 'in-progress' },
  { id: '4', hiringDate: '2024-01-25', requiredSeats: 15, seatsReady: 0, seatsPending: 15, account: 'HealthFirst', program: 'Claims Processing', status: 'blocked' },
];
