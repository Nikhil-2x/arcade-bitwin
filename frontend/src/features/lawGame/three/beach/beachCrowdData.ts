import type { LawRef } from '../../types.ts'
import { BAR, COURT, DANCE_FLOOR, deckLane, HATCHERY, KAYAKS, KICK_AREA, LOUNGERS, PICNIC, TOWER, type Spot } from './beachLayout.ts'

export type Activity =
  | 'walk'
  | 'stand'
  | 'chat'
  | 'sunbathe'
  | 'sit'
  | 'dance'
  | 'volley'
  | 'kick'
  | 'swim'
  | 'float'
  | 'build'
  | 'selfie'
  | 'lookout'

export type Carry = 'drink' | 'book' | 'phone' | 'surfboard' | 'icecream' | 'tray'

export interface PersonLook {
  skin: string
  hair: string
  /** Null: no top on. */
  shirt: string | null
  shorts: string
  dress?: boolean
  /** A wide sun hat. */
  hat?: boolean
  /** Scales the whole figure. Children are small. */
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
  /** A height of their own, for anyone not standing on the ground, like the lookout up the tower. */
  y?: number
  /** Ties them to a suspect in the case: they use that suspect's looks and words. */
  suspectId?: string
}

const WILDLIFE_ACT = 'Wild Life (Protection) Act, 1972'
const HUNTING: LawRef = { act: WILDLIFE_ACT, section: 'Section 9', title: 'No hunting of scheduled animals', summary: '' }
const PENALTY: LawRef = { act: WILDLIFE_ACT, section: 'Section 51', title: 'Penalties for wildlife offences', summary: '' }
const PROPERTY: LawRef = { act: WILDLIFE_ACT, section: 'Section 39', title: 'Illegally taken wildlife is government property', summary: '' }
const TRADE: LawRef = { act: WILDLIFE_ACT, section: 'Section 49B', title: 'No trade in scheduled wildlife', summary: '' }
const COAST: LawRef = { act: 'Environment (Protection) Act, 1986', section: 'Section 3', title: 'Coastal Regulation Zone rules', summary: '' }
const ENDANGERING: LawRef = { act: 'Bharatiya Nyaya Sanhita, 2023', section: 'Section 125', title: 'Endangering life or safety', summary: '' }
const BOATING: LawRef = { act: 'Bharatiya Nyaya Sanhita, 2023', section: 'Section 282', title: 'Rash navigation of a vessel', summary: '' }

const SKIN = ['#e0ac86', '#c68a62', '#b57a54', '#d6a07a', '#a86f4c', '#8f5f40']
const HAIR = ['#171717', '#1d1612', '#2a1a14', '#3a3a3f', '#55524e']
const TOPS = ['#ec6a5c', '#3fa7c9', '#f4c04e', '#f2efe6', '#5fb88c', '#9a7fd1', '#f08fb0', '#2f6f9e']
const BOTTOMS = ['#1f4f7a', '#2d2f38', '#c9503f', '#3f7d6a', '#e8a33a', '#58446e', '#20262c']
const skin = (i: number) => SKIN[i % SKIN.length]
const hair = (i: number) => HAIR[i % HAIR.length]
const top = (i: number) => TOPS[i % TOPS.length]
const bottom = (i: number) => BOTTOMS[i % BOTTOMS.length]

