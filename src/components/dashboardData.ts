interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
}

interface Campaign {
  id: string;
  name: string;
  clientCount: number;
  date: string;
}

export const MOCK_CLIENTS: Client[] = [
  { id: "1", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "2", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "3", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "4", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "5", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "1", name: "Beauty Salons Miami FL", clientCount: 60, date: "04.04.2021 - 10:12AM" },
  { id: "2", name: "Chris beauty hair salon", clientCount: 202, date: "04.04.2021 - 10:40AM" },
  { id: "3", name: "Beauty Salons Miami FL", clientCount: 60, date: "04.04.2021 - 10:12AM" },
  { id: "4", name: "Chris beauty hair salon", clientCount: 202, date: "04.04.2021 - 10:40AM" },
  { id: "5", name: "Beauty Salons Miami FL", clientCount: 60, date: "04.04.2021 - 10:12AM" },
];

