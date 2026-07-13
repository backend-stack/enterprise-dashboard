import "server-only";

/* Linq v3 chats API sandbox - a fully in-memory mock of the partner chat
   endpoints so the dashboard can demo the whole surface without a real
   LINQ_API_KEY or real phone lines:

     POST /v3/chats                              create a chat
     GET  /v3/chats                              list chats
     GET  /v3/chats/{chatId}                     get one chat (with messages)
     PUT  /v3/chats/{chatId}                     update (rename)
     POST /v3/chats/{chatId}/read                mark as read
     POST /v3/chats/{chatId}/leave               leave a group chat
     POST /v3/chats/{chatId}/share_contact_card  share the contact card
     POST /v3/chats/{chatId}/voicememo           send a voice memo

   Four DUMMY tenant accounts are seeded below - fictional businesses, each
   with its own line and conversations. Nothing touches Firestore or Linq;
   state lives in `globalThis` so it survives dev hot-reloads and resets on
   server restart. Outbound sends trigger a canned customer auto-reply a few
   seconds later so the inbox feels alive. */

export interface SandboxTenant {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone_number: string; // the tenant's own iMessage line
}

export type SandboxMessageKind = "text" | "voicememo" | "contact_card";

export interface SandboxMessage {
  id: string;
  kind: SandboxMessageKind;
  text: string;
  duration_seconds: number | null; // voice memos only
  is_from_me: boolean;
  delivery_status: string; // delivered | read | sending
  sent_at: string; // ISO
}

export interface SandboxChat {
  id: string;
  tenant_id: string;
  display_name: string;
  participants: string[]; // handles other than the line itself
  is_group: boolean;
  service: string;
  health_status: { status: string };
  unread_count: number;
  left: boolean;
  created_at: string;
  updated_at: string;
  messages: SandboxMessage[];
}

interface SandboxStore {
  tenants: SandboxTenant[];
  chats: SandboxChat[];
  seq: number;
}

/* ------------------------------------------------------------------ seed */

const TENANTS: SandboxTenant[] = [
  {
    id: "tn_luna_rooftop",
    business_name: "Luna Rooftop Bar",
    contact_name: "Maya Chen",
    email: "maya@lunarooftop.example",
    phone_number: "+12125550141",
  },
  {
    id: "tn_casa_verde",
    business_name: "Casa Verde Kitchen",
    contact_name: "Diego Alvarez",
    email: "diego@casaverde.example",
    phone_number: "+13105550172",
  },
  {
    id: "tn_velvet_room",
    business_name: "The Velvet Room",
    contact_name: "Priya Nair",
    email: "priya@velvetroom.example",
    phone_number: "+17185550119",
  },
  {
    id: "tn_harbor_pine",
    business_name: "Harbor & Pine",
    contact_name: "Sam Whitfield",
    email: "sam@harborpine.example",
    phone_number: "+16175550163",
  },
];

/** Minutes ago → ISO, so seeded threads always look recent. */
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

let seedSeq = 0;
function seedMsg(
  partial: Partial<SandboxMessage> & { text: string; minutesAgo: number }
): SandboxMessage {
  seedSeq += 1;
  return {
    id: `msg_seed_${seedSeq}`,
    kind: partial.kind ?? "text",
    text: partial.text,
    duration_seconds: partial.duration_seconds ?? null,
    is_from_me: partial.is_from_me ?? false,
    delivery_status: partial.is_from_me ? "delivered" : "read",
    sent_at: ago(partial.minutesAgo),
  };
}

function seedChat(
  tenantId: string,
  n: number,
  partial: Partial<SandboxChat> & { participants: string[]; messages: SandboxMessage[] }
): SandboxChat {
  const last = partial.messages[partial.messages.length - 1];
  return {
    id: `chat_${tenantId.replace("tn_", "")}_${n}`,
    tenant_id: tenantId,
    display_name: partial.display_name ?? "",
    participants: partial.participants,
    is_group: partial.is_group ?? partial.participants.length > 1,
    service: "iMessage",
    health_status: { status: partial.health_status?.status ?? "HEALTHY" },
    unread_count: partial.unread_count ?? 0,
    left: false,
    created_at: partial.messages[0]?.sent_at ?? ago(600),
    updated_at: last?.sent_at ?? ago(600),
    messages: partial.messages,
  };
}