const SUNBATHER_LINES: PersonRole[] = [
  { name: 'Holidaymaker', line: 'Turtles nest on this very sand? I had no idea. They come back to the same stretch of coast they hatched on, you know.' },
  { name: 'Holidaymaker', line: 'They are saying someone dug up a nest last night. Disturbing the eggs is treated like hunting the turtle itself. That is serious.', law: HUNTING },
  { name: 'Holidaymaker', line: 'If you find a turtle or a nest, stay back and keep your torch off. Then call the forest department.' },
  { name: 'Holidaymaker', line: 'My cousin was offered turtle eggs at a market once. Olive ridleys are Schedule I: that can be years in prison, for buyer and seller.', law: TRADE },
  { name: 'Holidaymaker', line: 'Lovely morning! I have been told to take all my rubbish home. Plastic bags can look like food to a turtle.' },
  { name: 'Holidaymaker', line: 'Even if you just find eggs, you cannot keep them. Illegally taken wildlife belongs to the government.', law: PROPERTY },
]
const WALKER_LINES: PersonRole[] = [
  { name: 'Beach walker', line: 'I walk here every morning. There are rules about what can be built this close to the shore, to protect beaches like this.', law: COAST },
  { name: 'Beach walker', line: 'I saw the tape at the end of the sand. Whatever you do, do not touch anything in there. Leave it for the officers.' },
  { name: 'Beach walker', line: 'If you see something wrong on a beach, call 112. Do not wait for someone else to do it.' },
  { name: 'Beach walker', line: 'A jet ski came far too close to the swimmers yesterday. Steering a boat like that is a crime, not a bit of fun.', law: BOATING },
  { name: 'Beach walker', line: 'Eggs take around fifty days to hatch. Then the little ones head straight for the sea. Do you know how few survive?' },
  { name: 'Beach walker', line: 'Lights on the beach confuse hatchlings: they crawl towards them instead of the moon on the water.' },
]
const FUN_LINES: PersonRole[] = [
  { name: 'Volleyball player', line: 'One more game! Do not stand on the court, you will get a ball in the face.' },
  { name: 'Dancer', line: 'Good music, good people! Rosa turns it down at night though. Loud speakers near a nesting beach are not on.' },
  { name: 'Swimmer', line: 'The lifeguard blew the whistle at me twice. Fine, fine, I am staying between the flags.', law: ENDANGERING },
  { name: 'Child', line: 'I made a castle! But I only dig the top bit of sand. Grandpa says the turtles’ eggs are way down deep.' },
  { name: 'Child', line: 'Kick it to me! No, wait, not towards the water!' },
  { name: 'Selfie taker', line: 'Hold on, this light is perfect. Oh, I took a picture of the turtle hatchery sign too. Nobody should be going in there, right?' },
  { name: 'Surfer', line: 'Red flag out there today. If you get into trouble, the lifeguard has to come after you. Think of them too.', law: ENDANGERING },
  { name: 'Ice cream seller', line: 'Mango, vanilla, kulfi! I am here from early on, and even I did not see who went near that nest.' },
  { name: 'Volunteer', line: 'We fence the nests because every clutch counts. Taking eggs from a Schedule I animal can mean three to seven years in prison.', law: PENALTY },
  { name: 'Picnicker', line: 'We always come to this lawn. We bring our own bags for the rubbish, and we take every bit of it home.' },
]
const fun = (name: string) => FUN_LINES.find((r) => r.name === name)!

const sunbathers: PersonDef[] = LOUNGERS.filter((_, i) => i % 5 !== 3).map((l, i) => ({
  act: 'sunbathe',
  look: { skin: skin(i * 2 + 1), hair: hair(i), shirt: i % 3 === 0 ? null : top(i), shorts: bottom(i), hat: i % 4 === 1, height: 0.96 + (i % 3) * 0.03, carry: i % 4 === 2 ? 'book' : undefined },
  role: SUNBATHER_LINES[i % SUNBATHER_LINES.length],
  path: [[l.x, l.z]],
  yaw: l.yaw,
}))

const there = (lane: readonly Spot[]) => [...lane, ...lane.slice(1, -1).reverse()]

