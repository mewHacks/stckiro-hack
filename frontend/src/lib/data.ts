// ponytail: mock data until the Flask backend exposes /api/*

export type VaultItem = {
  id: "medical" | "passport" | "id" | "cash" | "beacon";
  name: string;
  note: string;
  fields: [string, string][]; // shown in the detail panel
  sub: string; // printed on the 3D item
  bg: string;
  fg: string;
  size: [number, number, number]; // w, h, thickness
  x: number;
  z: number;
};

export const ITEMS: VaultItem[] = [
  // positions fit the backpack interior (≈1.1 wide × 0.5 deep), back row z<0, front row z>0
  { id: "medical", name: "Medical Record", note: "Blood type O+ · Asthma inhaler", fields: [["Blood type","O+"],["Conditions","Asthma"],["Allergies","Penicillin"],["Medication","Inhaler (in bag)"],["Doctor","Dr. Tan · +60 3-1234 5678"]], sub: "MEDICAL", bg: "#fff4e0", fg: "#c2410c", size: [0.42, 0.7, 0.04], x: -0.3, z: -0.13 },
  { id: "passport", name: "Passport", note: "Expires 2031 · Scan synced", fields: [["Holder","Aisyah Rahman"],["Passport no.","A12345678"],["Nationality","Malaysian"],["Expires","14 Mar 2031"],["Digital copy","Synced"]], sub: "PASSPORT", bg: "#1e2a5a", fg: "#f5d27a", size: [0.34, 0.5, 0.04], x: 0.13, z: -0.13 },
  { id: "cash", name: "Emergency Cash", note: "RM 500 in sealed sleeve", fields: [["Amount","RM 500"],["Notes","5 × RM 100"],["Packing","Sealed waterproof sleeve"],["Last checked","3 days ago"]], sub: "RM 500", bg: "#d9f5e3", fg: "#15803d", size: [0.36, 0.4, 0.1], x: 0.26, z: 0.12 },
  { id: "id", name: "Identity Card", note: "MyKad · Birth certificate copy", fields: [["Holder","Aisyah Rahman"],["MyKad no.","•••••• -••-••12"],["Includes","Birth certificate copy"],["Digital copy","Synced"]], sub: "ID CARD", bg: "#eef4ff", fg: "#2548d4", size: [0.44, 0.28, 0.04], x: -0.24, z: 0.12 },
  { id: "beacon", name: "FloodMesh Beacon", note: "Built into the front pocket · swappable battery", fields: [["GPS","Locked · 3 m"],["Mesh nodes","4 in range"],["Firmware","v0.4.2"],["LastSignal","Armed at 5%"]], sub: "BEACON", bg: "#0b1530", fg: "#7dd3fc", size: [0.2, 0.26, 0.12], x: 0.43, z: -0.13 },
];

export type Status = "Pending" | "Assigned" | "Rescued";
export type Request = {
  id: string;
  name: string;
  area: string;
  people: number;
  severity: 1 | 2 | 3;
  last: string;
  status: Status;
  via: "internet" | "mesh"; // how the SOS reached us
  x: number; // map coords, viewBox 400x500; 100 units ≈ 1 km
  y: number;
};

export const REQUESTS: Request[] = [
  { id: "FS-2041", name: "Aisyah R.", area: "Taman Sri Muda", people: 4, severity: 3, last: "1m ago", status: "Pending", via: "mesh", x: 150, y: 210 },
  { id: "FS-1187", name: "Kumar S.", area: "Jalan Sentosa", people: 2, severity: 3, last: "3m ago", status: "Pending", via: "mesh", x: 175, y: 240 },
  { id: "FS-0932", name: "Lim W.", area: "Kg. Baru Hilir", people: 1, severity: 2, last: "6m ago", status: "Assigned", via: "internet", x: 255, y: 300 },
  { id: "FS-3310", name: "Nurul H.", area: "Taman Sri Muda", people: 3, severity: 2, last: "9m ago", status: "Pending", via: "mesh", x: 130, y: 250 },
  { id: "FS-0458", name: "Tan K.", area: "Seksyen 25", people: 5, severity: 1, last: "14m ago", status: "Rescued", via: "internet", x: 300, y: 160 },
  { id: "FS-2210", name: "Farid A.", area: "Taman Sri Muda", people: 6, severity: 3, last: "2m ago", status: "Pending", via: "mesh", x: 110, y: 300 },
  { id: "FS-1903", name: "Mei Ling C.", area: "Kg. Baru Hilir", people: 2, severity: 2, last: "4m ago", status: "Pending", via: "internet", x: 230, y: 330 },
  { id: "FS-0771", name: "Ravi P.", area: "Jalan Sentosa", people: 1, severity: 1, last: "7m ago", status: "Pending", via: "internet", x: 200, y: 200 },
  { id: "FS-3055", name: "Siti Z.", area: "Bukit Rimau", people: 3, severity: 2, last: "11m ago", status: "Pending", via: "mesh", x: 60, y: 420 },
  { id: "FS-1420", name: "Hafiz M.", area: "Seksyen 25", people: 2, severity: 1, last: "18m ago", status: "Assigned", via: "internet", x: 340, y: 210 },
];

/** Where a live SOS from the demo phone lands on the map. */
export const LIVE_POS = { x: 125, y: 345 };

export const RESCUERS = [
  { id: "Alpha", x: 90, y: 380 },
  { id: "Bravo", x: 320, y: 90 },
];

/** Profile photo for a victim; the live demo SOS comes from FS-2041's phone. */
export const avatar = (id: string) => `/people/${id.startsWith("LIVE") ? "FS-2041" : id}.jpg`;

// Map coords → real coordinates around Shah Alam / Klang (100 map units ≈ 1 km)
const CENTER = { lat: 3.0738, lng: 101.5183 };
export const MAP_CENTER = CENTER;
export const toLatLng = (x: number, y: number) => ({
  lat: CENTER.lat - (y - 250) / 100 / 111.32,
  lng: CENTER.lng + (x - 200) / 100 / (111.32 * Math.cos((CENTER.lat * Math.PI) / 180)),
});
