export interface HelplineEntry {
  number: string
  title: string
  titleHi: string
  purpose: string
  purposeHi: string
  availability: string
}

export interface ActionGuideStep {
  step: number
  heading: string
  headingHi: string
  detail: string
  detailHi: string
  badge: string
}

export const OFFICIAL_HELPLINES: HelplineEntry[] = [
  {
    number: '112',
    title: 'National Emergency Response (ERSS)',
    titleHi: 'राष्ट्रीय आपातकालीन सेवा (ERSS)',
    purpose: 'Unified emergency response for Police, Fire, and Ambulance with GPS dispatch.',
    purposeHi: 'पुलिस, एम्बुलेंस और फायर ब्रिगेड के लिए अखिल भारतीय एकीकृत नंबर।',
    availability: '24x7 · Toll Free'
  },
  {
    number: '108',
    title: 'Emergency Medical Ambulance',
    titleHi: 'आपातकालीन एम्बुलेंस सेवा',
    purpose: 'Direct ambulance dispatch with paramedic first-responders on board.',
    purposeHi: 'प्राथमिक चिकित्सा उपकरणों से लैस एम्बुलेंस सेवा।',
    availability: '24x7 · Toll Free'
  },
  {
    number: '1930',
    title: 'Cyber Financial Fraud Helpline',
    titleHi: 'साइबर वित्तीय धोखाधड़ी हेल्पलाइन',
    purpose: 'Immediate freezing of defrauded funds across banks and digital payment gateways.',
    purposeHi: 'खाते से धोखाधड़ी से कटे पैसे को तत्काल विभिन्न बैंकों में होल्ड कराने हेतु।',
    availability: '24x7 · Toll Free'
  },
  {
    number: '1915',
    title: 'National Consumer Helpline (NCH)',
    titleHi: 'राष्ट्रीय उपभोक्ता हेल्पलाइन',
    purpose: 'Grievance lodging for overcharging above MRP, fake goods, and deficient services.',
    purposeHi: 'एमआरपी से अधिक दाम, घटिया सेवा व अनुचित व्यापार की सीधी शिकायत।',
    availability: '8 AM - 8 PM · Toll Free'
  },
  {
    number: '15100',
    title: 'NALSA Free Legal Aid Helpline',
    titleHi: 'नालसा निःशुल्क कानूनी सहायता हेल्पलाइन',
    purpose: 'Free legal advice and appointment of government legal aid advocates for citizens.',
    purposeHi: 'नागरिकों को मुफ्त कानूनी सलाह और सरकारी वकील की सुविधा।',
    availability: '24x7 · Toll Free'
  }
]

export const EMERGENCY_5_STEPS: ActionGuideStep[] = [
  {
    step: 1,
    heading: 'Ensure Scene Safety',
    headingHi: 'घटनास्थल की सुरक्षा परखें',
    detail: 'Never step into heavy traffic without warning oncoming vehicles. Use cones, hazard lights, or visible signals so you do not become a secondary casualty.',
    detailHi: 'आते-जाते वाहनों को रुकने का संकेत दें या चेतावनी कोन लगाएं। खुद को खतरे में डालकर मदद न करें।',
    badge: 'SAFETY'
  },
  {
    step: 2,
    heading: 'Dial 112 on Speaker',
    headingHi: '112 मिलाएं और फोन स्पीकर पर रखें',
    detail: 'Do not assume someone else has called. Clearly state landmark, count of victims, and heavy bleeding. Follow the operator\'s instructions step-by-step.',
    detailHi: 'भीड़ के भरोसे न रहें। लैंडमार्क, घायलों की संख्या व स्थिति बताएं और ऑपरेटर के निर्देशों को सुनें।',
    badge: 'DISPATCH'
  },
  {
    step: 3,
    heading: 'Assign Tasks by Name',
    headingHi: 'किसी एक व्यक्ति को सीधे जिम्मेदारी दें',
    detail: 'Point directly to a specific bystander: "Brother in blue jacket, please guide the ambulance into this lane." Direct delegation breaks crowd paralysis.',
    detailHi: 'भीड़ में किसी एक को देखकर कहें: "आप आगे जाकर एम्बुलेंस को रास्ता दिखाएं।" इससे संकोच टूटता है।',
    badge: 'LEADERSHIP'
  },
  {
    step: 4,
    heading: 'First-Response: Stabilise, Don\'t Move',
    headingHi: 'स्थिर रखें, अनावश्यक न हिलाएं',
    detail: 'Keep the spine and neck straight. Apply firm continuous pressure on heavy bleeding with clean cloth. NEVER give water or food to a trauma victim.',
    detailHi: 'गर्दन और रीढ़ को सीधा रखें। खून बहने पर साफ कपड़े से लगातार दबाएं। घायल को पानी बिल्कुल न पिलाएं।',
    badge: 'FIRST AID'
  },
  {
    step: 5,
    heading: 'Hand Over & Know Your Rights',
    headingHi: 'मरीज सौंपें और अपने अधिकार जानें',
    detail: 'Hand over to paramedics. Under MV Act Section 134A, you are fully immune from liability, hospital advance demands, or forced interrogation. You may leave freely.',
    detailHi: 'एम्बुलेंस आने पर मरीज सौंपें। धारा 134A के तहत आप पर कोई कानूनी बंधन या अस्पताल का खर्च नहीं आता।',
    badge: 'PROTECTION'
  }
]

