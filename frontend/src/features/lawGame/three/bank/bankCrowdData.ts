import { CHEATING, CHEQUE_BOUNCE, CONSPIRACY, CUSTOMER_LIABILITY, FAKE_NOTES, FORGERY, IDENTITY_THEFT, KYC, LAUNDERING, LAUNDERING_PENALTY, PERSONATION, PONZI, BANK_RECORDS, BREACH_OF_TRUST } from '../../data/case4.ts'
import type { LawRef } from '../../types.ts'
import { AXIS_X, ROPE_Z, SECURITY_DESK, TABLE, type Spot } from './bankLayout.ts'

export type Activity = 'walk' | 'stand' | 'chat' | 'sit' | 'teller' | 'queue' | 'guard' | 'mop' | 'write'
export type Carry = 'folder' | 'phone' | 'bag' | 'mop' | 'paper'

export interface PersonLook {
  skin: string
  hair: string
  shirt: string
  trousers: string
  /** A sari or long dress. */
  dress?: boolean
  /** Scales the whole figure. */
  height: number
  carry?: Carry
}

export interface PersonRole {
  name: string
  line: string
  law?: LawRef
}

export interface PersonDef {
  act: Activity
  look: PersonLook
  role: PersonRole
  /** Walks this loop, or stays at its first point if it has only one. */
  path: readonly Spot[]
  speed?: number
  yaw?: number
  /** Which queue they stand in, if any. */
  line?: number
  /** Ties them to a suspect in the case: they use that suspect's looks and words. */
  suspectId?: string
}

/** A line of customers at a counter. The front customer is served, walks round to the back, and everyone shuffles up. */
export interface QueueLine {
  /** Where the customer being served stands. */
  head: Spot
  /** From the head, towards the back of the line. */
  back: Spot
  /** Which side they walk down on their way to the back. */
  side: Spot
  counter: number
}

export const QUEUE_SPACING = 0.86
export const QUEUES: readonly QueueLine[] = [
  { head: [5.05, 18.3], back: [1, 0], side: [0, 1], counter: 2 },
  { head: [-9.6, 18.3], back: [-1, 0], side: [0, 1], counter: 4 },
  { head: [-3.4, -16.65], back: [0, -1], side: [-1, 0], counter: 8 },
  { head: [5.15, -8.1], back: [1, 0], side: [0, -1], counter: 11 },
]

const SKIN = ['#e0ac86', '#c68a62', '#b57a54', '#d6a07a', '#a86f4c', '#8f5f40']
const HAIR = ['#171717', '#1d1612', '#2a1a14', '#3a3a3f', '#55524e']
const SHIRTS = ['#f2efe6', '#a9c4de', '#d9d2c2', '#8c2f39', '#2f6f9e', '#5fb88c', '#c98a3a', '#7a6cc0', '#e8d9b8', '#3f4a5a']
const TROUSERS = ['#23262f', '#2f3444', '#4a4034', '#1f2a3d', '#55524e', '#3a2f28']
const skin = (i: number) => SKIN[i % SKIN.length]
const hair = (i: number) => HAIR[i % HAIR.length]
const shirt = (i: number) => SHIRTS[i % SHIRTS.length]
const trousers = (i: number) => TROUSERS[i % TROUSERS.length]

const CUSTOMER_LINES: PersonRole[] = [
  { name: 'Customer', line: 'A man offered me ₹10,000 just to use my account for a week. Lending out your account like that is how mule accounts work. I said no.', law: LAUNDERING },
  { name: 'Customer', line: 'Someone called pretending to be from the bank and asked for my OTP. The bank never asks for it. That caller is committing a crime.', law: PERSONATION },
  { name: 'Customer', line: 'Money left my account while I was asleep. I told the bank that same morning. Report it within three working days, and you are far better protected.', law: CUSTOMER_LIABILITY },
  { name: 'Customer', line: 'My tenant’s cheque bounced. It can mean up to two years in prison, but the law gives him a notice and a chance to pay first.', law: CHEQUE_BOUNCE },
  { name: 'Customer', line: 'My neighbour put everything in a scheme promising 30 percent a month. Those schemes are banned by law. If it sounds too good, walk away.', law: PONZI },
  { name: 'Customer', line: 'I am only here to update my KYC. It is boring, but it is how banks keep fake accounts out.', law: KYC },
  { name: 'Customer', line: 'They checked a ₹500 note under the lamp and it was fake. Knowingly passing one on is a serious offence. Hand it in, do not spend it.', law: FAKE_NOTES },
  { name: 'Customer', line: 'Cyber fraud? Dial 1930 at once. The sooner you call, the better the chance of stopping the money.', law: CUSTOMER_LIABILITY },
  { name: 'Customer', line: 'Why do they ask so many questions about a big cash deposit? Because they have to report it. Honest money has nothing to fear from that.', law: BANK_RECORDS },
]
const STAFF_LINES: PersonRole[] = [
  { name: 'Teller', line: 'Every cash transaction above ₹10 lakh goes in a report. Break it into small pieces and we still have to report it as suspicious.', law: BANK_RECORDS },
  { name: 'Teller', line: 'Please do not share your password with a colleague, even for a minute. Using someone else’s login is identity theft.', law: IDENTITY_THEFT },
  { name: 'Teller', line: 'A forged signature on a cheque is far more serious than people think. The law treats a cheque as a valuable security.', law: FORGERY },
  { name: 'Teller', line: 'Your money is entrusted to us. A banker who misuses it is looking at up to life imprisonment.', law: BREACH_OF_TRUST },
  { name: 'Teller', line: 'If someone talks you into handing over money with a false story, that is cheating, however polite they were.', law: CHEATING },
  { name: 'Teller', line: 'Token number, please. And thank you for waiting. It is a strange morning here.' },
]
const customer = (i: number) => CUSTOMER_LINES[i % CUSTOMER_LINES.length]
const staff = (i: number) => STAFF_LINES[i % STAFF_LINES.length]