const walkers: PersonDef[] = [
  { act: 'walk', look: { skin: skin(0), hair: hair(1), shirt: top(0), shorts: bottom(0), height: 1, hat: true }, role: WALKER_LINES[0], path: there(deckLane(2.7)), speed: 1.05 },
  { act: 'walk', look: { skin: skin(3), hair: hair(0), shirt: top(6), shorts: top(6), dress: true, height: 0.95 }, role: WALKER_LINES[1], path: there(deckLane(2.7)).reverse(), speed: 0.9 },
  { act: 'walk', look: { skin: skin(2), hair: hair(2), shirt: null, shorts: bottom(2), height: 1.03, carry: 'surfboard' }, role: fun('Surfer'), path: there(deckLane(2.7).slice(3)), speed: 1.15 },
  { act: 'walk', look: { skin: skin(4), hair: hair(3), shirt: top(3), shorts: bottom(1), height: 1 , carry: 'tray' }, role: fun('Ice cream seller'), path: there(deckLane(-3.2)), speed: 0.8 },
  { act: 'walk', look: { skin: skin(1), hair: hair(1), shirt: top(1), shorts: bottom(3), height: 1.01, carry: 'drink' }, role: WALKER_LINES[2], path: there([[14, 24], [18, 23], [18.6, 19], [21, 16], [24, 12], [23, 8], [31, 9]]), speed: 1 },
  { act: 'walk', look: { skin: skin(5), hair: hair(0), shirt: top(4), shorts: bottom(5), height: 0.97, carry: 'icecream' }, role: WALKER_LINES[3], path: there([[22, 12], [24, 5], [22, 1], [19, -3], [16, -7], [12, -11]]), speed: 0.95 },
  { act: 'walk', look: { skin: skin(2), hair: hair(4), shirt: top(5), shorts: top(5), dress: true, height: 0.94, hat: true }, role: WALKER_LINES[4], path: [[2, -23], [12, -23], [19, -23], [12, -23]], speed: 0.85 },
  { act: 'walk', look: { skin: skin(3), hair: hair(1), shirt: top(7), shorts: bottom(0), height: 1.02 }, role: WALKER_LINES[5], path: there([[-24, 10], [-30, 9.4], [-34, 8], [-37, 4]]), speed: 1.1 },
  { act: 'walk', look: { skin: skin(0), hair: hair(2), shirt: top(2), shorts: bottom(4), height: 1 }, role: WALKER_LINES[2], path: there([[33.5, 13.5], [38, 12.8], [41, 9.5]]), speed: 0.95 },
]

