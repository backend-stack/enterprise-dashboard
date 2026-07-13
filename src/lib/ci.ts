/* Types for the Contextual Intelligence Business Dashboard API (v1).
   All timestamps are unix seconds; phone numbers are raw E.164 (mask in UI). */

export interface CiTenant {
  id: string;
  name: string;
  type: string;
  neighborhood?: string;
  line?: string;
}

export interface CiMessage {
  role: "user" | "assistant";
  text: string;
  customer_phone: string;
  created_at: number;
}

export interface CiReservation {
  name: string;
  party_size: number;
  date: string;
  time: string;
  status: "confirmed" | "cancelled" | string;
  created_at?: number;
}

export interface CiInquiry {
  text?: string;
  request?: string;
  customer_phone?: string;
  created_at?: number;
  [key: string]: unknown;
}

export interface CiData {
  business?: string;
  type?: string;
  messages?: CiMessage[];
  reservations?: CiReservation[];
  inquiries?: CiInquiry[];
}

export interface CiStats {
  conversations?: number;
  messages?: number;
  inbound?: number;
  bookings?: number;
  inquiries?: number;
  converted_customers?: number;
  conversion_rate?: number;
  messages_7d?: number;
  customers_7d?: number;
  latency?: { p50_ms?: number; p95_ms?: number; samples?: number };
  today?: { inbound?: number; reply?: number; block?: number; missed_call?: number };
}

export interface CiCustomer {
  phone: string;
  name?: string;
  first_seen?: number;
  last_seen?: number;
  messages?: number;
  consent?: "ok" | "stopped" | string;
}
