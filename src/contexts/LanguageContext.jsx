import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext({})

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

export const translations = {
  en: {
    // App & Nav
    appName: 'EcoWatch',
    tagline: 'Intelligent waste management automated.',
    signIn: 'Sign In',
    signOut: 'Sign out',
    register: 'Get Started',
    welcomeBack: 'Welcome back',
    enterCredentials: 'Enter your credentials to access your dashboard',
    emailAddress: 'Email address',
    password: 'Password',
    authenticating: 'Authenticating...',
    dontHaveAccount: "Don't have an account?",
    createOne: 'CREATE ONE',
    alreadyRegistered: 'Already registered at VJTI?',

    // Roles
    roleUser: 'Student / Reporter',
    roleWorker: 'Field Staff',
    roleAdmin: 'Facility Admin',
    reporter: 'Reporter',
    worker: 'Field Operations',
    admin: 'Command Center',

    // Status & Severity
    statusPending: 'Pending',
    statusAssigned: 'Assigned',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    severityLow: 'Low',
    severityMedium: 'Medium',
    severityHigh: 'Critical',
    priority: 'Priority',
    full: 'Full',

    // Worker Dashboard
    optimizedItinerary: 'Optimized Itinerary',
    targets: 'Targets',
    distance: 'Distance',
    estDuration: 'Est. Duration',
    voiceAssistant: 'Hands-Free Voice Assistant',
    pushToTalk: 'PUSH-TO-TALK',
    holdToSpeak: 'HOLD TO SPEAK',
    releaseToProcess: 'RELEASE TO PROCESS',
    voicePromptDefault: "Hold button to speak: 'Next stop', 'Start task', 'Verify cleaning'",
    voiceListening: 'Listening for voice command...',
    voiceProcessing: 'Processing voice input...',
    assignedTasks: 'Assigned Tasks',
    queueClear: 'Queue clear.',
    noPendingOps: 'No pending operations.',
    acceptAssignment: 'Accept Assignment',
    commenceWork: 'Commence Work',
    finalizeTask: 'Finalize Task',
    verificationSource: 'Verification Source',
    camera: 'Camera',
    uploadFile: 'Upload File',
    cancel: 'Cancel',
    captureImage: 'Capture Proof',
    reviewDocumentation: 'Review Documentation',
    submitRecord: 'Submit Record',
    retakeImage: 'Retake Image',
    verifyingCleanliness: 'Verifying cleanliness standards with AI...',

    // Voice Responses
    voiceNextStop: (code, loc, fill) => `Next stop is ${code} at ${loc}. Current fill level is ${fill} percent.`,
    voiceTaskStarted: 'Task started. Good luck with the cleaning.',
    voiceOpeningCamera: 'Opening verification camera. Please show the empty bin clearly.',
    voiceAllCompleted: 'Great job! All assigned cleaning tasks are completed.',
    voiceUnknown: "Command recognized. Try saying 'Next stop', 'Start task', or 'Verify cleaning'.",

    // User Dashboard
    campusWasteActions: 'Campus Waste Actions',
    userTagline: 'Help maintain VJTI campus cleanliness with instant AI verification and spatial hotspot reporting.',
    reportBinFill: 'Report Bin Fill',
    aiVisionInspection: 'AI vision inspection',
    overflowOutside: 'Overflow Outside',
    spilloverAlert: 'Spillover alert',
    requestBinHere: 'Request Bin Here',
    dropSpatialPin: 'Drop spatial pin',
    recentLogs: 'Recent Logs',
    entries: 'ENTRIES',
    captureProof: 'Capture Proof',
    coordinates: 'Coordinates',
    detectedTarget: 'Detected Target',
    diagnosticAnalysis: 'Diagnostic Analysis',
    fillVolume: 'Fill Volume',
    classification: 'Classification',
    confidence: 'Confidence',

    // Admin Dashboard
    liveGrid: 'Spatial Intelligence & Bin Placement',
    activeSensors: 'Active Sensors',
    showGhostPins: 'Show Ghost Pins',
    budget: 'Budget',
    walkRadius: 'Walk Radius',
    coverage: 'Coverage',
    formulateStrategy: 'Formulate Strategy',
    formulating: 'Formulating...',
    strategicPlan: 'Strategic Plan Generated',
    approveDispatch: 'Approve & Dispatch',
    deployGhostBin: 'Approve & Deploy',
    dismiss: 'Dismiss',
    totalIncidents: 'Total Incidents',
    activeTasks: 'Active Tasks',
    resolved: 'Resolved',
    avgTimeMin: 'Avg Time (min)',
    incidentVelocity: 'Incident Velocity',
    sectorAnalysis: 'Sector Analysis',

    // Common
    loading: 'Loading...',
    back: 'Back'
  },

  hi: {
    // App & Nav
    appName: 'इकोवॉच (EcoWatch)',
    tagline: 'बुद्धिमान परिसर कचरा प्रबंधन प्रणाली।',
    signIn: 'लॉग इन करें',
    signOut: 'साइन आउट',
    register: 'शुरू करें',
    welcomeBack: 'पुनः स्वागत है',
    enterCredentials: 'अपने डैशबोर्ड तक पहुंचने के लिए क्रेडेंशियल दर्ज करें',
    emailAddress: 'ईमेल पता (Email)',
    password: 'पासवर्ड (Password)',
    authenticating: 'प्रमाणीकरण हो रहा है...',
    dontHaveAccount: 'खाता नहीं है?',
    createOne: 'नया खाता बनाएं',
    alreadyRegistered: 'VJTI में पहले से पंजीकृत हैं?',

    // Roles
    roleUser: 'छात्र / रिपोर्टर (Student)',
    roleWorker: 'सफाई कर्मचारी (Field Staff)',
    roleAdmin: 'सुविधा प्रबंधक (Facility Admin)',
    reporter: 'रिपोर्टर (Reporter)',
    worker: 'फील्ड ऑपरेशन्स (Field Operations)',
    admin: 'कमांड सेंटर (Command Center)',

    // Status & Severity
    statusPending: 'लंबित (Pending)',
    statusAssigned: 'सौंपा गया (Assigned)',
    statusInProgress: 'जारी है (In Progress)',
    statusCompleted: 'पूर्ण (Completed)',
    severityLow: 'सामान्य (Low)',
    severityMedium: 'मध्यम (Medium)',
    severityHigh: 'अति-गंभीर (Critical)',
    priority: 'प्राथमिकता',
    full: 'भरा हुआ',

    // Worker Dashboard
    optimizedItinerary: 'अनुकूलित सफाई मार्ग (Optimized Route)',
    targets: 'कुल स्टॉप',
    distance: 'दूरी',
    estDuration: 'अनुमानित समय',
    voiceAssistant: 'हैंड्स-फ्री वॉयस असिस्टेंट (Voice Assistant)',
    pushToTalk: 'बोलने के लिए दबाएं',
    holdToSpeak: 'बोलने के लिए दबाए रखें',
    releaseToProcess: 'प्रोसेस करने के लिए छोड़ें',
    voicePromptDefault: "बोलने के लिए बटन दबाएं: 'अगला स्टॉप', 'काम शुरू करें', 'सफाई हो गई'",
    voiceListening: 'आवाज़ सुनी जा रही है...',
    voiceProcessing: 'आदेश पर कार्रवाई हो रही है...',
    assignedTasks: 'सौंपे गए कार्य (Assigned Tasks)',
    queueClear: 'कोई कार्य शेष नहीं है।',
    noPendingOps: 'सभी कार्य पूर्ण हो चुके हैं।',
    acceptAssignment: 'कार्य स्वीकार करें',
    commenceWork: 'कार्य शुरू करें',
    finalizeTask: 'सत्यापन व पूर्ण करें',
    verificationSource: 'सत्यापन स्रोत',
    camera: 'कैमरा (Camera)',
    uploadFile: 'फ़ाइल अपलोड करें',
    cancel: 'रद्द करें',
    captureImage: 'तस्वीर खींचें',
    reviewDocumentation: 'तस्वीर की समीक्षा करें',
    submitRecord: 'सत्यापन भेजें',
    retakeImage: 'दोबारा फोटो लें',
    verifyingCleanliness: 'AI द्वारा सफाई की जांच की जा रही है...',

    // Voice Responses
    voiceNextStop: (code, loc, fill) => `अगला स्टॉप ${code}, ${loc} पर है। यह अभी ${fill} प्रतिशत भरा हुआ है।`,
    voiceTaskStarted: 'सफाई कार्य शुरू कर दिया गया है। ध्यानपूर्वक सफाई करें।',
    voiceOpeningCamera: 'सत्यापन कैमरा खोला जा रहा है। कृपया साफ किया हुआ डस्टबिन दिखाएं।',
    voiceAllCompleted: 'बहुत बढ़िया! आपके सभी सफाई कार्य सफलतापूर्वक पूर्ण हो चुके हैं।',
    voiceUnknown: "आदेश समझा गया। आप कह सकते हैं: 'अगला स्टॉप', 'काम शुरू करें', या 'सफाई हो गई'।",

    // User Dashboard
    campusWasteActions: 'परिसर स्वच्छता कार्य',
    userTagline: 'त्वरित AI जांच और स्थान-आधारित रिपोर्टिंग द्वारा VJTI परिसर को स्वच्छ रखें।',
    reportBinFill: 'कचरा स्तर रिपोर्ट करें',
    aiVisionInspection: 'AI दृष्टि जांच (Vision)',
    overflowOutside: 'डस्टबिन के बाहर कचरा',
    spilloverAlert: 'अतिप्रवाह चेतावनी',
    requestBinHere: 'यहाँ नया डस्टबिन मांगें',
    dropSpatialPin: 'स्थान पिन दर्ज करें',
    recentLogs: 'हालिया रिपोर्टें',
    entries: 'प्रविष्टियाँ',
    captureProof: 'प्रमाण कैप्चर करें',
    coordinates: 'भौगोलिक निर्देशांक',
    detectedTarget: 'पहचाना गया डस्टबिन',
    diagnosticAnalysis: 'AI निदान विश्लेषण',
    fillVolume: 'भराव क्षमता',
    classification: 'कचरे का प्रकार',
    confidence: 'विश्वसनीयता',

    // Admin Dashboard
    liveGrid: 'स्थानिक बुद्धिमत्ता व डस्टबिन सुझाव (Spatial AI)',
    activeSensors: 'सक्रिय डस्टबिन',
    showGhostPins: 'सुझाए गए स्थान दिखाएं',
    budget: 'बजट (डस्टबिन संख्या)',
    walkRadius: 'पैदल दूरी दायरा',
    coverage: 'परिसर कवरेज',
    formulateStrategy: 'योजना तैयार करें',
    formulating: 'योजना बन रही है...',
    strategicPlan: 'रणनीतिक योजना तैयार',
    approveDispatch: 'स्वीकृत करें और भेजें',
    deployGhostBin: 'स्वीकृत करें व तैनात करें',
    dismiss: 'खारिज करें',
    totalIncidents: 'कुल रिपोर्टें',
    activeTasks: 'सक्रिय कार्य',
    resolved: 'सुलझाए गए कार्य',
    avgTimeMin: 'औसत समय (मिनट)',
    incidentVelocity: 'रिपोर्ट गतिशीलता (Trends)',
    sectorAnalysis: 'विभाग अनुसार विश्लेषण (Sectors)',

    // Common
    loading: 'लोड हो रहा है...',
    back: 'पीछे जाएं'
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('ecowatch_lang') || 'en'
  })

  const setLanguage = (lang) => {
    setLanguageState(lang)
    localStorage.setItem('ecowatch_lang', lang)
  }

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en'
    setLanguage(next)
  }

  const t = (key, ...args) => {
    const langDict = translations[language] || translations.en
    const val = langDict[key] || translations.en[key] || key
    if (typeof val === 'function') {
      return val(...args)
    }
    return val
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

