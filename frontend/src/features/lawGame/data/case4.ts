import type { LawCase, LawRef } from '../types.ts'
import { ELECTRONIC, FORENSIC, RELEVANCE, SCREEN_EVIDENCE, TRESPASS } from './case1.ts'

const PMLA = 'Prevention of Money Laundering Act, 2002'
const BNS = 'Bharatiya Nyaya Sanhita, 2023'
const IT_ACT = 'Information Technology Act, 2000'

export const LAUNDERING: LawRef = {
  act: PMLA,
  section: 'Section 3',
  title: 'The offence of money laundering',
  summary: 'Knowingly helping to conceal, possess, acquire or use the proceeds of crime, or passing them off as clean money, is money laundering.',
}
export const LAUNDERING_PENALTY: LawRef = {
  act: PMLA,
  section: 'Section 4',
  title: 'Punishment for money laundering',
  summary: 'Rigorous imprisonment of at least three and up to seven years, plus a fine. Letting criminals use your account can bring you within this law.',
}
export const BANK_RECORDS: LawRef = {
  act: PMLA,
  section: 'Section 12',
  title: 'Banks must keep records and report',
  summary: 'Banks must keep transaction records and report prescribed transactions to the Financial Intelligence Unit. This covers cash transactions above ₹10 lakh and anything suspicious, whatever the amount.',
}
export const KYC: LawRef = {
  act: PMLA,
  section: 'Section 11A',
  title: 'Verifying who a customer is',
  summary: 'Banks must verify the identity of their customers. That is why KYC exists, and why an account opened on false papers is a red flag for fraud.',
}
export const BREACH_OF_TRUST: LawRef = {
  act: BNS,
  section: 'Section 316(5)',
  title: 'Criminal breach of trust by a banker',
  summary: 'A banker who dishonestly misuses money entrusted to them commits one of the gravest forms of breach of trust, punishable by up to life imprisonment.',
}
export const FORGERY: LawRef = {
  act: BNS,
  section: 'Section 338',
  title: 'Forgery of a valuable security',
  summary: 'Forging a valuable security such as a cheque is a very serious form of forgery, punishable by up to life imprisonment.',
}
export const FORGED_AS_GENUINE: LawRef = {
  act: BNS,
  section: 'Section 340',
  title: 'Using a forged document as genuine',
  summary: 'Knowingly presenting a forged cheque or record as if it were real is punished in the same way as forging it.',
}
export const CHEATING: LawRef = {
  act: BNS,
  section: 'Section 318(4)',
  title: 'Cheating to obtain property',
  summary: 'Deceiving someone into handing over money or property is punishable by up to seven years in prison and a fine.',
}
export const CONSPIRACY: LawRef = {
  act: BNS,
  section: 'Section 61',
  title: 'Criminal conspiracy',
  summary: 'Agreeing with others to commit a crime is itself an offence. Everyone in the plan can answer for it, even those who never touched the money.',
}
export const FAKE_NOTES: LawRef = {
  act: BNS,
  section: 'Section 179',
  title: 'Passing on counterfeit notes',
  summary: 'Knowingly using a forged note as genuine, or trafficking in it, is a serious crime. If you are handed a suspect note, take it to a bank or the police.',
}
export const IDENTITY_THEFT: LawRef = {
  act: IT_ACT,
  section: 'Section 66C',
  title: 'Identity theft',
  summary: 'Fraudulently using someone else’s password or electronic signature can mean up to three years in prison and a fine of up to ₹1 lakh.',
}
export const PERSONATION: LawRef = {
  act: IT_ACT,
  section: 'Section 66D',
  title: 'Cheating by personation online',
  summary: 'Pretending to be someone else over a computer or phone to cheat a person, like a fake bank call, can mean up to three years in prison and a fine of up to ₹1 lakh.',
}
export const CHEQUE_BOUNCE: LawRef = {
  act: 'Negotiable Instruments Act, 1881',
  section: 'Section 138',
  title: 'Dishonour of a cheque',
  summary: 'A cheque that bounces for lack of funds can mean up to two years in prison or a fine of up to twice its amount, if it is not paid after a proper notice.',
}
export const PONZI: LawRef = {
  act: 'Banning of Unregulated Deposit Schemes Act, 2019',
  section: 'Section 3',
  title: 'No unregulated deposit schemes',
  summary: 'Promoting or taking money for an unregulated deposit scheme is banned, however good the promised returns sound.',
}
export const CUSTOMER_LIABILITY: LawRef = {
  act: 'Reserve Bank of India circular, July 2017',
  section: 'Customer liability',
  title: 'Report bank fraud fast',
  summary: 'Tell your bank within three working days of an unauthorised electronic transaction that was not your fault, and you should not bear the loss. For cyber fraud, also call 1930.',
}