/** The lifeguard's lookout never leaves the tower. Height is the top of its platform. */
const fixed: PersonDef[] = [
  { act: 'chat', look: { skin: skin(4), hair: hair(0), shirt: top(2), shorts: bottom(1), height: 1 }, role: WALKER_LINES[0], path: [[-17.5, 18.5]], yaw: 1.2 },
  { act: 'chat', look: { skin: skin(1), hair: hair(3), shirt: top(6), shorts: top(6), dress: true, height: 0.94 }, role: SUNBATHER_LINES[0], path: [[-16.4, 18.9]], yaw: -1.9 },
  { act: 'sit', look: { skin: skin(2), hair: hair(1), shirt: top(4), shorts: bottom(0), height: 0.98, carry: 'book' }, role: SUNBATHER_LINES[2], path: [[-18, 13.5]], yaw: 0.5 + Math.PI },
  { act: 'sit', look: { skin: skin(3), hair: hair(2), shirt: top(5), shorts: bottom(5), height: 0.95, hat: true, carry: 'drink' }, role: SUNBATHER_LINES[4], path: [[-16.3, 14.6]], yaw: 0.5 + Math.PI },
  { act: 'sit', look: { skin: skin(5), hair: hair(0), shirt: top(1), shorts: bottom(1), height: 1 }, role: SUNBATHER_LINES[5], path: [[-5.6, 21]], yaw: 0.2 + Math.PI },
  { act: 'selfie', look: { skin: skin(0), hair: hair(1), shirt: top(0), shorts: bottom(3), height: 0.97, carry: 'phone' }, role: fun('Selfie taker'), path: [[-7.5, 12.6]], yaw: 2.4 },
  { act: 'selfie', look: { skin: skin(3), hair: hair(2), shirt: top(7), shorts: bottom(4), height: 0.95, carry: 'phone' }, role: fun('Selfie taker'), path: [[12.5, 18.8]], yaw: -1.8 },
  { act: 'build', look: { skin: skin(1), hair: hair(0), shirt: top(2), shorts: bottom(2), height: 0.62 }, role: fun('Child'), path: [[-10, 19.4]], yaw: 2.4 },
  { act: 'build', look: { skin: skin(2), hair: hair(2), shirt: top(6), shorts: bottom(3), height: 0.58 }, role: fun('Child'), path: [[-11.1, 18.6]], yaw: 0.4 },
  { act: 'stand', look: { skin: skin(4), hair: hair(4), shirt: top(3), shorts: bottom(1), height: 0.97, hat: true }, role: SUNBATHER_LINES[1], path: [[-8.2, 21.5]], yaw: -2.4 },
  // At the bar.
  { act: 'chat', look: { skin: skin(0), hair: hair(1), shirt: top(0), shorts: bottom(0), height: 1, carry: 'drink' }, role: WALKER_LINES[3], path: [[BAR[0] - 1.6, BAR[1] - 1.9]], yaw: 0.6 },
  { act: 'chat', look: { skin: skin(3), hair: hair(2), shirt: top(4), shorts: top(4), dress: true, height: 0.95, carry: 'drink' }, role: WALKER_LINES[4], path: [[BAR[0] - 0.7, BAR[1] - 2.6]], yaw: -2.5 },
  // Picnic on the lawn.
  { act: 'sit', look: { skin: skin(1), hair: hair(1), shirt: top(1), shorts: bottom(0), height: 1 }, role: fun('Picnicker'), path: [[PICNIC[0] - 1, PICNIC[1] - 0.5]], yaw: 1.4 },
  { act: 'sit', look: { skin: skin(2), hair: hair(3), shirt: top(6), shorts: bottom(5), height: 0.95, hat: true }, role: fun('Picnicker'), path: [[PICNIC[0] + 1, PICNIC[1] - 0.4]], yaw: -1.4 },
  { act: 'sit', look: { skin: skin(1), hair: hair(0), shirt: top(2), shorts: bottom(3), height: 0.6, carry: 'icecream' }, role: fun('Child'), path: [[PICNIC[0], PICNIC[1] + 0.7]], yaw: Math.PI },
  // Beside the hatchery: the one spot nobody is having fun.
  { act: 'stand', look: { skin: skin(5), hair: hair(0), shirt: '#4a6e4a', shorts: '#3a4a34', height: 1.03 }, role: { name: 'Forest guard', line: 'Nobody goes past the tape until the officers have seen it. Those eggs are government property now, wherever they are.', law: PROPERTY }, path: [[HATCHERY[0] + 4.6, HATCHERY[1] + 1.9]], yaw: -1 },
  { act: 'lookout', look: { skin: skin(1), hair: hair(0), shirt: '#d8452e', shorts: '#f2c94c', height: 1, hat: true }, role: { name: 'Lifeguard on the tower', line: 'Red flags mean stay out. If you go in, someone has to risk their life to come and get you.', law: ENDANGERING }, path: [[TOWER[0], TOWER[1]]], yaw: 0.55, y: 2.09 },
]

/** Facing across the net. The net lies along the court, so the two sides are north and south of it. */
const volley: PersonDef[] = (
  [
    [-2.2, -2.2, 0, 1],
    [2, -2, 1, 2],
    [-1.9, 2.1, 2, 3],
    [2.1, 2.3, 3, 4],
  ] as const
).map(([dx, dz, i, n]) => ({
  act: 'volley',
  look: { skin: skin(i + 1), hair: hair(i), shirt: n % 2 ? null : top(n), shorts: bottom(n), height: 1 + (i % 2) * 0.04 },
  role: fun('Volleyball player'),
  path: [[COURT[0] + dx, COURT[1] + dz]],
  yaw: dz < 0 ? 0.1 : 0.1 + Math.PI,
}))

const kids: PersonDef[] = [
  { act: 'kick', look: { skin: skin(3), hair: hair(1), shirt: top(1), shorts: bottom(4), height: 0.66 }, role: fun('Child'), path: [[KICK_AREA[0] - 2.5, KICK_AREA[1] - 0.5]] },
  { act: 'kick', look: { skin: skin(2), hair: hair(2), shirt: top(6), shorts: bottom(2), height: 0.6 }, role: fun('Child'), path: [[KICK_AREA[0] + 2.5, KICK_AREA[1] + 0.5]] },
]

