import type { MythCard } from '../types.ts'

export const MYTH_CARDS: MythCard[] = [
  // ── LEVEL 1 MYTHS (Hit and Run / Good Samaritan) ──
  {
    id: 'L1-M1',
    level: 1,
    title: 'Court & Police Harassment',
    titleHi: 'पुलिस और कोर्ट के चक्कर',
    whisperText: 'If you touch him, police will summon you for months and ruin your family life!',
    whisperTextHi: 'अगर तुमने इसे छुआ तो पुलिस महीनों चक्कर लगवाएगी और तुम्हारा परिवार बर्बाद हो जाएगा!',
    matchingConcern: 'fears_police',
    counterFactId: 'L1-F2',
    influenceCost: 20
  },
  {
    id: 'L1-M2',
    level: 1,
    title: 'Accidental Blame Trap',
    titleHi: 'सारा दोष तुम्हारे सिर आएगा',
    whisperText: 'If the victim dies in your vehicle, the family will file a murder case against you!',
    whisperTextHi: 'अगर तुम्हारी गाड़ी में इसने दम तोड़ दिया तो घरवाले तुम पर ही केस ठोक देंगे!',
    matchingConcern: 'fears_blame',
    counterFactId: 'L1-F1',
    influenceCost: 20
  },
  {
    id: 'L1-M3',
    level: 1,
    title: 'Hospital Deposit Extortion',
    titleHi: 'अस्पताल लाखों का बिल थमा देगा',
    whisperText: 'Hospitals detain whoever brings the patient and demand ₹50,000 cash advance at the counter!',
    whisperTextHi: 'अस्पताल लाने वाले को ही पकड़ लेते हैं और काउंटर पर पचास हजार नकद मांगते हैं!',
    matchingConcern: 'fears_bill',
    counterFactId: 'L1-F4',
    influenceCost: 20
  },
  {
    id: 'L1-M4',
    level: 1,
    title: 'Someone Already Called',
    titleHi: 'किसी और ने फोन कर दिया होगा',
    whisperText: 'Look at this huge crowd! At least five people have already called 112, don\'t waste your phone battery.',
    whisperTextHi: 'इतनी भीड़ खड़ी है! किसी न किसी ने तो 112 पर फोन कर ही दिया होगा, तुम क्यों परेशान होते हो।',
    matchingConcern: 'assumes_others_called',
    counterFactId: 'L1-F8',
    influenceCost: 15
  },
  {
    id: 'L1-M5',
    level: 1,
    title: 'Viral Video First',
    titleHi: 'पहले वीडियो बनाओ, मदद बाद में',
    whisperText: 'Record a clear 4K video for social media first! That creates public pressure, calling help won\'t trend.',
    whisperTextHi: 'पहले फोन से बढ़िया वीडियो रिकॉर्ड करके रील बनाओ! सोशल मीडिया पर डालो, कॉल करने से कुछ नहीं होता।',
    matchingConcern: 'wants_to_film',
    counterFactId: 'L1-F8',
    influenceCost: 15
  },
  {
    id: 'L1-M6',
    level: 1,
    title: 'Confidential CCTV Lie',
    titleHi: 'सीसीटीवी केवल पुलिस को मिलता है',
    whisperText: 'CCTV footage is strictly confidential state property; sharing or preserving it will get your shop sealed!',
    whisperTextHi: 'दुकान का सीसीटीवी दिखाना गैरकानूनी है; पुलिस तुम्हारी दुकान सील कर देगी!',
    matchingConcern: 'unsure_of_law',
    counterFactId: 'L1-F9',
    influenceCost: 25
  },

  // ── LEVEL 2 MYTHS (Cyber Fraud & Marketplace) ──
  {
    id: 'L2-M1',
    level: 2,
    title: 'Bank Verification Urgent OTP',
    titleHi: 'बैंक कर्मचारी को तुरंत ओटीपी चाहिए',
    whisperText: 'The bank server is blocking your pension account right now! Tell the manager your OTP quickly to verify!',
    whisperTextHi: 'बैंक आपका खाता तुरंत ब्लॉक कर रहा है! जल्दी से मैनेजर साहब को ओटीपी बताकर खाता बचा लो!',
    matchingConcern: 'fears_police',
    counterFactId: 'L2-F2',
    influenceCost: 20
  },
  {
    id: 'L2-M2',
    level: 2,
    title: 'Report Tomorrow Myth',
    titleHi: 'कल सुबह बैंक जाकर देखना',
    whisperText: 'Don\'t bother calling helplines at night, government offices only look at written paperwork tomorrow.',
    whisperTextHi: 'रात को किसी हेल्पलाइन पर फोन मत करो, सरकारी दफ्तर केवल कल सुबह ही काम करेंगे।',
    matchingConcern: 'busy',
    counterFactId: 'L2-F1',
    influenceCost: 20
  },
  {
    id: 'L2-M3',
    level: 2,
    title: 'Expensive Lawyer Barrier',
    titleHi: 'वकील की फीस लाखों में होगी',
    whisperText: 'Filing a consumer or fraud complaint requires paying ₹20,000 to a court advocate! Just write off the loss.',
    whisperTextHi: 'उपभोक्ता फोरम जाने के लिए बीस हजार का वकील करना पड़ता है! पैसे भूल जाओ, कोर्ट के चक्कर मत काटो।',
    matchingConcern: 'fears_court',
    counterFactId: 'L2-F4',
    influenceCost: 25
  },
  {
    id: 'L2-M4',
    level: 2,
    title: 'Festival Surcharge Lie',
    titleHi: 'त्योहार में एमआरपी मान्य नहीं',
    whisperText: 'MRP is only for off-season! Charging extra during rush hours or festivals is 100% legal.',
    whisperTextHi: 'त्योहारों और भीड़ में एमआरपी से ज्यादा वसूलना बिल्कुल कानूनी है, कोई नियम नहीं टूटता।',
    matchingConcern: 'unsure_of_law',
    counterFactId: 'L2-F3',
    influenceCost: 20
  },

  // ── LEVEL 3 MYTHS (Police Station & FIR) ──
  {
    id: 'L3-M1',
    level: 3,
    title: 'Jurisdiction Shunt',
    titleHi: 'यह हमारा इलाका नहीं है',
    whisperText: 'The snatching happened in the other district! Go back 40 km to where it occurred, this station cannot write a single word!',
    whisperTextHi: 'मोबाइल दूसरी जगह छीना गया है! चालीस किलोमीटर दूर उसी थाने जाओ, यहां एक शब्द नहीं लिखा जाएगा!',
    matchingConcern: 'fears_police',
    counterFactId: 'L3-F1',
    influenceCost: 20
  },
  {
    id: 'L3-M2',
    level: 3,
    title: 'FIR Fee Extortion',
    titleHi: 'एफआईआर दर्ज कराने की सरकारी फीस',
    whisperText: 'Getting the stamped copy of an FIR costs ₹500 in government processing fees. Hand it over to the clerk or leave.',
    whisperTextHi: 'एफआईआर की मोहर लगी कॉपी लेने के लिए सरकारी फीस देनी होती है, बिना पैसे दिए कोई पर्ची नहीं मिलेगी।',
    matchingConcern: 'fears_bill',
    counterFactId: 'L3-F2',
    influenceCost: 25
  },
  {
    id: 'L3-M3',
    level: 3,
    title: 'Police Absolute Authority Lie',
    titleHi: 'थानेदार ने मना किया तो सब खत्म',
    whisperText: 'If the Duty Officer turns you down, that is the end of the line! Nobody can overturn an inspector\'s refusal.',
    whisperTextHi: 'अगर इंस्पेक्टर साहब ने मना कर दिया तो बात खत्म! उनके फैसले के आगे किसी की नहीं चलती।',
    matchingConcern: 'intimidation',
    counterFactId: 'L3-F3',
    influenceCost: 25
  },
  {
    id: 'L3-M4',
    level: 3,
    title: 'Apply RTI for FIR Copy',
    titleHi: 'कॉपी के लिए आरटीआई लगानी होगी',
    whisperText: 'FIR is an internal confidential police document. If you want a copy, file an RTI application and wait 30 days.',
    whisperTextHi: 'एफआईआर पुलिस का गोपनीय दस्तावेज है। अगर नकल चाहिए तो आरटीआई लगाओ और एक महीना इंतजार करो।',
    matchingConcern: 'unsure_of_law',
    counterFactId: 'L3-F2',
    influenceCost: 20
  }
]

export function getMythById(id: string): MythCard | undefined {
  return MYTH_CARDS.find((m) => m.id === id)
}

