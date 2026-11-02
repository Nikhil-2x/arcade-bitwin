import type { LevelConfig } from '../types.ts'

export const LEVELS: LevelConfig[] = [
  // ─────────────────────────────────────────────────────────────
  // LEVEL 1: Junction 48 — Hit-and-Run (Good Samaritan & MV Act 134A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Junction 48 — Hit-and-Run',
    titleHi: 'जंक्शन 48 — हिट-एंड-रन',
    subtitle: 'Golden Hour: Road Safety & Good Samaritan Protections',
    subtitleHi: 'गोल्डन ऑवर: सड़क सुरक्षा और नेक मददगार के अधिकार',
    scenarioBrief: 'Dusk at a bustling highway intersection. A scooter rider lies injured on the road. The fleeing driver idles nervously. Bystanders watch, film, and argue, paralyzed by the fear of police harassment and hospital bills. Step forward, break the bystander effect with real laws, and complete the rescue before the Golden Hour expires!',
    scenarioBriefHi: 'शाम के समय एक व्यस्त चौराहे पर एक स्कूटर सवार घायल पड़ा है। टक्कर मारने वाला चालक घबराया हुआ पास में खड़ा है। राहगीर पुलिस और अस्पताल के चक्कर के डर से तमाशबीन बने हैं। आगे बढ़ें, कानून के सही ज्ञान से डर दूर करें और घायल को अस्पताल पहुंचाएं!',
    palette: {
      bg: '#0f172a',
      ground: '#1e293b',
      road: '#334155',
      accent: '#f59e0b',
      ink: '#090d16',
      building: '#1e293b',
      lighting: 'dusk'
    },
    mapWidth: 1200,
    mapHeight: 800,
    victimPos: { x: 580, y: 440 },
    saboteurStartPos: { x: 420, y: 390 },
    rescuerStartPos: { x: 180, y: 640 },
    exitPos: { x: 1120, y: 220 }, // City Hospital Gate
    rescueChain: [
      {
        id: 'L1-R1',
        stepNumber: 1,
        title: 'Assess Scene & Victim',
        titleHi: 'घटनास्थल व घायल की स्थिति जांचें',
        instruction: 'Approach the victim and inspect injuries safely without moving the spine.',
        instructionHi: 'घायल के पास जाएं और रीढ़ को हिलाए बिना चोट की स्थिति परखें।',
        completed: false,
        points: 40
      },
      {
        id: 'L1-R2',
        stepNumber: 2,
        title: 'Call 112 Dispatch',
        titleHi: '112 आपातकालीन कॉल करें',
        instruction: 'Call 112 yourself on the phone booth or persuade a willing witness to call.',
        instructionHi: 'स्वयं फोन से 112 डायल करें या किसी राजी गवाह से कॉल कराएं।',
        completed: false,
        points: 100
      },
      {
        id: 'L1-R3',
        stepNumber: 3,
        title: 'Open Ambulance Lane',
        titleHi: 'एम्बुलेंस लेन का रास्ता खोलें',
        instruction: 'Deploy traffic cones [C] and recruit a bystander to guide the ambulance.',
        instructionHi: 'चेतावनी कोन [C] लगाएं और किसी साथी को एम्बुलेंस का मार्गदर्शन करने कहें।',
        completed: false,
        points: 80
      },
      {
        id: 'L1-R4',
        stepNumber: 4,
        title: 'Victim in Care',
        titleHi: 'घायल को वाहन में सुरक्षित बैठाएं',
        instruction: 'Guide the arriving ambulance or persuade auto-driver Ravi to transport.',
        instructionHi: 'पहुंची एम्बुलेंस में अथवा ऑटो चालक रवि के वाहन में घायल को शिफ्ट करें।',
        completed: false,
        points: 120
      },
      {
        id: 'L1-R5',
        stepNumber: 5,
        title: 'Hospital Handover (Core Mission)',
        titleHi: 'अस्पताल में भर्ती (मुख्य मिशन)',
        instruction: 'Reach City Hospital reception and assert Good Samaritan rights against advance payment demands.',
        instructionHi: 'सिटी अस्पताल रिसेप्शन पहुंचे और बिना अग्रिम शुल्क जमा किए तुरंत इलाज शुरू करवाएं।',
        completed: false,
        points: 160
      }
    ],
    witnesses: [
      {
        id: 'w1',
        name: 'Mr. Sharma',
        nameHi: 'शर्मा जी (दुकानदार)',
        roleDescription: 'Shopkeeper with a landline phone',
        roleDescriptionHi: 'किराना दुकान संचालक जिनके पास फोन है',
        x: 280,
        y: 320,
        avatarColor: '#3b82f6',
        hesitation: 75,
        concerns: ['fears_police'],
        activeConcernIndex: 0,
        status: 'silent',
        holdsProofTokenId: 'token_car_color'
      },
      {
        id: 'w2',
        name: 'Ravi',
        nameHi: 'रवि (ऑटो चालक)',
        roleDescription: 'Auto-rickshaw driver parked nearby',
        roleDescriptionHi: 'सड़क किनारे खड़े ऑटो के चालक',
        x: 320,
        y: 520,
        avatarColor: '#f97316',
        hesitation: 65,
        concerns: ['fears_blame', 'fears_bill'],
        activeConcernIndex: 0,
        status: 'wavering'
      },
      {
        id: 'w3',
        name: 'Priya',
        nameHi: 'प्रिया (छात्रा)',
        roleDescription: 'College student filming with smartphone',
        roleDescriptionHi: 'मोबाइल से वीडियो बना रही कॉलेज छात्रा',
        x: 740,
        y: 420,
        avatarColor: '#ec4899',
        hesitation: 50,
        concerns: ['wants_to_film'],
        activeConcernIndex: 0,
        status: 'filming',
        holdsProofTokenId: 'token_number_plate'
      },
      {
        id: 'w4',
        name: 'Ganesh',
        nameHi: 'गणेश (ढाबा मालिक)',
        roleDescription: 'Highway dhaba owner with road-facing CCTV',
        roleDescriptionHi: 'हाईवे ढाबा मालिक जिनके पास सीसीटीवी कैमरा है',
        x: 240,
        y: 180,
        avatarColor: '#8b5cf6',
        hesitation: 80,
        concerns: ['unsure_of_law', 'busy'],
        activeConcernIndex: 0,
        status: 'silent',
        holdsProofTokenId: 'token_cctv_footage'
      },
      {
        id: 'w5',
        name: 'Mrs. Kaur',
        nameHi: 'कौर आंटी (वरिष्ठ नागरिक)',
        roleDescription: 'Elderly resident waiting at bus shelter',
        roleDescriptionHi: 'बस स्टॉप पर खड़ी बुजुर्ग महिला',
        x: 780,
        y: 260,
        avatarColor: '#10b981',
        hesitation: 60,
        concerns: ['assumes_others_called'],
        activeConcernIndex: 0,
        status: 'wavering'
      },
      {
        id: 'w6',
        name: 'Arjun',
        nameHi: 'अर्जुन (बाइक सवार)',
        roleDescription: 'Biker stopped at the red signal',
        roleDescriptionHi: 'लाल बत्ती पर रुका युवा बाइक सवार',
        x: 640,
        y: 580,
        avatarColor: '#06b6d4',
        hesitation: 45,
        concerns: ['assumes_others_called'],
        activeConcernIndex: 0,
        status: 'wavering'
      }
    ],
    environment: [
      {
        id: 'env_traffic_signal',
        name: 'Pedestrian Signal Box',
        nameHi: 'ट्रैफिक सिग्नल कंट्रोल बॉक्स',
        x: 520,
        y: 280,
        width: 48,
        height: 64,
        type: 'traffic_signal',
        state: 'red',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_ambulance_lane',
        name: 'Emergency Ambulance Corridor',
        nameHi: 'आपातकालीन एम्बुलेंस कॉरिडोर',
        x: 880,
        y: 480,
        width: 120,
        height: 80,
        type: 'ambulance_lane',
        state: 'open',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_dhaba_cctv',
        name: 'Dhaba CCTV DVR & Power Box',
        nameHi: 'ढाबा सीसीटीवी डीवीआर व पावर बॉक्स',
        x: 220,
        y: 140,
        width: 50,
        height: 50,
        type: 'dhaba_cctv',
        state: 'secured',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_auto_rickshaw',
        name: 'Ravi\'s Green Auto-Rickshaw',
        nameHi: 'रवि का सीएनजी ऑटो-रिक्शा',
        x: 360,
        y: 540,
        width: 70,
        height: 60,
        type: 'auto_rickshaw',
        state: 'ready',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      }
    ],
    timeline: [
      {
        id: 'time_cctv_window',
        title: 'CCTV Overwrite Window',
        titleHi: 'सीसीटीवी ओवरराइट खिड़की',
        windowStartSec: 0,
        windowEndSec: 150,
        status: 'active',
        description: 'Secure Dhaba CCTV footage before automatic loop overwrite!'
      },
      {
        id: 'time_patrol_arrival',
        title: 'Police Highway Patrol Passing',
        titleHi: 'हाईवे पुलिस पेट्रोलिंग वैन',
        windowStartSec: 105,
        windowEndSec: 195,
        status: 'pending',
        description: 'Patrol officer passes junction; report driver plate directly!'
      },
      {
        id: 'time_ambulance_eta',
        title: 'Ambulance 108 Arrival Window',
        titleHi: 'एम्बुलेंस 108 आगमन समय',
        windowStartSec: 70,
        windowEndSec: 210,
        status: 'pending',
        description: 'Keep ambulance lane clear of shifted barriers.'
      },
      {
        id: 'time_hospital_shift',
        title: 'Hospital Emergency Shift Change',
        titleHi: 'अस्पताल इमरजेंसी शिफ्ट बदलाव',
        windowStartSec: 240,
        windowEndSec: 270,
        status: 'pending',
        description: 'Complete reception standoff before the desk handover!'
      }
    ],
    discoverableFactCardIds: ['L1-F3', 'L1-F4', 'L1-F5', 'L1-F6', 'L1-F7', 'L1-F9', 'L1-F10', 'L1-FA3', 'L1-FA4', 'L1-FA5'],
    saboteurMythCardIds: ['L1-M1', 'L1-M2', 'L1-M3', 'L1-M4', 'L1-M5', 'L1-M6']
  },

  // ─────────────────────────────────────────────────────────────
  // LEVEL 2: Bazaar & Bank — The Phishing Net (Cyber Fraud & Consumer Rights)
  // ─────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Bazaar & Bank — The Phishing Net',
    titleHi: 'बाजार और बैंक — साइबर जाल',
    subtitle: 'Golden Hour: 1930 Cyber Fraud & Consumer Rights',
    subtitleHi: 'गोल्डन ऑवर: 1930 साइबर ठगी हेल्पलाइन व उपभोक्ता अधिकार',
    scenarioBrief: 'A bustling festival night marketplace. Elderly Uncle Ramesh is on the phone in distress after receiving a fake "Electricity Bill / KYC Expired" alert. Beside him, the Scammer pretends to be a helpful bank executive trying to extract his UPI PIN and cash out at the nearby ATM. Meanwhile, stall vendors are overcharging festive shoppers and fake QR stickers are siphoning payments. Intervene, call 1930, inform the bank manager before the shutter closes, and protect the public!',
    scenarioBriefHi: 'त्योहार की भीड़भाड़ वाले बाजार में बुजुर्ग रमेश जी को बिजली बिल और केवाईसी के नाम पर ठगने की कोशिश हो रही है। पास ही ठग खड़ा होकर उनका यूपीआई पिन पूछ रहा है और एटीएम से पैसे निकालने की फिराक में है। 1930 पर तुरंत कॉल करें, बैंक मैनेजर को सूचना देकर खाता फ्रीज कराएं और लोगों को जागरूक करें!',
    palette: {
      bg: '#180728',
      ground: '#26123e',
      road: '#3d1c5a',
      accent: '#ec4899',
      ink: '#0b0213',
      building: '#2d1448',
      lighting: 'neon'
    },
    mapWidth: 1200,
    mapHeight: 800,
    victimPos: { x: 520, y: 460 }, // Uncle Ramesh
    saboteurStartPos: { x: 570, y: 440 }, // The Scammer
    rescuerStartPos: { x: 160, y: 620 },
    exitPos: { x: 1100, y: 480 }, // ATM / Cash-out exit
    rescueChain: [
      {
        id: 'L2-R1',
        stepNumber: 1,
        title: 'Spot Fraud & Swap QRs',
        titleHi: 'फर्जी क्यूआर व ठगी की पहचान करें',
        instruction: 'Inspect suspicious QR stickers and verify printed MRP tags at the stalls.',
        instructionHi: 'दुकानों पर लगे संदिग्ध क्यूआर स्टिकर और छपे हुए एमआरपी की जांच करें।',
        completed: false,
        points: 40
      },
      {
        id: 'L2-R2',
        stepNumber: 2,
        title: 'Protect Uncle Ramesh (Halt PIN/OTP)',
        titleHi: 'रमेश जी का पिन/ओटीपी साझा होने से रोकें',
        instruction: 'Talk to Uncle Ramesh and convince him NEVER to share UPI PIN to receive money.',
        instructionHi: 'रमेश जी से बात करें और समझाएं कि पैसे पाने के लिए कभी यूपीआई पिन नहीं डाला जाता।',
        completed: false,
        points: 100
      },
      {
        id: 'L2-R3',
        stepNumber: 3,
        title: 'Call 1930 Cyber Helpline',
        titleHi: '1930 साइबर हेल्पलाइन पर कॉल करें',
        instruction: 'Dial 1930 to lodge Citizen Financial Cyber Crime alert and get transaction reference.',
        instructionHi: '1930 पर कॉल कर तत्काल धोखाधड़ी की सूचना दर्ज कराएं और यूटीआर नंबर सुरक्षित करें।',
        completed: false,
        points: 80
      },
      {
        id: 'L2-R4',
        stepNumber: 4,
        title: 'Alert Bank Manager (Freeze Account)',
        titleHi: 'बैंक प्रबंधक को सूचित कर खाता फ्रीज कराएं',
        instruction: 'Reach the bank branch before the shutter closes to place an emergency freeze hold.',
        instructionHi: 'शटर गिरने से पहले बैंक शाखा पहुंचकर पीड़ित के खाते पर रोक लगवाएं।',
        completed: false,
        points: 120
      },
      {
        id: 'L2-R5',
        stepNumber: 5,
        title: 'Marketplace PA Broadcast (Core Mission)',
        titleHi: 'बाजार के लाउडस्पीकर पर घोषणा (मुख्य मिशन)',
        instruction: 'Broadcast cyber-safety and MRP consumer rights on the public PA microphone.',
        instructionHi: 'बाजार के मुख्य माइक से 1930 और उपभोक्ता अधिकारों की चेतावनी प्रसारित करें।',
        completed: false,
        points: 160
      }
    ],
    witnesses: [
      {
        id: 'w2_1',
        name: 'Uncle Ramesh',
        nameHi: 'रमेश जी (बुजुर्ग पेंशनर)',
        roleDescription: 'Targeted pensioner clutching his phone in panic',
        roleDescriptionHi: 'घबराए हुए बुजुर्ग पेंशनर जो फोन पर बात कर रहे हैं',
        x: 520,
        y: 460,
        avatarColor: '#f43f5e',
        hesitation: 80,
        concerns: ['fears_police'],
        activeConcernIndex: 0,
        status: 'wavering',
        holdsProofTokenId: 'token_scam_phone_sms'
      },
      {
        id: 'w2_2',
        name: 'Meena',
        nameHi: 'मीना (कपड़ा दुकानदार)',
        roleDescription: 'Cloth merchant whose UPI QR was tampered',
        roleDescriptionHi: 'कपड़ा व्यापारी जिनके काउंटर का क्यूआर बदला गया है',
        x: 360,
        y: 300,
        avatarColor: '#14b8a6',
        hesitation: 55,
        concerns: ['unsure_of_law'],
        activeConcernIndex: 0,
        status: 'wavering'
      },
      {
        id: 'w2_3',
        name: 'Babu',
        nameHi: 'बाबू (चाय विक्रेता)',
        roleDescription: 'Tea stall vendor who saw the scammer swapping stickers',
        roleDescriptionHi: 'चाय वाले जिन्होंने ठग को स्टिकर बदलते देखा',
        x: 440,
        y: 600,
        avatarColor: '#eab308',
        hesitation: 60,
        concerns: ['busy'],
        activeConcernIndex: 0,
        status: 'wavering',
        holdsProofTokenId: 'token_fake_qr_peeled'
      },
      {
        id: 'w2_4',
        name: 'Aditya',
        nameHi: 'आदित्य (कॉलेज छात्र)',
        roleDescription: 'Tech-savvy student who knows cybercrime portal',
        roleDescriptionHi: 'इंटरनेट की समझ रखने वाला युवा छात्र',
        x: 740,
        y: 520,
        avatarColor: '#a855f7',
        hesitation: 25,
        concerns: ['assumes_others_called'],
        activeConcernIndex: 0,
        status: 'willing'
      },
      {
        id: 'w2_5',
        name: 'Mr. Verma',
        nameHi: 'वर्मा जी (बैंक प्रबंधक)',
        roleDescription: 'Bank Branch Manager at the customer service counter',
        roleDescriptionHi: 'बैंक शाखा प्रबंधक जो काउंटर पर मौजूद हैं',
        x: 940,
        y: 260,
        avatarColor: '#3b82f6',
        hesitation: 50,
        concerns: ['busy'],
        activeConcernIndex: 0,
        status: 'wavering'
      },
      {
        id: 'w2_6',
        name: 'Rina',
        nameHi: 'रीना (उपभोक्ता)',
        roleDescription: 'Shopper being overcharged ₹40 above MRP for sweets',
        roleDescriptionHi: 'मिठाई के डिब्बे पर एमआरपी से 40 रुपये ज्यादा मांगी जा रही ग्राहक',
        x: 620,
        y: 280,
        avatarColor: '#10b981',
        hesitation: 65,
        concerns: ['fears_court'],
        activeConcernIndex: 0,
        status: 'wavering'
      }
    ],
    environment: [
      {
        id: 'env_qr_stand',
        name: 'Merchant Counter QR Stand',
        nameHi: 'दुकान का क्यूआर स्टैंड',
        x: 370,
        y: 330,
        width: 44,
        height: 50,
        type: 'qr_stand',
        state: 'tampered',
        tamperedBySaboteur: true,
        interactionCooldown: 0
      },
      {
        id: 'env_price_board',
        name: 'Festival Price List & MRP Display',
        nameHi: 'त्योहार मूल्य सूची व एमआरपी बोर्ड',
        x: 630,
        y: 240,
        width: 60,
        height: 50,
        type: 'price_board',
        state: 'overcharging',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_atm_bank',
        name: 'ATM Cash-Out Kiosk & Shutter',
        nameHi: 'एटीएम कैश-आउट कियोस्क व बैंक शटर',
        x: 1040,
        y: 360,
        width: 80,
        height: 90,
        type: 'atm_bank',
        state: 'open',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_pa_mic',
        name: 'Market Central PA Announcement System',
        nameHi: 'बाजार का केंद्रीय लाउडस्पीकर माइक',
        x: 720,
        y: 380,
        width: 40,
        height: 60,
        type: 'pa_mic',
        state: 'ready',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      }
    ],
    timeline: [
      {
        id: 'time_otp_countdown',
        title: 'OTP Validity Window (Urgent)',
        titleHi: 'ओटीपी की वैधता समयसीमा',
        windowStartSec: 0,
        windowEndSec: 90,
        status: 'active',
        description: 'Stop Uncle Ramesh before he enters his UPI PIN or reads SMS code!'
      },
      {
        id: 'time_bank_shutter',
        title: 'Bank Branch Evening Shutter',
        titleHi: 'बैंक शाखा का शाम का शटर',
        windowStartSec: 120,
        windowEndSec: 210,
        status: 'pending',
        description: 'Notify Bank Manager Verma to freeze account before evening lock!'
      },
      {
        id: 'time_police_beat',
        title: 'Beat Constable Patrol Passing',
        titleHi: 'बीट सिपाही की गश्त',
        windowStartSec: 150,
        windowEndSec: 240,
        status: 'pending',
        description: 'Beat Constable passes tea stall; report scammer physical description!'
      }
    ],
    discoverableFactCardIds: ['L2-F3', 'L2-F4', 'L2-F5', 'L2-F6'],
    saboteurMythCardIds: ['L2-M1', 'L2-M2', 'L2-M3', 'L2-M4']
  },

  // ─────────────────────────────────────────────────────────────
  // LEVEL 3: Station House — Know Your Rights (Zero FIR & Police Duty)
  // ─────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Station House — Know Your Rights',
    titleHi: 'थाना परिसर — अपने अधिकार जानिए',
    subtitle: 'Golden Hour: Zero FIR, Free Copy & Legal Escalation',
    subtitleHi: 'गोल्डन ऑवर: जीरो एफआईआर, निःशुल्क प्रति व कानूनी प्रक्रिया',
    scenarioBrief: 'Asha reached Sector 9 Police Station after her purse and phone were violently snatched near the interstate railway terminal. Outside the gate, a shady tout (The Fixer) approaches, falsely telling her this station cannot write an FIR because the snatching occurred 30 km away, and demanding ₹500 to "settle" things with the clerk. Enter the station house, assert your statutory right to a Zero FIR under BNSS 173, obtain a free FIR copy, and hold middlemen accountable!',
    scenarioBriefHi: 'आशा के साथ अंतरराज्यीय बस अड्डे पर मोबाइल व पर्स की झपटमारी हुई और वह सेक्टर 9 थाने पहुंची है। बाहर दलाल खड़ा होकर कह रहा है कि यह हमारा इलाका नहीं है और ₹500 की मांग कर रहा है। थाने में जाएं, BNSS 173 के तहत जीरो एफआईआर और मुफ्त प्रति का कानूनी अधिकार जताएं!',
    palette: {
      bg: '#0a1d17',
      ground: '#133026',
      road: '#1d4336',
      accent: '#10b981',
      ink: '#05110d',
      building: '#18382c',
      lighting: 'office'
    },
    mapWidth: 1200,
    mapHeight: 800,
    victimPos: { x: 380, y: 520 }, // Asha (the complainant)
    saboteurStartPos: { x: 320, y: 560 }, // The Fixer
    rescuerStartPos: { x: 180, y: 640 },
    exitPos: { x: 960, y: 160 }, // SHO Office Chamber
    rescueChain: [
      {
        id: 'L3-R1',
        stepNumber: 1,
        title: 'Obtain Queue Token',
        titleHi: 'टोकन मशीन से पर्ची लें',
        instruction: 'Approach the citizen token dispenser and secure your complaint queue number.',
        instructionHi: 'टोकन मशीन से अपनी शिकायत दर्ज कराने हेतु कतार नंबर प्राप्त करें।',
        completed: false,
        points: 40
      },
      {
        id: 'L3-R2',
        stepNumber: 2,
        title: 'Present Incident Facts to Duty Officer',
        titleHi: 'ड्यूटी ऑफिसर को घटना का स्पष्ट विवरण दें',
        instruction: 'Clearly explain the what, where, and when of the violent snatching without panic.',
        instructionHi: 'ड्यूटी ऑफिसर को बिना डरे घटना का स्थान, समय और विवरण स्पष्ट बताएं।',
        completed: false,
        points: 100
      },
      {
        id: 'L3-R3',
        stepNumber: 3,
        title: 'Assert Zero FIR (BNSS 173)',
        titleHi: 'जीरो एफआईआर का वैधानिक अधिकार जताएं',
        instruction: 'Counter territorial jurisdiction objections with BNSS Section 173(1).',
        instructionHi: 'क्षेत्राधिकार के बहाने पर कानून (BNSS 173) का हवाला देकर जीरो एफआईआर दर्ज कराएं।',
        completed: false,
        points: 80
      },
      {
        id: 'L3-R4',
        stepNumber: 4,
        title: 'Collect Free FIR Copy (Core Mission)',
        titleHi: 'एफआईआर की निःशुल्क प्रति प्राप्त करें (मुख्य मिशन)',
        instruction: 'Demand and collect the officially stamped copy of the FIR free of cost.',
        instructionHi: 'बिना कोई शुल्क दिए प्रमाणित एफआईआर की कॉपी तत्काल प्राप्त करें।',
        completed: false,
        points: 160
      },
      {
        id: 'L3-R5',
        stepNumber: 5,
        title: 'Report Fixer & Escalate to SHO/SP',
        titleHi: 'दलाल की शिकायत करें व एसएचओ से अनुमोदन लें',
        instruction: 'Present tout evidence to the Station House Officer (SHO) to prevent extortion of citizens.',
        instructionHi: 'थाना प्रभारी (SHO) को दलाल के सबूत सौंपें ताकि आम जनता से अवैध वसूली रुक सके।',
        completed: false,
        points: 120
      }
    ],
    witnesses: [
      {
        id: 'w3_1',
        name: 'Asha',
        nameHi: 'आशा (शिकायतकर्ता)',
        roleDescription: 'Snatching victim intimidated by the fixer',
        roleDescriptionHi: 'झपटमारी की शिकार महिला जो दलाल की बातों से घबराई हैं',
        x: 380,
        y: 520,
        avatarColor: '#f43f5e',
        hesitation: 70,
        concerns: ['fears_police'],
        activeConcernIndex: 0,
        status: 'wavering',
        holdsProofTokenId: 'token_snatcher_bike_clue'
      },
      {
        id: 'w3_2',
        name: 'Duty Officer HC Rao',
        nameHi: 'हेड कांस्टेबल राव (ड्यूटी ऑफिसर)',
        roleDescription: 'Officer at the intake desk dealing with huge case backlog',
        roleDescriptionHi: 'रिपोर्ट लिखने वाले ड्यूटी अधिकारी जो काम के बोझ तले हैं',
        x: 640,
        y: 360,
        avatarColor: '#3b82f6',
        hesitation: 60,
        concerns: ['busy', 'unsure_of_law'],
        activeConcernIndex: 0,
        status: 'wavering'
      },
      {
        id: 'w3_3',
        name: 'Advocate Sunita',
        nameHi: 'सुनीता जी (पैरा-लीगल स्वयंसेवक)',
        roleDescription: 'Legal aid volunteer helping citizens in the waiting hall',
        roleDescriptionHi: 'प्रतीक्षालय में नागरिकों की सहायता कर रहीं कानूनी स्वयंसेवक',
        x: 480,
        y: 420,
        avatarColor: '#10b981',
        hesitation: 10,
        concerns: [],
        activeConcernIndex: 0,
        status: 'willing'
      },
      {
        id: 'w3_4',
        name: 'Mr. Das',
        nameHi: 'दास बाबू (सह-शिकायतकर्ता)',
        roleDescription: 'Scared citizen who was almost persuaded to pay ₹500 bribe',
        roleDescriptionHi: 'घबराए हुए नागरिक जिन्हें दलाल ने पैसे देने के लिए भड़काया',
        x: 520,
        y: 620,
        avatarColor: '#f59e0b',
        hesitation: 75,
        concerns: ['fears_bill', 'intimidation'],
        activeConcernIndex: 0,
        status: 'silent'
      },
      {
        id: 'w3_5',
        name: 'SHO Inspector Deshmukh',
        nameHi: 'एसएचओ देशमुख (थाना प्रभारी)',
        roleDescription: 'Senior Officer-in-Charge in the main office chamber',
        roleDescriptionHi: 'थाना प्रभारी जो मुख्य कार्यालय में बैठते हैं',
        x: 940,
        y: 180,
        avatarColor: '#6366f1',
        hesitation: 35,
        concerns: ['busy'],
        activeConcernIndex: 0,
        status: 'wavering'
      }
    ],
    environment: [
      {
        id: 'env_token_machine',
        name: 'Citizen Queue Token Machine',
        nameHi: 'नागरिक टोकन वितरण मशीन',
        x: 420,
        y: 450,
        width: 40,
        height: 60,
        type: 'token_machine',
        state: 'ready',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_direction_sign',
        name: 'Station Helpdesk Direction Signs',
        nameHi: 'थाना सहायता कक्ष मार्गदर्शक बोर्ड',
        x: 580,
        y: 460,
        width: 60,
        height: 40,
        type: 'direction_sign',
        state: 'correct',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_charter_board',
        name: 'Citizen Rights & Zero FIR Notice Board',
        nameHi: 'नागरिक अधिकार व जीरो एफआईआर सूचना पट्ट',
        x: 740,
        y: 280,
        width: 80,
        height: 50,
        type: 'charter_board',
        state: 'visible',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      },
      {
        id: 'env_counter_shutter',
        name: 'General Intake Counter Shutter',
        nameHi: 'जनरल रिपोर्टिंग काउंटर शटर',
        x: 880,
        y: 360,
        width: 60,
        height: 70,
        type: 'counter_shutter',
        state: 'open',
        tamperedBySaboteur: false,
        interactionCooldown: 0
      }
    ],
    timeline: [
      {
        id: 'time_duty_window',
        title: 'Duty Officer Desk Rotation',
        titleHi: 'ड्यूटी ऑफिसर शिफ्ट समय',
        windowStartSec: 0,
        windowEndSec: 165,
        status: 'active',
        description: 'Lodge FIR before Duty Officer leaves for court summons!'
      },
      {
        id: 'time_counter_lunch',
        title: 'Intake Counter Maintenance Break',
        titleHi: 'काउंटर रख-रखाव विराम',
        windowStartSec: 180,
        windowEndSec: 220,
        status: 'pending',
        description: 'Keep direction signs clear before the temporary maintenance break.'
      },
      {
        id: 'time_sho_round',
        title: 'SHO Inspection Round',
        titleHi: 'थाना प्रभारी (SHO) का निरीक्षण राउंड',
        windowStartSec: 195,
        windowEndSec: 255,
        status: 'pending',
        description: 'SHO inspects the waiting hall; ideal time to report tout extortion!'
      }
    ],
    discoverableFactCardIds: ['L3-F3', 'L3-F4', 'L3-F5', 'L3-F6'],
    saboteurMythCardIds: ['L3-M1', 'L3-M2', 'L3-M3', 'L3-M4']
  }
]

export function getLevelById(id: number): LevelConfig {
  return LEVELS.find((l) => l.id === id) || LEVELS[0]
}