function buildSeed(): SandboxStore {
  const chats: SandboxChat[] = [];

  // Every dummy tenant gets the same believable spread: two 1:1 booking
  // threads (one with unread messages) and one group chat.
  const SCRIPTS: Array<{
    solo1: string[];
    solo2: string[];
    group: string[];
    groupName: string;
    handles: [string, string, string, string];
  }> = [
    {
      handles: ["+19175550101", "+19175550102", "+19175550103", "+19175550104"],
      groupName: "Saturday Birthday Party",
      solo1: [
        "Hi! Do you have availability for 4 this Friday around 8?",
        "We do! I can hold a high-top on the terrace for 8pm - want me to book it?",
        "Yes please, name is Jordan.",
        "Done! You're confirmed for Friday 8pm. Reply here if anything changes.",
      ],
      solo2: [
        "Is the rooftop open when it rains?",
        "We have a covered section with heaters - the view still holds up!",
        "Perfect, coming by tonight then.",
      ],
      group: [
        "Hey all - planning Nina's birthday for Saturday, ~10 people.",
        "We'd love to host! Our private corner fits 12, $30pp minimum.",
        "Works for us. 9pm?",
        "9pm it is - I'll send the confirmation and a menu shortly.",
      ],
    },
    {
      handles: ["+13235550111", "+13235550112", "+13235550113", "+13235550114"],
      groupName: "Rehearsal Dinner",
      solo1: [
        "Do you take reservations for brunch?",
        "We sure do - parties of any size Saturday and Sunday from 10am.",
        "Great, 2 people this Sunday 11am please!",
        "Booked! See you Sunday at 11.",
      ],
      solo2: [
        "Any vegan options on the tasting menu?",
        "Yes - the chef runs a full vegan tasting on request, just flag it when booking.",
      ],
      group: [
        "Hi! We're looking at your patio for a rehearsal dinner of 16.",
        "Congrats! The patio seats 20 - want me to send the group dining packet?",
        "Yes please, and wine pairing options too.",
        "Sent! Check your email - happy to hold a date while you decide.",
      ],
    },
    {
      handles: ["+16465550121", "+16465550122", "+16465550123", "+16465550124"],
      groupName: "Jazz Night Table",
      solo1: [
        "What time does the live set start on Thursdays?",
        "Doors 7, first set 8:30. Table minimums apply up front.",
        "Can I get 2 seats at the bar instead?",
        "Bar is first-come, but arrive before 8 and you're golden.",
      ],
      solo2: [
        "Lost a scarf there last night - navy cashmere?",
        "Found it! It's at the host stand under 'scarf, excellent taste'.",
        "Amazing, picking it up tonight. Thank you!",
      ],
      group: [
        "Six of us for jazz night Friday - can we sit together?",
        "Absolutely, I'll block the round booth by the stage.",
        "You're the best. Card on file same as last time.",
      ],
    },
    {
      handles: ["+18575550131", "+18575550132", "+18575550133", "+18575550134"],
      groupName: "Team Offsite Dinner",
      solo1: [
        "Do you have parking nearby?",
        "Public lot on Rowes Wharf, and we validate for 2 hours.",
        "Perfect - table for 2 at 7 tonight?",
        "Confirmed for 7pm. See you soon!",
      ],
      solo2: [
        "Is the oyster happy hour still running?",
        "Every weekday 4-6, $2 East Coasts at the raw bar.",
      ],
      group: [
        "Looking to book a team dinner for 14 next Wednesday.",
        "We can do the harbor-view long table at 7 - prix fixe or a la carte?",
        "Prix fixe, one veg. Also two gluten-free.",
        "Noted all three - confirmation heading to your email now.",
      ],
    },
  ];

  TENANTS.forEach((t, i) => {
    const s = SCRIPTS[i];
    const [h1, h2, h3, h4] = s.handles;

    chats.push(
      seedChat(t.id, 1, {
        participants: [h1],
        messages: s.solo1.map((text, m) =>
          seedMsg({ text, is_from_me: m % 2 === 1, minutesAgo: 60 * 26 - m * 9 })
        ),
      }),
      seedChat(t.id, 2, {
        participants: [h2],
        unread_count: 1,
        health_status: { status: i === 2 ? "AT_RISK" : "HEALTHY" },
        messages: s.solo2.map((text, m) =>
          seedMsg({ text, is_from_me: m % 2 === 1, minutesAgo: 60 * 3 - m * 12 })
        ),
      }),
      seedChat(t.id, 3, {
        display_name: s.groupName,
        participants: [h3, h4, h1],
        is_group: true,
        messages: s.group.map((text, m) =>
          seedMsg({ text, is_from_me: m % 2 === 1, minutesAgo: 60 * 49 - m * 14 })
        ),
      })
    );
  });

  return { tenants: TENANTS, chats, seq: 1 };
}

/* ------------------------------------------------------------------ store */

const g = globalThis as typeof globalThis & { __linqSandbox?: SandboxStore };

function store(): SandboxStore {
  if (!g.__linqSandbox) g.__linqSandbox = buildSeed();
  return g.__linqSandbox;
}

