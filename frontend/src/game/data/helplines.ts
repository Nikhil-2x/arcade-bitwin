import type { HelplineCard } from '../types.ts'

/**
 * Helpline content bank (story bible, section 10).
 * Numbers must be re-verified against official government sources before public release.
 */
export const HELPLINES: HelplineCard[] = [
  {
    id: 's01', level: 1,
    text: 'You feel someone has been following you for several minutes on a dark road. Who do you call?',
    options: ['112  Emergency', '181  Women helpline', '1098  Childline'],
    correct: [0],
    hint: 'Hint: one number reaches police, fire and ambulance.',
    reason: '112 is the national emergency number for police, fire and ambulance.',
  },
  {
    id: 's02', level: 1,
    text: 'A friend texts that a man keeps harassing her and she needs women-specific support. Who do you call?',
    options: ['108  Ambulance', '181  Women helpline', '1930  Cybercrime'],
    correct: [1],
    hint: 'Hint: a helpline built for women in distress.',
    reason: '181 (and 1091) are women helplines for support and counselling.',
  },
  {
    id: 's03', level: 2,
    text: 'A stranger on the phone demands money and says your account will be blocked. It looks like online fraud. Who do you report to?',
    options: ['112  Emergency', '1930  Cybercrime', '1098  Childline', '108  Ambulance'],
    correct: [1],
    hint: 'Hint: online fraud has its own national reporting line.',
    reason: 'Report cyber fraud and online harassment on 1930 or cybercrime.gov.in.',
  },
  {
    id: 's04', level: 2,
    text: 'A little girl in the market is crying and cannot find her parents. Who do you call?',
    options: ['1098  Childline', '181  Women helpline', '1930  Cybercrime', '101  Fire'],
    correct: [0],
    hint: 'Hint: a helpline for children in need of care.',
    reason: '1098 is Childline, for any child who is lost or in danger.',
  },
  {
    id: 's05', level: 2,
    text: 'Your cab driver takes a strange route and ignores you. You feel unsafe. What do you do?',
    options: ['Call 112 and share your trip', 'Call 1098', 'Call 1930', 'Wait quietly'],
    correct: [0],
    hint: 'Hint: tell someone where you are and reach emergency services.',
    reason: 'Share your trip with a trusted contact and call 112.',
  },
  {
    id: 's06', level: 3,
    text: 'A person has collapsed ahead and needs medical help right now.',
    options: ['108 / 112', '1098  Childline', '1930  Cybercrime', '181  Women helpline'],
    correct: [0], best: 0,
    hint: '',
    reason: '108 dispatches an ambulance. 112 also works and connects to emergency services.',
  },
  {
    id: 's07', level: 3,
    text: 'A group is harassing someone on the road and you need women-specific support.',
    options: ['112  Emergency', '181 or 1091  Women helpline', '108  Ambulance', '1930  Cybercrime'],
    correct: [0, 1], best: 1,
    hint: '',
    reason: '112 and 181/1091 both work. 181/1091 is the best match: police and women-specific support.',
  },
  {
    id: 's08', level: 3,
    text: 'You smell smoke and see a fire in a nearby building.',
    options: ['112 or 101  Fire', '1098  Childline', '1930  Cybercrime', '181  Women helpline'],
    correct: [0], best: 0,
    hint: '',
    reason: '112 or 101 reach emergency and fire services.',
  },
]

export const cardById = (id: string) => HELPLINES.find((c) => c.id === id)!

export const SCAMS = [
  {
    from: 'Unknown sender',
    text: 'Your cab driver has changed. Share OTP 4821 to confirm.',
    why: 'Never share an OTP. No real service asks for it to "confirm" a ride.',
  },
  {
    from: '"Aarav (friend)"',
    text: 'Phone broke! Send Rs 5000 to this number now, I will explain later.',
    why: 'Urgent money requests from a "friend" can be fake. Call them directly first.',
  },
  {
    from: 'Prize Desk',
    text: 'You won a free scooter! Tap the link and enter your bank PIN to claim.',
    why: 'Prizes never need your PIN. Report it at 1930.',
  },
]

export const CODE_PHRASES = ['blue umbrella', 'mango lassi', 'sunflower']
export const FAKE_PHRASES = ['red umbrella', 'orange juice', 'rose garden']

export const TRUST_OPTIONS = [
  { label: 'A woman with two children at a snack stall', good: true, color: 'green' },
  { label: 'A shop owner behind a lit counter, staff badge on', good: true, color: 'yellow' },
  { label: 'Someone standing alone in a closed, dark alley', good: false, color: 'purple' },
]

export const RIDE_OPTIONS = [
  { label: 'Verify the plate number', good: true },
  { label: 'Share your trip with Meera', good: true },
  { label: 'Hop in first, check the plate later', good: false },
  { label: 'Skip the app match, the driver says it is fine', good: false },
]