const dancers: PersonDef[] = (
  [
    [-1.2, -0.6, 0],
    [0.9, -1.1, 1],
    [0.2, 0.9, 2],
    [-1.6, 1, 3],
    [1.8, 0.7, 4],
  ] as const
).map(([dx, dz, i]) => ({
  act: 'dance',
  look: { skin: skin(i * 2), hair: hair(i), shirt: top(i + 2), shorts: i % 2 ? top(i + 2) : bottom(i), dress: i % 2 === 1, height: 0.94 + (i % 3) * 0.04 },
  role: fun('Dancer'),
  path: [[DANCE_FLOOR[0] + dx, DANCE_FLOOR[1] + dz]],
  yaw: i * 1.4,
}))

/** In the lagoon, between the flags. Out of reach of a conversation: they wave back instead. */
const bathers: PersonDef[] = [
  { act: 'swim', look: { skin: skin(1), hair: hair(0), shirt: null, shorts: bottom(0), height: 1 }, role: fun('Swimmer'), path: [[-8, 2], [1, 6], [4, 0], [-4, -4]], speed: 0.7 },
  { act: 'swim', look: { skin: skin(3), hair: hair(2), shirt: top(1), shorts: bottom(1), height: 0.96 }, role: fun('Swimmer'), path: [[-16, 1], [-9, -6], [-18, -9]], speed: 0.6 },
  { act: 'swim', look: { skin: skin(4), hair: hair(1), shirt: null, shorts: bottom(2), height: 1 }, role: fun('Swimmer'), path: [[6, 9], [9, 3], [3, 3]], speed: 0.65 },
  { act: 'float', look: { skin: skin(2), hair: hair(1), shirt: top(6), shorts: bottom(3), height: 0.95 }, role: fun('Swimmer'), path: [[-2, 8]], yaw: 2.6 },
  { act: 'float', look: { skin: skin(0), hair: hair(3), shirt: top(0), shorts: bottom(4), height: 0.7 }, role: fun('Swimmer'), path: [[-0.2, 9.4]], yaw: -2.4 },
  { act: 'float', look: { skin: skin(5), hair: hair(0), shirt: top(4), shorts: bottom(1), height: 1 }, role: fun('Swimmer'), path: [[-12, 5]], yaw: 1.6 },
  { act: 'float', look: { skin: skin(3), hair: hair(2), shirt: top(2), shorts: bottom(5), height: 0.94 }, role: fun('Swimmer'), path: [[7, -5]], yaw: -2 },
]

/** Where the case's four suspects spend the morning: true to who they are. */
const blank = { skin: '', hair: '', shirt: '', height: 1 }
const blankRole = { name: '', line: '' }
const suspectSpots: PersonDef[] = [
  { act: 'stand', look: { ...blank, shorts: '#2b3244', height: 1.02 }, role: blankRole, path: [[KAYAKS[0] + 2.2, KAYAKS[1] + 2.8]], yaw: 0.8, suspectId: 'dev' },
  { act: 'chat', look: { ...blank, shorts: '#c9503f', dress: true, height: 0.96 }, role: blankRole, path: [[BAR[0] - 1.5, BAR[1] + 2.2]], yaw: -2.5, suspectId: 'rosa' },
  { act: 'stand', look: { ...blank, shorts: '#f2c94c' }, role: blankRole, path: [[TOWER[0] + 2.4, TOWER[1] + 1.6]], yaw: 0.2, suspectId: 'imran' },
  { act: 'stand', look: { ...blank, shorts: '#3a4a34', height: 0.95 }, role: blankRole, path: [[HATCHERY[0] + 4.4, HATCHERY[1] - 0.8]], yaw: -1.4, suspectId: 'priya' },
]

export const BEACH_PEOPLE: readonly PersonDef[] = [...suspectSpots, ...volley, ...kids, ...walkers, ...sunbathers, ...fixed, ...dancers, ...bathers]

export const BEACH_ANNOUNCEMENTS: readonly string[] = [
  'Good morning, Coral Cove. Red flags are out beyond the breakwater today. Please swim only in the lagoon, and listen to the lifeguards.',
  'A notice from the forest department. The turtle hatchery is closed. If you saw anything near it before dawn, please speak to the forest guard or call 112.',
  'Please take your rubbish with you. Plastic in the sea can kill a turtle. And please keep lights off this beach at night during nesting season.',
  'Parents, a lost child’s flip-flop has been handed in. The lost-property table is by the boardwalk.',
]
