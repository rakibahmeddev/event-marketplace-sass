import 'server-only';

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { fromFirestore } from '@/lib/firestore/convert';
import { orderDocSchema, ticketDocSchema, type Order, type Ticket } from './schema';

const orders = (t: string) => adminDb().collection(`tenants/${t}/orders`);
const tickets = (t: string) => adminDb().collection(`tenants/${t}/tickets`);

function parseOrder(id: string, data: unknown): Order | null {
  const p = orderDocSchema.safeParse(fromFirestore(data));
  if (!p.success) {
    console.error(`order ${id} failed validation`, p.error.issues);
    return null;
  }
  return { id, ...p.data };
}

function parseTicket(id: string, data: unknown): Ticket | null {
  const p = ticketDocSchema.safeParse(fromFirestore(data));
  return p.success ? { id, ...p.data } : null;
}

export const getOrder = cache(async (tenantId: string, orderId: string): Promise<Order | null> => {
  if (!/^[A-Za-z0-9]{1,40}$/.test(orderId)) return null;
  const s = await orders(tenantId).doc(orderId).get();
  return s.exists ? parseOrder(s.id, s.data()) : null;
});

export async function listBuyerOrders(tenantId: string, buyerUid: string, limit = 50): Promise<Order[]> {
  const snap = await orders(tenantId)
    .where('buyerUid', '==', buyerUid)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => parseOrder(d.id, d.data())).filter((o): o is Order => !!o);
}

export async function listOrganizerOrders(
  tenantId: string,
  organizerId: string,
  limit = 200,
): Promise<Order[]> {
  const snap = await orders(tenantId)
    .where('organizerId', '==', organizerId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => parseOrder(d.id, d.data())).filter((o): o is Order => !!o);
}

export async function listOrderTickets(tenantId: string, orderIds: string[]): Promise<Ticket[]> {
  const out: Ticket[] = [];
  for (let i = 0; i < orderIds.length; i += 30) {
    const snap = await tickets(tenantId)
      .where('orderId', 'in', orderIds.slice(i, i + 30))
      .get();
    for (const d of snap.docs) {
      const t = parseTicket(d.id, d.data());
      if (t) out.push(t);
    }
  }
  return out;
}

export async function getTicket(tenantId: string, ticketId: string): Promise<Ticket | null> {
  if (!/^[A-Za-z0-9]{1,40}$/.test(ticketId)) return null;
  const s = await tickets(tenantId).doc(ticketId).get();
  return s.exists ? parseTicket(s.id, s.data()) : null;
}
