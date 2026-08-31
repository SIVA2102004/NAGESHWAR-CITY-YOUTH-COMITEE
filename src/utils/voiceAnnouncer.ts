/**
 * AI Voice Soundbox & Divine Blessing Announcer
 * Uses HTML5 SpeechSynthesis to announce payment credits like a Paytm/PhonePe Smart Soundbox with Lord Ganesha's blessings!
 */

export interface AnnouncementParams {
  name: string
  amount: number
  roomNumber?: string
  isGroup?: boolean
  memberCount?: number
  lang?: 'te-IN' | 'en-IN'
}

export function announcePaymentSuccess({
  name,
  amount,
  roomNumber,
  isGroup = false,
  memberCount = 1,
  lang = 'en-IN',
}: AnnouncementParams) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  let announcementText = ''

  if (lang === 'te-IN') {
    // 🇮🇳 Telugu Divine Announcement
    if (isGroup && roomNumber) {
      announcementText = `శ్రీ నాగేశ్వర్ గణేష్ చందా: రూమ్ నెంబర్ ${roomNumber}, ${memberCount} మంది సభ్యుల నుండి మొత్తం ${amount} రూపాయలు విజయవంతంగా జమ అయ్యాయి. గణపతి బప్పా ఆశీస్సులు మీ అందరికీ ఎల్లప్పుడూ ఉండాలి. గణపతి బప్పా మోరియా!`
    } else if (roomNumber) {
      announcementText = `శ్రీ నాగేశ్వర్ గణేష్ చందా: రూమ్ నెంబర్ ${roomNumber}, ${name} గారు ${amount} రూపాయలు చెల్లించారు. గణపతి దేవుని ఆశీస్సులు మీకు మరియు మీ కుటుంబానికి ఎల్లప్పుడూ ఉండాలని కోరుకుంటున్నాము. గణపతి బప్పా మోరియా!`
    } else {
      announcementText = `శ్రీ నాగేశ్వర్ గణేష్ చందా: ${name} గారు ${amount} రూపాయల విరాళం చెల్లించారు. గణపతి దేవుని ఆశీస్సులు మీకు ఎల్లప్పుడూ ఉండాలి. గణపతి బప్పా మోరియా!`
    }
  } else {
    // 🇬🇧 English Soundbox Announcement
    if (isGroup && roomNumber) {
      announcementText = `Payment received! Room ${roomNumber}, ${memberCount} members paid total ${amount} rupees for Sri Nageshwar Ganesh Festival. May Lord Ganesha shower divine blessings upon all of you! Ganapati Bappa Morya!`
    } else if (roomNumber) {
      announcementText = `Payment received! Room ${roomNumber}, ${name} paid ${amount} rupees for Sri Nageshwar Ganesh Festival. May Lord Ganesha bless him and his family with good health and prosperity! Ganapati Bappa Morya!`
    } else {
      announcementText = `Payment received! ${name} paid ${amount} rupees for Sri Nageshwar Ganesh Festival. May Lord Ganesha bless you and your family! Ganapati Bappa Morya!`
    }
  }

  const utterance = new SpeechSynthesisUtterance(announcementText)
  utterance.rate = 0.95 // Clear and dignified speed
  utterance.pitch = 1.05 // Warm and respectful tone
  utterance.lang = lang

  // Select best matching voice if available
  const voices = window.speechSynthesis.getVoices()
  const matchingVoice = voices.find(v => v.lang === lang || v.lang.startsWith(lang.slice(0, 2)))
  if (matchingVoice) {
    utterance.voice = matchingVoice
  }

  window.speechSynthesis.speak(utterance)
}