const AUDITOR: PersonRole = { name: 'Bank auditor', line: 'Nobody touches this table. The money moved in pieces, through people who think they only lent a name. All of them can be charged with conspiracy.', law: CONSPIRACY }
const OFFICER: PersonRole = { name: 'Enforcement officer', line: 'Money laundering can mean at least three and up to seven years of rigorous imprisonment. The money itself can be attached too, so it pays to follow it.', law: LAUNDERING_PENALTY }
const GUARD: PersonRole = { name: 'Security guard', line: 'The strongroom stairs are staff only. The camera feeds are over at the security desk by the west wing, if anyone needs a look.' }
const CLEANER: PersonRole = { name: 'Cleaner', line: 'A man asked me to open an account and give him the passbook, for ₹3,000. I told the manager. My name will not be on anyone’s crime.', law: LAUNDERING }

/** Tellers sit behind each window of the two counters, facing the customers. */
const tellerAt = (x: number, z: number, yaw: number, i: number): PersonDef => ({
  act: 'teller',
  look: { skin: skin(i + 2), hair: hair(i), shirt: i % 3 === 0 ? '#27344f' : shirt(i % 2 ? 0 : 1), trousers: trousers(i), dress: i % 3 === 1, height: 0.96 + (i % 3) * 0.02 },
  role: staff(i),
  path: [[x, z]],
  yaw,
})

const EAST = Math.PI / 2
const WEST = -Math.PI / 2
const SOUTH = 0
const NORTH = Math.PI

const tellers: PersonDef[] = [
  tellerAt(3.05, 13.9, EAST, 0),
  tellerAt(3.0, 18.3, EAST, 1),
  tellerAt(1, 20.35, SOUTH, 2),
  tellerAt(-7.55, 18.3, WEST, 3),
  tellerAt(-7.55, 13.9, WEST, 4),
  tellerAt(-7.55, -8.1, WEST, 5),
  tellerAt(-7.6, -12.5, WEST, 6),
  tellerAt(-5.6, -14.55, NORTH, 7),
  tellerAt(-3.4, -14.55, NORTH, 8),
  tellerAt(-1.2, -14.55, NORTH, 9),
  tellerAt(3.05, -8.1, EAST, 10),
]

/** Everyone starts in the order the queue system expects, front first. */
const queuers: PersonDef[] = QUEUES.flatMap((q, line) =>
  [0, 1, 2, 3].map((slot) => {
    const i = line * 4 + slot
    return {
      act: 'queue' as const,
      look: { skin: skin(i), hair: hair(i + 1), shirt: shirt(i + 3), trousers: trousers(i), dress: i % 4 === 1, height: 0.93 + (i % 5) * 0.025, carry: (['phone', undefined, 'paper', 'bag'] as const)[i % 4] },
      role: customer(i),
      path: [[q.head[0] + q.back[0] * slot * QUEUE_SPACING, q.head[1] + q.back[1] * slot * QUEUE_SPACING]] as const,
      line,
    }
  }),
)

/** Round the outside of the counters. Everyone keeps to the right, so the two directions never meet. */
const ROUND_HALL: readonly Spot[] = [
  [-15.4, 26.2],
  [-15.4, -17.4],
  [10.6, -17.4],
  [10.6, 26.2],
]
const ROUND_REVERSED: readonly Spot[] = [
  [11.6, 27],
  [11.6, -16.5],
  [-16.4, -16.5],
  [-16.4, 27],
]