export const CASE_4: LawCase = {
  level: 4,
  scene: 'bank',
  copy: {
    sceneNoun: 'banking hall',
    enterScene: 'Walk into the bank',
    loading: 'Unlocking the banking hall',
    alibiQuestion: 'Where were you between 10:40 PM and 1:15 AM on Saturday night? Name a place, a time and someone who saw you.',
    alibiPlaceholder: 'I was at…',
    sceneTip: 'The doors open as you approach. Talk to anyone, take a token, and check the security desk: its cameras can help, or expose, whoever is playing.',
    extraControls: [
      ['E', 'talk / use'],
      ['M', 'mute'],
    ],
    chooseTitle: 'Who are you this morning?',
    edgeLabel: 'Strongroom: staff only',
    arrival: { title: 'Kaveri Union Bank', subtitle: 'Monday morning, and the auditors have just walked in' },
  },
  edgeLaw: TRESPASS,
  witnessWords: ['guard', 'driver', 'auditor', 'colleague', 'manager', 'cashier', 'neighbour', 'wife', 'husband', 'waiter', 'security', 'receptionist', 'badge'],
  title: 'The Ghost Accounts',
  place: 'Kaveri Union Bank, Fort branch, Mumbai',
  tagline: '₹4.2 crore walks out of dormant accounts over a weekend, and someone inside opened the door.',
  timing: { hide: 150, statement: 75, search: 300, bifurcate: 150 },
  placeWords: ['bank', 'branch', 'hall', 'counter', 'lobby', 'strongroom', 'vault', 'cabin', 'office', 'lounge', 'server', 'canteen', 'hotel', 'restaurant', 'home', 'flat', 'club', 'taxi', 'station', 'gym', 'hospital'],
  beats: [
    {
      kicker: 'Saturday, 10:40 PM',
      title: 'Thirty-seven sleeping accounts wake up',
      text: 'The bank is shut. Yet someone logs in with a teller’s password and starts moving money out of dormant accounts, most of them belonging to pensioners who rarely check their balance.',
      mood: 'night',
      law: IDENTITY_THEFT,
    },
    {
      kicker: 'Sunday, all day',
      title: 'Small enough not to be noticed',
      text: 'The ₹4.2 crore lands in a web of mule accounts, opened on borrowed names. It leaves again in cash, every withdrawal kept just below ₹10 lakh, the level at which a bank must report cash. Splitting it does not fool the law: linked amounts are added together.',
      mood: 'night',
      law: BANK_RECORDS,
    },
    {
      kicker: 'Monday, 9:15 AM',
      title: 'The numbers do not add up',
      text: 'An auditor spots the gap and calls it in. Forged cheques, false accounts, cash with no owner: if an insider is behind this, it is breach of trust by a banker, and then laundering on top.',
      mood: 'alarm',
      law: BREACH_OF_TRUST,
    },
    {
      kicker: 'Monday, 10:00 AM',
      title: 'Open for business',
      text: 'The doors open on time, because a panic would be worse. Customers queue with their tokens, the note counters whirr, and the hall fills up. Most people here have no idea that their branch is a crime scene.',
      mood: 'vault',
      law: CUSTOMER_LIABILITY,
    },
    {
      kicker: 'The suspects',
      title: 'Four people had the access',
      text: 'A branch manager, a head cashier, a systems officer and a relationship manager. Each says they are innocent. One of them is lying, and has had all morning to tidy the hall.',
      mood: 'vault',
      lineup: true,
    },
    {
      kicker: 'Your roles',
      title: 'Hide the truth. Find the truth.',
      text: 'The Obstructor picks a suspect, hides the evidence around the hall and writes a convincing alibi. The Detective searches the bank, sorts clues from noise and names the culprit. Then you swap, and the better score wins. In real life, hiding evidence is a crime: this is a game about knowing why.',
      mood: 'alarm',
      law: SCREEN_EVIDENCE,
    },
  ],
  suspects: [
    {
      id: 'vikram',
      name: 'Vikram Rao',
      role: 'Branch manager',
      age: 52,
      skin: '#c68a62',
      hair: '#55524e',
      shirt: '#27344f',
      hairStyle: 2,
      profile: 'Twenty-six years with the bank, and he signs off every large transfer. Has a loan on a new flat that he never mentions, and a key to everything.',
      statement: 'I left the branch at 7 PM and was at the Gymkhana club dinner until past midnight. The club secretary sat beside me, and the driver dropped me home at 12:40.',
    },
    {
      id: 'anjali',
      name: 'Anjali Menon',
      role: 'Head cashier',
      age: 38,
      skin: '#b57a54',
      hair: '#171717',
      shirt: '#8c2f39',
      hairStyle: 1,
      profile: 'Holds the second key to the strongroom and runs the cash counters. Her team’s logins are written in a notebook she insists is locked away.',
      statement: 'I was at home in Dadar all Saturday night, looking after my mother. My neighbour came over at 11 PM with her medicine, and stayed until almost 1 AM.',
    },
    {
      id: 'farhan',
      name: 'Farhan Qureshi',
      role: 'Systems officer',
      age: 29,
      skin: '#d6a07a',
      hair: '#1d1612',
      shirt: '#3f7d6a',
      hairStyle: 0,
      profile: 'Keeps the core banking system running, and can see every login. Went quiet after being passed over for promotion in March.',
      statement: 'I was on a late shift fixing the backup at the data centre in Vashi until 11:30 PM. The security guard signed me out, and then I took a taxi to my flat.',
    },
    {
      id: 'sunita',
      name: 'Sunita Desai',
      role: 'Relationship manager',
      age: 44,
      skin: '#e0ac86',
      hair: '#3a2a22',
      shirt: '#b98a2f',
      hairStyle: 3,
      profile: 'Knows every pensioner by name, and opened most of the new accounts this year. Her KYC files are always complete, and always just in time.',
      statement: 'I was at my nephew’s wedding reception at the Sea Lounge hotel from 8 PM until 1 AM. There are hundreds of photos, and my husband was with me all night.',
    },
  ],
  evidences: [
    {
      id: 'chequebook',
      name: 'Cheque book with signed leaves',
      kind: 'chequebook',
      relevant: true,
      description: 'A pensioner’s cheque book. Several leaves are already signed, in a hand that shakes in exactly the same places on each one.',
      precautions: [
        'Do not touch it or try to use it: handwriting and fingerprints can both be examined.',
        'Do not compare or copy the signatures yourself.',
        'Tell the police and the bank’s fraud team, and note exactly where it was found.',
      ],
      laws: [FORGERY, FORGED_AS_GENUINE, CHEATING],
      connection: 'The account holder has been bedridden for a year, and the signatures have been traced from one original. The cheques emptied two of the dormant accounts.',
      deskOffset: [-0.52, 0.1],
    },
    {
      id: 'cash',
      name: 'Bundled cash without bank straps',
      kind: 'cash',
      relevant: true,
      description: 'Three thick bundles of ₹500 notes, wrapped in plain paper bands rather than a bank’s printed strap. Nobody has reported losing them.',
      precautions: [
        'Do not count it, move it or take any of it: taking it would make you part of the crime.',
        'Keep people away from it, and call the police or the bank’s security at once.',
        'Note the time and who else was nearby.',
      ],
      laws: [LAUNDERING, LAUNDERING_PENALTY, BANK_RECORDS],
      connection: 'The serial numbers run straight on from a mule account’s withdrawal on Sunday. It is the proceeds of crime, kept in amounts that dodge a cash report.',
      deskOffset: [-0.12, -0.2],
    },
    {
      id: 'pendrive',
      name: 'Pen drive with saved logins',
      kind: 'pendrive',
      relevant: true,
      description: 'An unmarked black pen drive, its status light still warm, with a strip of tape on it reading “CTS backup”.',
      precautions: [
        'Do not plug it into anything: even opening a file changes the data on it.',
        'Do not copy, rename or delete anything on it.',
        'Hand it over untouched, so that a certified copy can stand up in court.',
      ],
      laws: [IDENTITY_THEFT, ELECTRONIC],
      connection: 'It holds a teller’s saved password and the login script used at 10:40 PM on Saturday. Nobody needs a teller’s password on a “backup” drive.',
      deskOffset: [0.14, 0.2],
    },
    {
      id: 'passbook',
      name: 'Passbooks in borrowed names',
      kind: 'passbook',
      relevant: true,
      description: 'Two passbooks held together by a rubber band, in the names of a cleaner and a college student. Their balances are far from what either earns.',
      precautions: [
        'Do not open them or take them away: every page matters.',
        'If anyone ever asks to “borrow” your account, refuse and report it.',
        'Tell the investigators, who can trace the accounts through the bank’s records.',
      ],
      laws: [CONSPIRACY, KYC, LAUNDERING],
      connection: 'Both are mule accounts: the holders were paid a few thousand rupees for their documents. The stolen money passed through both within hours.',
      deskOffset: [0.5, -0.12],
    },
    {
      id: 'memo',
      name: 'Cheque return memo in an envelope',
      kind: 'envelope',
      relevant: false,
      description: 'A sealed bank envelope holding a return memo for a bounced ₹18,000 cheque. It looks damning at first glance, and it is stamped “funds insufficient”.',
      precautions: [
        'Do not assume that a bounced cheque is a sign of this fraud.',
        'Do not open another customer’s post: leave it where it is.',
        'Let the investigators decide whether it matters.',
      ],
      laws: [CHEQUE_BOUNCE, RELEVANCE],
      connection: 'It is one tenant’s rent, bounced a month before any of this. A serious matter for those two people, but it has no link to the dormant accounts.',
      deskOffset: [0.3, 0.08],
    },
    {
      id: 'slip',
      name: 'Crumpled ATM slip',
      kind: 'receipt',
      relevant: false,
      description: 'A faded ATM slip for a ₹2,000 withdrawal, screwed up and dropped by the bin, with most of the card number hidden.',
      precautions: [
        'Things left near a scene can still matter, so do not throw it away.',
        'Do not pick it up, because it may carry prints.',
        'Tell the investigators, and let them decide.',
      ],
      laws: [RELEVANCE, SCREEN_EVIDENCE],
      connection: 'The date on it is three weeks old, and the customer has nothing to do with any account involved. It is simply litter.',
      deskOffset: [-0.34, 0.26],
    },
  ],
  charges: [LAUNDERING, LAUNDERING_PENALTY, BANK_RECORDS, KYC, BREACH_OF_TRUST, FORGERY, FORGED_AS_GENUINE, CHEATING, CONSPIRACY, IDENTITY_THEFT, PERSONATION, CHEQUE_BOUNCE, CUSTOMER_LIABILITY, TRESPASS, SCREEN_EVIDENCE, FORENSIC, ELECTRONIC, RELEVANCE],
}
