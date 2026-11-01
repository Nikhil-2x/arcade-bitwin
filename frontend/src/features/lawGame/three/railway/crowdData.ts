import type { LawRef } from '../../types.ts'
import { COACH_FLOOR, COACH_Z, PLATFORM_TOP } from './RailwayQueries.ts'

export type Point = readonly [x: number, z: number]

export interface PersonLook {
  skin: string
  hair: string
  shirt: string
  legs: string
  /** A sari or long dress instead of trousers. */
  dress?: boolean
  /** Scales the whole figure. */
  height: number
  carry?: 'suitcase' | 'headload' | 'backpack'
}

export interface PersonRole {
  name: string
  line: string
  law?: LawRef
}

export interface PersonDef {
  look: PersonLook
  role: PersonRole
  /** Walks this loop, or stands at its first point if it has only one. */
  path: readonly Point[]
  speed?: number
  /** What the feet stand on. */
  y?: number
  /** Facing, for people who are not walking. */
  yaw?: number
  seated?: boolean
  /** Ties them to a suspect in the case: they use that suspect's looks and words. */
  suspectId?: string
}

const RAILWAYS_ACT = 'Railways Act, 1989'
const TRESPASS: LawRef = { act: RAILWAYS_ACT, section: 'Section 147', title: 'Trespass on the railway', summary: '' }
const CHAIN: LawRef = { act: RAILWAYS_ACT, section: 'Section 141', title: 'Misusing the alarm chain', summary: '' }
const PASS: LawRef = { act: RAILWAYS_ACT, section: 'Section 157', title: 'Altering or defacing a pass or ticket', summary: '' }
const DAMAGE: LawRef = { act: RAILWAYS_ACT, section: 'Section 151', title: 'Damage to railway property', summary: '' }
const STOLEN: LawRef = { act: 'Railway Property (Unlawful Possession) Act, 1966', section: 'Section 3', title: 'Possessing stolen railway property', summary: '' }

const SKIN = ['#e0ac86', '#c68a62', '#b57a54', '#d6a07a', '#a86f4c', '#8f5f40']
const HAIR = ['#171717', '#1d1612', '#2a1a14', '#3a3a3f', '#55524e']
const skin = (i: number) => SKIN[i % SKIN.length]
const hair = (i: number) => HAIR[i % HAIR.length]

const PASSENGER_LINES: PersonRole[] = [
  { name: 'Passenger', line: 'They say it will be hours. I would rather wait here than walk the line like those boys did. That is how people die.', law: TRESPASS },
  { name: 'Passenger', line: 'Someone pulled the chain when the express braked. In a real emergency, fine. For nothing, it is an offence.', law: CHAIN },
  { name: 'Passenger', line: 'My son scratched the date on his pass to reuse it. I made him buy a new one. A changed pass is a crime, not a trick.', law: PASS },
  { name: 'Passenger', line: 'Stay behind the yellow line, beta. The express does not slow down for anybody.' },
  { name: 'Passenger', line: 'If you see anything wrong on the line, call 139. For an emergency, 112. Do not wait for someone else to do it.' },
  { name: 'Passenger', line: 'Copper thieves! They get a few hundred rupees, and a whole train stops in the dark. Damaging signals can mean years in prison.', law: DAMAGE },
  { name: 'Passenger', line: 'An unattended bag? Do not open it. Tell the staff and keep people away from it.' },
  { name: 'Passenger', line: 'I am only going to Chandanpur Road. Forty minutes, the ticket said. That was two hours ago.' },
]
const line = (i: number) => PASSENGER_LINES[i % PASSENGER_LINES.length]

/** Lanes keep walkers apart. Between the benches and the track on the concourse, either side of the pillars on the platform. */
const LANE_NEAR = 9.55
const LANE_MID = 10.15
const PLATFORM_A = 5.05
const PLATFORM_B = 6.15