const walk = (i: number, path: readonly Spot[], speed: number, carry?: Carry, role = customer(i)): PersonDef => ({
  act: 'walk',
  look: { skin: skin(i + 1), hair: hair(i), shirt: shirt(i), trousers: trousers(i + 2), dress: i % 4 === 2, height: 0.94 + (i % 4) * 0.03, carry },
  role,
  path,
  speed,
})

/** Starts each walker part-way round, so that the crowd is spread out from the first frame. */
const from = (path: readonly Spot[], at: number) => [...path.slice(at), ...path.slice(0, at)]

const walkers: PersonDef[] = [
  walk(0, ROUND_HALL, 1.15, 'folder'),
  walk(1, from(ROUND_HALL, 1), 1.05),
  walk(2, from(ROUND_HALL, 2), 1.2, 'phone'),
  walk(3, from(ROUND_HALL, 3), 0.95, 'bag'),
  walk(4, ROUND_REVERSED, 1.1),
  walk(5, from(ROUND_REVERSED, 1), 1.0, 'paper'),
  walk(6, from(ROUND_REVERSED, 2), 1.25, 'folder'),
  // Through the lobby by the automatic doors, past the auditors.
  walk(7, [[-13, 3], [-5.8, 3.6], [-3.6, 4.7], [-0.9, 4.7], [1.4, 3.6], [8, 3], [1.4, 3.6], [-0.9, 4.7], [-3.6, 4.7], [-5.8, 3.6]], 1.05, 'folder'),
  walk(8, [[8, 3], [1.4, 3.6], [-0.9, 4.7], [-3.6, 4.7], [-5.8, 3.6], [-13, 3], [-5.8, 3.6], [-3.6, 4.7], [-0.9, 4.7], [1.4, 3.6]], 0.95),
  // In from the street, and back out.
  walk(9, [[AXIS_X + 2.4, 38], [AXIS_X + 2.4, 27], [8.4, 25], [AXIS_X + 2.4, 27]], 1.1, 'bag'),
  walk(10, [[AXIS_X - 2.4, 27], [AXIS_X - 2.4, 38]], 1.0, 'phone'),
]

const fixed: PersonDef[] = [
  // The benches: back to back in pairs, facing out.
  { act: 'sit', look: { skin: skin(1), hair: hair(1), shirt: shirt(2), trousers: trousers(0), height: 1, carry: 'phone' }, role: customer(1), path: [[7, 34.05]], yaw: SOUTH },
  { act: 'sit', look: { skin: skin(2), hair: hair(2), shirt: shirt(6), trousers: trousers(1), dress: true, height: 0.95 }, role: customer(4), path: [[8.4, 34.05]], yaw: SOUTH },
  { act: 'sit', look: { skin: skin(3), hair: hair(3), shirt: shirt(4), trousers: trousers(2), height: 0.98, carry: 'paper' }, role: customer(2), path: [[3.2, 31.85]], yaw: NORTH },
  { act: 'sit', look: { skin: skin(4), hair: hair(0), shirt: shirt(5), trousers: trousers(3), height: 1, carry: 'folder' }, role: customer(5), path: [[-7.6, 31.85]], yaw: NORTH },
  { act: 'sit', look: { skin: skin(0), hair: hair(4), shirt: shirt(8), trousers: trousers(4), height: 0.95, carry: 'phone' }, role: customer(6), path: [[-12.4, 31.85]], yaw: NORTH },
  { act: 'sit', look: { skin: skin(5), hair: hair(1), shirt: shirt(9), trousers: trousers(5), dress: true, height: 0.94 }, role: customer(7), path: [[-11, 34.05]], yaw: SOUTH },
  // Filling in a form at the auditors' end of the lobby.
  { act: 'write', look: { skin: skin(2), hair: hair(0), shirt: shirt(1), trousers: trousers(1), height: 0.99 }, role: customer(8), path: [[-2.2, 3.55]], yaw: NORTH },
  // Talking in the aisles.
  { act: 'chat', look: { skin: skin(1), hair: hair(2), shirt: shirt(3), trousers: trousers(2), height: 1 }, role: customer(0), path: [[-10.5, 8.5]], yaw: 1.3 },
  { act: 'chat', look: { skin: skin(3), hair: hair(1), shirt: shirt(5), trousers: trousers(0), dress: true, height: 0.94, carry: 'bag' }, role: customer(3), path: [[-9.6, 9.1]], yaw: -1.9 },
  { act: 'chat', look: { skin: skin(4), hair: hair(3), shirt: shirt(7), trousers: trousers(3), height: 1.02, carry: 'folder' }, role: customer(1), path: [[7.2, 9.4]], yaw: 1 },
  { act: 'chat', look: { skin: skin(0), hair: hair(1), shirt: shirt(0), trousers: trousers(1), height: 0.97 }, role: customer(2), path: [[8.1, 10.1]], yaw: -2.2 },
  // The investigation, in the middle of it all.
  { act: 'stand', look: { skin: skin(2), hair: hair(4), shirt: '#e8e3d4', trousers: '#2a2e3a', height: 1.01, carry: 'folder' }, role: AUDITOR, path: [[TABLE[0] - 1.45, TABLE[1] - 0.2]], yaw: EAST },
  { act: 'stand', look: { skin: skin(4), hair: hair(0), shirt: '#20304a', trousers: '#20304a', height: 1.04, carry: 'paper' }, role: OFFICER, path: [[TABLE[0] + 1.5, TABLE[1] + 0.2]], yaw: WEST },
  // Security: one at the rope, one on the desk, one on the move.
  { act: 'guard', look: { skin: skin(5), hair: hair(0), shirt: '#3c4a5e', trousers: '#232935', height: 1.04 }, role: GUARD, path: [[AXIS_X - 1.3, ROPE_Z + 1]], yaw: SOUTH },
  { act: 'guard', look: { skin: skin(1), hair: hair(1), shirt: '#3c4a5e', trousers: '#232935', height: 1.02 }, role: GUARD, path: [[SECURITY_DESK[0] - 1.05, SECURITY_DESK[1] + 0.55]], yaw: EAST },
  { act: 'walk', look: { skin: skin(3), hair: hair(0), shirt: '#3c4a5e', trousers: '#232935', height: 1.03 }, role: GUARD, path: [[-12, 25.5], [-12, -17.2], [9.95, -17.2], [9.95, 25.5]], speed: 0.8 },
  // Cleaning, as somebody always is.
  { act: 'mop', look: { skin: skin(5), hair: hair(3), shirt: '#4a6e8a', trousers: '#2f3a48', height: 0.97, carry: 'mop' }, role: CLEANER, path: [[-13.5, 21], [-13.5, 24.2], [-11.5, 24.2], [-11.5, 21]], speed: 0.32 },
]

