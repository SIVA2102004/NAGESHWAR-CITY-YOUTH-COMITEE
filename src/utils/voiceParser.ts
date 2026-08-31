/**
 * AI Voice Collection Parser (English & Telugu)
 * Parses spoken voice input into structured contribution data.
 */

export interface ParsedVoiceData {
  name?: string
  room?: string
  amount?: number
  paymentMethod?: 'UPI' | 'Cash' | 'Online' | 'Cheque'
  rawTranscript: string
}

// Telugu number word mappings
const TELUGU_NUMBERS: Record<string, number> = {
  'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
  'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'యాభై': 50, 'యాభై ఒకటి': 51,
  'వంద': 100, 'నూరు': 100, 'నూట ఒకటి': 101,
  'రెండు వందలు': 200, 'రెండు వందల యాభై': 250, 'రెండు వందల యాభై ఒకటి': 251,
  'మూడు వందలు': 300, 'నాలుగు వందలు': 400,
  'ఐదు వందలు': 500, 'ఐదు వందల ఒకటి': 501,
  'ఆరు వందలు': 600, 'ఏడు వందలు': 700, 'ఎనిమిది వందలు': 800, 'తొమ్మిది వందలు': 900,
  'వెయ్యి': 1000, 'వెయ్యి నూట పదకొండు': 1111,
  'రెండు వేలు': 2000, 'రెండు వేల నూట పదకొండు': 2111,
  'ఐదు వేలు': 5000, 'పది వేలు': 10000,
}

export function parseVoiceSpeech(text: string): ParsedVoiceData {
  const result: ParsedVoiceData = {
    rawTranscript: text,
  }

  const clean = text.trim()
  const lower = clean.toLowerCase()

  // 1. PAYMENT METHOD DETECTION
  if (lower.includes('upi') || lower.includes('phonepe') || lower.includes('gpay') || lower.includes('google pay') || lower.includes('paytm') || text.includes('యుపిఐ') || text.includes('ఫోన్ పే')) {
    result.paymentMethod = 'UPI'
  } else if (lower.includes('cash') || text.includes('నగదు') || text.includes('చేతికి') || text.includes('డబ్బులు')) {
    result.paymentMethod = 'Cash'
  } else if (lower.includes('online') || lower.includes('transfer') || text.includes('ఆన్‌లైన్')) {
    result.paymentMethod = 'Online'
  } else if (lower.includes('cheque') || lower.includes('check') || text.includes('చెక్')) {
    result.paymentMethod = 'Cheque'
  }

  // 2. ROOM / FLAT NUMBER DETECTION
  // e.g. "room 204", "flat 302", "room no 12", "గది 204", "రూమ్ 204", "రూమ్ నెంబర్ 204"
  const roomRegex = /(?:room|flat|door|house|గది|రూమ్|రూము|ఫ్లాట్)(?:\s*(?:no|number|నంబర్|నెంబర్))?\s*[:#-]?\s*([a-zA-Z0-9/-]+)/i
  const roomMatch = clean.match(roomRegex)
  if (roomMatch && roomMatch[1]) {
    result.room = roomMatch[1].toUpperCase()
  }

  // 3. AMOUNT DETECTION
  // First check for direct numeric amounts: "500", "500 rupees", "₹500", "500 రూపాయలు"
  const numRegex = /(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rupees?|rupee|bucks|రూపాయలు|రూ\.)?/i
  const numMatch = clean.match(numRegex)
  
  if (numMatch && numMatch[1]) {
    const matchedNum = parseFloat(numMatch[1])
    // If room number matched the same number, search for other numbers
    if (result.room && result.room === numMatch[1]) {
      const allNumbers = clean.match(/\b\d+\b/g)
      if (allNumbers && allNumbers.length > 1) {
        result.amount = parseFloat(allNumbers[1])
      }
    } else {
      result.amount = matchedNum
    }
  }

  // If no numeric amount found, check Telugu words
  if (!result.amount) {
    for (const [telWord, val] of Object.entries(TELUGU_NUMBERS)) {
      if (clean.includes(telWord)) {
        result.amount = val
        break
      }
    }
  }

  // 4. DEVOTEE NAME EXTRACTION
  let remaining = clean
    .replace(/(?:room|flat|door|house|గది|రూమ్|రూము|ఫ్లాట్)(?:\s*(?:no|number|నంబర్|నెంబర్))?\s*[:#-]?\s*[a-zA-Z0-9/-]+/gi, '')
    .replace(/(?:rs\.?|inr|₹)?\s*\d+(?:\.\d{1,2})?\s*(?:rupees?|rupee|bucks|రూపాయలు|రూ\.)?/gi, '')
    .replace(/\b(upi|phonepe|gpay|google pay|paytm|cash|online|transfer|cheque|check)\b/gi, '')
    .replace(/(యుపిఐ|ఫోన్ పే|నగదు|చేతికి|డబ్బులు|ఆన్‌లైన్|చెక్|రూపాయలు|రూ|ఇచ్చారు|ఇచ్చాడు|చెల్లించారు)/gi, '')

  for (const telWord of Object.keys(TELUGU_NUMBERS)) {
    remaining = remaining.replace(new RegExp(telWord, 'gi'), '')
  }

  const candidateName = remaining
    .replace(/[,.-_#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (candidateName.length >= 2) {
    result.name = candidateName.replace(/\b\w/g, c => c.toUpperCase())
  }

  return result
}