const walkers: PersonDef[] = [
  { look: { skin: skin(0), hair: hair(0), shirt: '#b8456a', legs: '#2d2a3a', dress: true, height: 0.95, carry: 'suitcase' }, role: line(3), path: [[-26, LANE_NEAR], [18.5, LANE_NEAR]], speed: 1.15 },
  { look: { skin: skin(1), hair: hair(1), shirt: '#3b6ea8', legs: '#30323a', height: 1, carry: 'backpack' }, role: line(4), path: [[18.5, LANE_MID], [-25.5, LANE_MID]], speed: 1.35 },
  { look: { skin: skin(2), hair: hair(2), shirt: '#d6c24a', legs: '#4a4034', height: 1.02 }, role: line(5), path: [[-8, LANE_NEAR], [18, LANE_NEAR], [-25.5, LANE_NEAR]], speed: 1.25 },
  { look: { skin: skin(3), hair: hair(3), shirt: '#7a5a3a', legs: '#23252b', height: 0.97, carry: 'suitcase' }, role: line(6), path: [[10, LANE_MID], [-24, LANE_MID]], speed: 1.05 },
  { look: { skin: skin(4), hair: hair(0), shirt: '#3f7d6a', legs: '#3f7d6a', dress: true, height: 0.93 }, role: line(7), path: [[-24, 12.8], [-18, 13.2], [-20, 17.5], [-25, 13.8]], speed: 0.95 },
  { look: { skin: skin(5), hair: hair(1), shirt: '#ececec', legs: '#ececec', height: 1, carry: 'backpack' }, role: line(1), path: [[-14, 16], [-26, 18], [-14, 18.2], [-14.5, 11.8]], speed: 1.2 },
  // Crossing the line by the boards: these two stop for trains.
  { look: { skin: skin(1), hair: hair(2), shirt: '#a8402f', legs: '#2d2a3a', height: 1.01 }, role: line(0), path: [[-16.1, 12.5], [-16.1, PLATFORM_B], [-10, PLATFORM_B], [-16.1, PLATFORM_B]], speed: 1.2 },
  { look: { skin: skin(2), hair: hair(0), shirt: '#b98cc9', legs: '#b98cc9', dress: true, height: 0.94, carry: 'suitcase' }, role: line(2), path: [[-23, PLATFORM_A], [-16.05, PLATFORM_B], [-16.05, 12.3], [-22, 12.8], [-16.05, 12.3], [-16.05, PLATFORM_B]], speed: 1.05 },
  // The platform.
  { look: { skin: skin(3), hair: hair(1), shirt: '#4a6e4a', legs: '#23252b', height: 1, carry: 'backpack' }, role: line(3), path: [[-26, PLATFORM_A], [18, PLATFORM_A]], speed: 1.1 },
  { look: { skin: skin(0), hair: hair(4), shirt: '#c98a3a', legs: '#c98a3a', dress: true, height: 0.92 }, role: line(5), path: [[18, PLATFORM_B], [-26, PLATFORM_B]], speed: 0.9 },
  { look: { skin: skin(4), hair: hair(3), shirt: '#ececec', legs: '#ececec', height: 0.98, carry: 'suitcase' }, role: line(4), path: [[4, PLATFORM_A], [-20, PLATFORM_A]], speed: 1.15 },
  // A porter in the licensed red shirt, load on the head, as ever.
  { look: { skin: skin(5), hair: hair(0), shirt: '#b3261e', legs: '#22242a', height: 1, carry: 'headload' }, role: { name: 'Porter', line: 'Take the crossing boards, sir, never the rails. And only when the lights are not flashing. I have seen what a train does.', law: TRESPASS }, path: [[-19, PLATFORM_B], [15, PLATFORM_B]], speed: 0.85 },
  // Railway Protection Force on patrol.
  { look: { skin: skin(1), hair: hair(0), shirt: '#a8956a', legs: '#a8956a', height: 1.04 }, role: { name: 'RPF constable', line: 'We are guarding this scene until the inspector arrives. Anyone caught with stolen railway cable must prove how they came by it.', law: STOLEN }, path: [[-26, 11.6], [-13, 9.8], [-26, 9.6]], speed: 0.8 },
  // The ticket examiner works the aisle.
  { look: { skin: skin(0), hair: hair(1), shirt: '#20232e', legs: '#20232e', height: 0.98 }, role: { name: 'Ticket examiner', line: 'Tickets please. This one is yours? Good. An altered pass I would have to report, whatever the excuse.', law: PASS }, path: [[-18, COACH_Z], [1.5, COACH_Z]], speed: 0.7, y: COACH_FLOOR },
]