/** Where the case's four suspects spend the morning: true to who they are. */
const blank = { skin: '', hair: '', shirt: '', trousers: '#262a36', height: 1 }
const blankRole = { name: '', line: '' }
const suspectSpots: PersonDef[] = [
  { act: 'stand', look: { ...blank, height: 1.02, carry: 'folder' }, role: blankRole, path: [[-9.5, -18.6]], yaw: -0.5, suspectId: 'vikram' },
  { act: 'stand', look: { ...blank, trousers: '#8c2f39', dress: true, height: 0.96 }, role: blankRole, path: [[-0.2, -12.2]], yaw: NORTH, suspectId: 'anjali' },
  { act: 'stand', look: { ...blank, trousers: '#30323a', carry: 'phone' }, role: blankRole, path: [[-6.5, -2.4]], yaw: 0.8, suspectId: 'farhan' },
  { act: 'chat', look: { ...blank, trousers: '#b98a2f', dress: true, height: 0.95, carry: 'folder' }, role: blankRole, path: [[3.8, 28.4]], yaw: -2.6, suspectId: 'sunita' },
]

export const BANK_PEOPLE: readonly PersonDef[] = [...suspectSpots, ...queuers, ...tellers, ...walkers, ...fixed]

export const BANK_ANNOUNCEMENTS: readonly string[] = [
  'Welcome to Kaveri Union Bank. Our staff will never ask for your PIN, password or OTP. Do not share them with anyone, even if the caller says they are from the bank.',
  'Please keep your token with you. If anyone offers to pay you for the use of your bank account, refuse, and tell a member of staff.',
  'Reminder from the branch. If money leaves your account without your say, inform us at once and call the cyber fraud helpline on 1930.',
  'Customers are asked not to approach the auditors’ table in the lobby. If you noticed anything unusual at this branch over the weekend, please speak to a member of security.',
]

/** What the counter says when the player's own token is called. A different lesson each time. */
export const TOKEN_LESSONS: readonly PersonRole[] = [
  { name: 'Teller', line: 'Your token, thank you. A free tip while I am here: nobody from a bank will ever need your OTP. Hang up, and call the number on your card.', law: PERSONATION },
  { name: 'Teller', line: 'Your token, thank you. Lending out your account for a fee makes you a money mule, and that can bring you within the money laundering law.', law: LAUNDERING },
  { name: 'Teller', line: 'Your token, thank you. If you ever write a cheque, make sure the money is there. A bounced one can end in court.', law: CHEQUE_BOUNCE },
  { name: 'Teller', line: 'Your token, thank you. Thirty percent a month, guaranteed? Unregulated deposit schemes are banned. Walk away, and report them.', law: PONZI },
  { name: 'Teller', line: 'Your token, thank you. We will ask for KYC documents again before long. It is what keeps accounts in false names out of the bank.', law: KYC },
]
