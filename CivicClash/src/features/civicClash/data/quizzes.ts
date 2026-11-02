import type { PopQuizQuestion } from '../types.ts'

export const QUIZ_QUESTIONS: PopQuizQuestion[] = [
  // Level 1: Good Samaritan & Hit-and-Run
  {
    id: 'Q1-1',
    levelId: 1,
    question: 'Under Section 134A of the Motor Vehicles Act, what happens if an accident victim unfortunately passes away despite your good-faith help?',
    questionHi: 'मोटर वाहन अधिनियम की धारा 134A के अनुसार, यदि आपके नेक नीयत से मदद करने के बावजूद घायल की मृत्यु हो जाती है, तो क्या होगा?',
    options: [
      { text: 'The helper is completely immune from civil or criminal liability', textHi: 'मददगार पर कोई दीवानी या आपराधिक कार्रवाई नहीं हो सकती', isCorrect: true },
      { text: 'The helper must pay 50% of the victim\'s medical bill', textHi: 'मददगार को 50% मेडिकल बिल देना होगा', isCorrect: false },
      { text: 'The helper is placed under temporary house arrest', textHi: 'मददगार को नजरबंद किया जाता है', isCorrect: false },
      { text: 'The police impound the helper\'s vehicle for 6 months', textHi: 'पुलिस मददगार का वाहन 6 महीने जब्त रखेगी', isCorrect: false }
    ],
    explanation: 'Section 134A provides total statutory immunity to Good Samaritans acting in good faith without expectation of reward.',
    explanationHi: 'धारा 134A नेक मददगारों को किसी भी कानूनी दायित्व से पूर्ण सुरक्षा प्रदान करती है।',
    legalCitation: 'Motor Vehicles Act 1988, Section 134A'
  },
  {
    id: 'Q1-2',
    levelId: 1,
    question: 'What is the nationwide unified emergency phone number in India to dispatch police and ambulances together?',
    questionHi: 'भारत में पुलिस और एम्बुलेंस को एक साथ बुलाने के लिए राष्ट्रीय एकीकृत आपातकालीन नंबर क्या है?',
    options: [
      { text: '112', textHi: '112', isCorrect: true },
      { text: '911', textHi: '911', isCorrect: false },
      { text: '1000', textHi: '1000', isCorrect: false },
      { text: '102', textHi: '102', isCorrect: false }
    ],
    explanation: '112 is India\'s single National Emergency Response Support System (ERSS) uniting Police, Fire, and Ambulance.',
    explanationHi: '112 भारत का राष्ट्रीय आपातकालीन नंबर (ERSS) है जो पुलिस और स्वास्थ्य सेवाओं को तुरंत जोड़ता है।',
    legalCitation: 'Emergency Response Support System (ERSS), MHA'
  },
  {
    id: 'Q1-3',
    levelId: 1,
    question: 'When arriving at an accident scene with a crowd standing around frozen, what is the most effective psychological technique to get help?',
    questionHi: 'दुर्घटना स्थल पर जमा भीड़ को तुरंत सक्रिय करने का सबसे प्रभावी मनोवैज्ञानिक तरीका क्या है?',
    options: [
      { text: 'Look directly at one person, name/describe them, and assign a specific task', textHi: 'किसी एक व्यक्ति की ओर देखकर सीधे काम सौंपें', isCorrect: true },
      { text: 'Shout "Someone help!" into the sky', textHi: 'हवा में चिल्लाएं "कोई मदद करो!"', isCorrect: false },
      { text: 'Start streaming on social media to shame the crowd', textHi: 'भीड़ को शर्मिंदा करने के लिए लाइव स्ट्रीम करें', isCorrect: false },
      { text: 'Wait until someone else takes the lead', textHi: 'किसी और के आगे आने का इंतजार करें', isCorrect: false }
    ],
    explanation: 'Diffusion of responsibility freezes crowds. Pointing directly breaks "crowd fog" and mobilises bystanders instantly.',
    explanationHi: 'सीधे किसी एक व्यक्ति को जिम्मेदारी देने से भीड़ का संकोच टूटता है और तुरंत कार्रवाई होती है।',
    legalCitation: 'Standard Psychological & Emergency Response Protocols'
  },

  // Level 2: Cyber Fraud & Consumer Rights
  {
    id: 'Q2-1',
    levelId: 2,
    question: 'If you or an elder are tricked into an unauthorised digital payment transfer, what is the crucial helpline to call within the Golden Hour?',
    questionHi: 'यदि आपके खाते से धोखे से पैसे कट जाते हैं, तो गोल्डन ऑवर में तुरंत किस हेल्पलाइन पर फोन करना चाहिए?',
    options: [
      { text: '1930 (National Cyber Financial Fraud Helpline)', textHi: '1930 (राष्ट्रीय साइबर वित्तीय धोखाधड़ी हेल्पलाइन)', isCorrect: true },
      { text: '100', textHi: '100', isCorrect: false },
      { text: '1800', textHi: '1800', isCorrect: false },
      { text: '139', textHi: '139', isCorrect: false }
    ],
    explanation: 'Dialing 1930 triggers the Citizen Financial Cyber Fraud Reporting System to freeze funds across banking nodes before cash out.',
    explanationHi: '1930 पर फोन करने से साइबर सेल तुरंत बैंकों को अलर्ट भेजकर ठगी की रकम फ्रीज कराता है।',
    legalCitation: 'MHA / Indian Cyber Crime Coordination Centre (I4C)'
  },
  {
    id: 'Q2-2',
    levelId: 2,
    question: 'When receiving money or refunds on UPI, when is it necessary to enter your UPI PIN?',
    questionHi: 'यूपीआई पर पैसे या रिफंड प्राप्त करते समय आपको यूपीआई पिन कब दर्ज करना होता है?',
    options: [
      { text: 'NEVER — UPI PIN is only entered to SEND money, never to receive', textHi: 'कभी नहीं — यूपीआई पिन केवल पैसे भेजने के लिए होता है, पाने के लिए नहीं', isCorrect: true },
      { text: 'Whenever receiving money above ₹5,000', textHi: 'जब ₹5,000 से अधिक राशि प्राप्त करनी हो', isCorrect: false },
      { text: 'When the sender says they are from bank customer care', textHi: 'जब भेजने वाला कहे कि वह बैंक से है', isCorrect: false },
      { text: 'During bank holidays and festival weekends', textHi: 'छुट्टियों या त्योहारों के दिन', isCorrect: false }
    ],
    explanation: 'UPI PIN is strictly a debit authorisation. Asking to enter PIN to "receive payment" is the #1 UPI scam.',
    explanationHi: 'यूपीआई पिन डालने का मतलब है आपके खाते से पैसे कटेंगे; पैसे मिलने पर कभी पिन नहीं मांगा जाता।',
    legalCitation: 'RBI / NPCI Digital Payments Security Mandate'
  },
  {
    id: 'Q2-3',
    levelId: 2,
    question: 'Do you need to hire an expensive advocate to file a complaint in a Consumer Dispute Redressal Commission?',
    questionHi: 'क्या उपभोक्ता आयोग में शिकायत दर्ज करने के लिए महंगा वकील करना अनिवार्य है?',
    options: [
      { text: 'No — Consumers can represent themselves or e-file directly without a lawyer', textHi: 'नहीं — उपभोक्ता स्वयं या ऑनलाइन बिना वकील के शिकायत कर सकता है', isCorrect: true },
      { text: 'Yes — High Court advocates must certify every complaint', textHi: 'हाँ — वकील का हस्ताक्षर अनिवार्य है', isCorrect: false },
      { text: 'Only if the disputed amount is below ₹1,000', textHi: 'केवल तभी जब रकम ₹1,000 से कम हो', isCorrect: false },
      { text: 'Yes — Consumer courts do not allow citizens to speak', textHi: 'हाँ — नागरिकों को बोलने की अनुमति नहीं होती', isCorrect: false }
    ],
    explanation: 'Under the Consumer Protection Act 2019, procedures are simplified so common citizens can file and argue their own claims.',
    explanationHi: 'उपभोक्ता संरक्षण कानून आम नागरिकों को बिना वकील के सीधे न्याय पाने का पूरा अधिकार देता है।',
    legalCitation: 'Consumer Protection Act 2019, Section 35'
  },

  // Level 3: FIR, Police Station & Zero FIR
  {
    id: 'Q3-1',
    levelId: 3,
    question: 'What is a "Zero FIR" under Section 173(1) of the Bharatiya Nagarik Suraksha Sanhita (BNSS)?',
    questionHi: 'भारतीय नागरिक सुरक्षा संहिता (BNSS) की धारा 173(1) के तहत "जीरो एफआईआर" क्या है?',
    options: [
      { text: 'An FIR registered at ANY police station regardless of where the incident occurred', textHi: 'किसी भी थाने में दर्ज होने वाली एफआईआर, चाहे घटना कहीं भी हुई हो', isCorrect: true },
      { text: 'An FIR that has zero charges against the accused', textHi: 'एक ऐसी एफआईआर जिसमें कोई आरोप नहीं होता', isCorrect: false },
      { text: 'An FIR that expires within zero hours', textHi: 'एक ऐसी एफआईआर जो तुरंत रद्द हो जाती है', isCorrect: false },
      { text: 'A police record reserved exclusively for traffic fines', textHi: 'केवल चालान के लिए इस्तेमाल होने वाली पर्ची', isCorrect: false }
    ],
    explanation: 'Zero FIR ensures that victims of cognizable crimes are never turned away by border or territorial jurisdiction excuses.',
    explanationHi: 'जीरो एफआईआर यह सुनिश्चित करती है कि कोई भी थाना क्षेत्राधिकार का बहाना बनाकर पीड़ित को न लौटाए।',
    legalCitation: 'BNSS 2023, Section 173(1)'
  },
  {
    id: 'Q3-2',
    levelId: 3,
    question: 'How much does an informant have to pay to receive a certified copy of the registered FIR?',
    questionHi: 'दर्ज एफआईआर की प्रमाणित प्रति प्राप्त करने के लिए शिकायतकर्ता को कितना शुल्क देना पड़ता है?',
    options: [
      { text: '₹0 — It is strictly FREE of cost and given immediately', textHi: '₹0 — यह बिल्कुल निःशुल्क और तुरंत मिलती है', isCorrect: true },
      { text: '₹500 stamp duty fee', textHi: '₹500 का स्टाम्प शुल्क', isCorrect: false },
      { text: '₹100 processing charge', textHi: '₹100 का प्रोसेसिंग चार्ज', isCorrect: false },
      { text: 'Free only after a 30-day RTI application', textHi: '30 दिन की आरटीआई के बाद ही मुफ्त', isCorrect: false }
    ],
    explanation: 'BNSS Section 173(2) mandates that a copy of the FIR shall be given forthwith and free of cost to the informant.',
    explanationHi: 'कानून के अनुसार एफआईआर दर्ज होते ही उसकी नकल शिकायतकर्ता को बिना किसी शुल्क के तुरंत दी जानी चाहिए।',
    legalCitation: 'BNSS 2023, Section 173(2)'
  },
  {
    id: 'Q3-3',
    levelId: 3,
    question: 'If the station Duty Officer wrongfully refuses to record your cognizable complaint, what official recourse does BNSS provide?',
    questionHi: 'यदि थानेदार संज्ञेय अपराध की शिकायत लिखने से मना कर दे, तो कानून क्या विकल्प देता है?',
    options: [
      { text: 'Send the complaint in writing or email directly to the Superintendent of Police (SP)', textHi: 'जिले के पुलिस अधीक्षक (SP) को डाक या ईमेल से लिखित शिकायत भेजें', isCorrect: true },
      { text: 'You have no legal option; the station officer\'s word is final', textHi: 'कोई उपाय नहीं है; थानेदार का फैसला अंतिम होता है', isCorrect: false },
      { text: 'Pay a middleman to persuade the clerk', textHi: 'दलाल को पैसे देकर काम करवाएं', isCorrect: false },
      { text: 'Block the road outside the police station', textHi: 'थाने के बाहर चक्का जाम करें', isCorrect: false }
    ],
    explanation: 'BNSS Section 173(4) empowers the citizen to escalate directly to the District SP, who can investigate or order registration.',
    explanationHi: 'BNSS 173(4) नागरिक को सीधे जिले के एसपी से गुहार लगाने और कार्रवाई का आदेश दिलाने का अधिकार देता है।',
    legalCitation: 'BNSS 2023, Section 173(4)'
  }
]