function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}_${s.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function touch(chat: SandboxChat): void {
  chat.updated_at = new Date().toISOString();
}

const AUTO_REPLIES = [
  "Got it, thank you!",
  "Perfect, that works for us.",
  "Amazing - see you then! 🙌",
  "Thanks for the quick reply!",
  "Sounds great, appreciate it.",
];

/** A canned customer reply lands a few seconds after any outbound send,
    bumping the unread count - keeps the sandbox inbox feeling live. */
function scheduleAutoReply(chatId: string): void {
  const delay = 4_000 + Math.floor(Math.random() * 4_000);
  setTimeout(() => {
    const chat = store().chats.find((c) => c.id === chatId);
    if (!chat || chat.left) return;
    chat.messages.push({
      id: nextId("msg"),
      kind: "text",
      text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
      duration_seconds: null,
      is_from_me: false,
      delivery_status: "delivered",
      sent_at: new Date().toISOString(),
    });
    chat.unread_count += 1;
    touch(chat);
  }, delay);
}

/* ------------------------------------------------------------- operations */

export class SandboxError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function listTenants(): SandboxTenant[] {
  return store().tenants;
}

export function resolveTenant(tenantId: string | null): SandboxTenant {
  const tenants = store().tenants;
  const t = tenantId ? tenants.find((x) => x.id === tenantId) : tenants[0];
  if (!t) throw new SandboxError(404, `Unknown tenant: ${tenantId}`);
  return t;
}

/** Chat without its message array - the list/detail envelope shape. */
export function chatSummary(c: SandboxChat): Omit<SandboxChat, "messages"> {
  const { messages: _messages, ...rest } = c;
  return rest;
}

/** GET /v3/chats */
export function listChats(tenantId: string): SandboxChat[] {
  return store()
    .chats.filter((c) => c.tenant_id === tenantId)
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
}

/** GET /v3/chats/{chatId} */
export function getChat(tenantId: string, chatId: string): SandboxChat {
  const chat = store().chats.find((c) => c.id === chatId && c.tenant_id === tenantId);
  if (!chat) throw new SandboxError(404, `Chat not found: ${chatId}`);
  return chat;
}

/** POST /v3/chats */
export function createChat(
  tenantId: string,
  input: { participants: string[]; display_name?: string; message?: string }
): SandboxChat {
  const participants = (input.participants ?? [])
    .map((p) => String(p).trim())
    .filter(Boolean);
  if (!participants.length) {
    throw new SandboxError(422, "At least one participant handle is required.");
  }
  const now = new Date().toISOString();
  const chat: SandboxChat = {
    id: nextId("chat"),
    tenant_id: tenantId,
    display_name: String(input.display_name ?? "").trim(),
    participants,
    is_group: participants.length > 1,
    service: "iMessage",
    health_status: { status: "HEALTHY" },
    unread_count: 0,
    left: false,
    created_at: now,
    updated_at: now,
    messages: [],
  };
  const text = String(input.message ?? "").trim();
  if (text) {
    chat.messages.push({
      id: nextId("msg"),
      kind: "text",
      text,
      duration_seconds: null,
      is_from_me: true,
      delivery_status: "delivered",
      sent_at: now,
    });
    scheduleAutoReply(chat.id);
  }
  store().chats.push(chat);
  return chat;
}

/** PUT /v3/chats/{chatId} */
export function updateChat(
  tenantId: string,
  chatId: string,
  input: { display_name?: string }
): SandboxChat {
  const chat = getChat(tenantId, chatId);
  if (typeof input.display_name === "string") {
    chat.display_name = input.display_name.trim();
  }
  touch(chat);
  return chat;
}

/** POST /v3/chats/{chatId}/read */
export function markChatRead(tenantId: string, chatId: string): SandboxChat {
  const chat = getChat(tenantId, chatId);
  chat.unread_count = 0;
  chat.messages.forEach((m) => {
    if (!m.is_from_me) m.delivery_status = "read";
  });
  return chat;
}

/** POST /v3/chats/{chatId}/leave */
export function leaveChat(tenantId: string, chatId: string): SandboxChat {
  const chat = getChat(tenantId, chatId);
  if (!chat.is_group) {
    throw new SandboxError(422, "Only group chats can be left.");
  }
  chat.left = true;
  touch(chat);
  return chat;
}

/** POST /v3/chats/{chatId}/share_contact_card */
export function shareContactCard(tenantId: string, chatId: string): SandboxMessage {
  const chat = getChat(tenantId, chatId);
  if (chat.left) throw new SandboxError(422, "You have left this chat.");
  const tenant = resolveTenant(tenantId);
  const msg: SandboxMessage = {
    id: nextId("msg"),
    kind: "contact_card",
    text: `${tenant.business_name} · ${tenant.contact_name} · ${tenant.phone_number}`,
    duration_seconds: null,
    is_from_me: true,
    delivery_status: "delivered",
    sent_at: new Date().toISOString(),
  };
  chat.messages.push(msg);
  touch(chat);
  scheduleAutoReply(chat.id);
  return msg;
}

/** POST /v3/chats/{chatId}/voicememo */
export function sendVoiceMemo(
  tenantId: string,
  chatId: string,
  input: { duration_seconds?: number; transcript?: string }
): SandboxMessage {
  const chat = getChat(tenantId, chatId);
  if (chat.left) throw new SandboxError(422, "You have left this chat.");
  const duration = Math.max(1, Math.min(300, Math.round(Number(input.duration_seconds) || 12)));
  const msg: SandboxMessage = {
    id: nextId("msg"),
    kind: "voicememo",
    text:
      String(input.transcript ?? "").trim() ||
      "Hey! Quick voice note about your booking - everything is set on our end, see you soon!",
    duration_seconds: duration,
    is_from_me: true,
    delivery_status: "delivered",
    sent_at: new Date().toISOString(),
  };
  chat.messages.push(msg);
  touch(chat);
  scheduleAutoReply(chat.id);
  return msg;
}