const y = PLATFORM_TOP
const standers: PersonDef[] = [
  // Waiting about in groups.
  { look: { skin: skin(1), hair: hair(1), shirt: '#5a6b4a', legs: '#2d2a3a', height: 1 }, role: line(7), path: [[-22.3, 12.6]], yaw: 1.2 },
  { look: { skin: skin(2), hair: hair(0), shirt: '#2f3f6e', legs: '#2f3f6e', dress: true, height: 0.93 }, role: line(6), path: [[-21.6, 13.3]], yaw: -2.5 },
  { look: { skin: skin(4), hair: hair(2), shirt: '#a3612f', legs: '#30323a', height: 1.02, carry: 'suitcase' }, role: line(2), path: [[6, 12.6]], yaw: 2.6 },
  { look: { skin: skin(0), hair: hair(3), shirt: '#6d6d82', legs: '#25262d', height: 0.98, carry: 'backpack' }, role: line(0), path: [[-6.5, 5.9]], y, yaw: Math.PI },
  { look: { skin: skin(3), hair: hair(0), shirt: '#d48aa8', legs: '#d48aa8', dress: true, height: 0.95 }, role: line(1), path: [[-7.2, 6.05]], y, yaw: 0.4 },
  { look: { skin: skin(5), hair: hair(1), shirt: '#4d7fa3', legs: '#25262d', height: 1 }, role: line(5), path: [[12.5, 5.2]], y, yaw: Math.PI },
  // At the benches on the concourse.
  { look: { skin: skin(2), hair: hair(1), shirt: '#8a4f7a', legs: '#30323a', height: 1 }, role: line(3), path: [[-10, 10.95]], seated: true, yaw: Math.PI },
  { look: { skin: skin(0), hair: hair(4), shirt: '#ececec', legs: '#ececec', dress: true, height: 0.92 }, role: line(4), path: [[-4.6, 10.95]], seated: true, yaw: Math.PI },
]

// Passengers aboard the two coaches behind the doors, and a scattering further on for the windows.
const SEAT_NORTH = 2.56
const SEAT_SOUTH = 3.84
const aboard: PersonDef[] = (
  [
    [-17.5, SEAT_NORTH, 0], [-16.5, SEAT_SOUTH, 1], [-14.45, SEAT_NORTH, 2], [-10.4, SEAT_SOUTH, 3], [-9.4, SEAT_NORTH, 4], [-7.35, SEAT_NORTH, 5], [-7.35, SEAT_SOUTH, 0], [-2.25, SEAT_SOUTH, 1], [-1.25, SEAT_NORTH, 2], [0.8, SEAT_SOUTH, 3],
    [5.2, SEAT_SOUTH, 2], [9.3, SEAT_SOUTH, 0], [13.4, SEAT_SOUTH, 4], [17.5, SEAT_SOUTH, 1], [23.6, SEAT_SOUTH, 3],
  ] as const
).map(([x, z, i], n) => ({
  look: { skin: skin(i + n), hair: hair(i), shirt: ['#b8456a', '#3b6ea8', '#c9a24a', '#4a6e4a', '#7a5a3a', '#6d6d82'][(n + i) % 6], legs: '#2d2f38', dress: n % 3 === 0, height: 0.94 + (n % 4) * 0.02 },
  role: line(n),
  path: [[x, z]] as const,
  seated: true,
  // Facing along the train, one way or the other with the seat they are in.
  yaw: n % 2 ? Math.PI / 2 : -Math.PI / 2,
  y: COACH_FLOOR,
}))

/** Where the case's four suspects spend the evening: true to what each of them says. */
const suspectSpots: PersonDef[] = [
  { look: { skin: '', hair: '', shirt: '', legs: '#2b2a33', height: 1 }, role: { name: '', line: '' }, path: [[-20.9, 11.5]], yaw: -2.6, suspectId: 'sunil' },
  { look: { skin: '', hair: '', shirt: '', legs: '#3f7d6a', dress: true, height: 0.95 }, role: { name: '', line: '' }, path: [[-23.9, 14.55]], yaw: Math.PI, suspectId: 'meera' },
  { look: { skin: '', hair: '', shirt: '', legs: '#2b3244', height: 1.01 }, role: { name: '', line: '' }, path: [[-24.1, 6.15]], y, yaw: -1.4, suspectId: 'arjun' },
  { look: { skin: '', hair: '', shirt: '', legs: '#2f3f6e', height: 0.97 }, role: { name: '', line: '' }, path: [[-13.1, 5.3]], y, yaw: 1.8, suspectId: 'neha' },
]

export const PEOPLE: readonly PersonDef[] = [...suspectSpots, ...walkers, ...standers, ...aboard]

export const ANNOUNCEMENTS: readonly string[] = [
  'Attention please. Train 12627 Chandanpur Express is held due to signal failure. Passengers are requested to remain on the platform.',
  'Yatri kripya dhyan dein. Do not cross the railway line. Use the crossing boards only, and only when the warning lights are off.',
  'Attention please. If you see any unattended object or anything wrong on the line, inform railway staff, or call 139 or 112.',
  'A fast train is expected on the near line. Please stay behind the yellow line.',
]
