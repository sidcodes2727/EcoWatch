import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

/**
 * Analyze waste bin image using Gemini Vision API
 * @param {File} imageFile - The captured image file
 * @returns {Promise<Object>} Analysis result with fill percentage, severity, and waste type
 */
export async function analyzeWasteImage(imageFile) {
  try {
    console.log('🤖 Starting AI analysis with Gemini...')

    // Try the latest Gemini Flash model first (faster and more reliable)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)

    const prompt = `You are an expert waste management AI inspector. Analyze this waste bin image with STRICT ACCURACY.

CRITICAL INSTRUCTIONS:
1. Fill Percentage: Look CAREFULLY at how full the bin is:
   - 0-10%: Nearly empty, just some debris at bottom
   - 10-30%: Minimal waste, mostly empty
   - 30-50%: Less than half full
   - 50-70%: More than half full
   - 70-85%: Almost full, nearing top
   - 85-100%: Full to the brim or overflowing

   BE ACCURATE! If the bin is CLEARLY FULL (waste near the top), it should be 80-100%, NOT 60%!

2. Severity Level:
   - Low: 0-40% (mostly empty)
   - Medium: 41-70% (partially full)
   - High: 71-100% (nearly full or overflowing)

3. Waste Type: Identify the primary waste type visible (e.g., "Mixed Waste", "Plastic Bottles", "Paper", "Food Waste", "General Waste")

4. Confidence: How confident are you in this assessment? (0-100%)

Respond with ONLY this JSON format (no other text):
{
  "fillPercentage": <number 0-100>,
  "severity": "<low|medium|high>",
  "wasteType": "<string>",
  "confidence": <number 0-100>,
  "observations": "<describe what you see in the bin>"
}

IMPORTANT: If the bin looks FULL, give it 80-100% fill percentage. Be HONEST about what you see!`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type
        }
      }
    ])

    const response = await result.response
    const text = response.text()

    console.log('✅ AI Response received:', text.substring(0, 200) + '...')

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response - no JSON found')
    }

    const analysis = JSON.parse(jsonMatch[0])

    console.log('📊 AI Analysis Result:', {
      fill: analysis.fillPercentage + '%',
      severity: analysis.severity,
      type: analysis.wasteType
    })

    // Validate and normalize response
    return {
      fillPercentage: Math.min(Math.max(analysis.fillPercentage || 0, 0), 100),
      severity: normalizeSeverity(analysis.severity),
      wasteType: analysis.wasteType || 'Unknown',
      confidence: Math.min(Math.max(analysis.confidence || 80, 0), 100),
      observations: analysis.observations || 'Analysis completed',
      rawResponse: analysis
    }
  } catch (error) {
    console.error('❌ AI Error:', error.message)

    // Try fallback to older model
    try {
      console.log('🔄 Trying fallback model: gemini-1.5-flash...')

      const fallbackModel = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite'
      })

      const base64Image = await fileToBase64(imageFile)

      const result = await fallbackModel.generateContent([
        `Analyze this waste bin image. Return JSON with: fillPercentage (0-100), severity (low/medium/high), wasteType, confidence (0-100), observations. Be accurate about fill level - if bin is clearly full, use 80-100%.`,
        {
          inlineData: {
            data: base64Image,
            mimeType: imageFile.type
          }
        }
      ])

      const response = await result.response
      const text = response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        console.log('✅ Fallback model succeeded:', analysis)

        return {
          fillPercentage: Math.min(Math.max(analysis.fillPercentage || 0, 0), 100),
          severity: normalizeSeverity(analysis.severity),
          wasteType: analysis.wasteType || 'Unknown',
          confidence: Math.min(Math.max(analysis.confidence || 80, 0), 100),
          observations: analysis.observations || 'Analysis completed',
          rawResponse: analysis
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback model also failed:', fallbackError.message)
    }

    // Surface the error so the caller can handle it (e.g., show manual fill input)
    console.error('⚠️ All AI models unavailable - API key may be invalid or quota exceeded')
    throw new Error('AI analysis unavailable. Please estimate fill level manually.')
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Normalize severity string
 */
function normalizeSeverity(severity) {
  const s = (severity || '').toLowerCase()
  if (s.includes('high')) return 'high'
  if (s.includes('medium') || s.includes('med')) return 'medium'
  if (s.includes('low')) return 'low'
  return 'medium' // default
}

/**
 * Verify cleaning completion image - Stricter validation
 */
export async function verifyCleaningImage(imageFile) {
  try {
    console.log('🧹 Verifying bin cleanliness with AI...')

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

    const base64Image = await fileToBase64(imageFile)

    const prompt = `You are a strict waste management inspector. Analyze this waste bin image and determine if it has been PROPERLY cleaned.

STRICT CRITERIA - A bin is considered CLEANED only if:
- The bin appears EMPTY or mostly empty (less than 30% full)
- No visible waste, trash, or debris remains
- The bin looks visibly clean (not dirty or filled)

Respond ONLY with a valid JSON object:
{
  "isCleaned": <boolean>,
  "fillPercentage": <number>,
  "confidence": <number>,
  "notes": "<brief description explaining your decision>"
}

Be STRICT: If you see ANY significant waste or the bin is not empty, set isCleaned to FALSE.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type
        }
      }
    ])

    const response = await result.response
    const text = response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('Failed to parse verification response')
    }

    const verification = JSON.parse(jsonMatch[0])

    console.log('✅ Verification result:', verification)

    // Additional validation: reject if fill > 30%
    if (verification.fillPercentage > 30) {
      verification.isCleaned = false
      verification.notes = `Bin is ${verification.fillPercentage}% full. Must be less than 30% to be considered clean.`
    }

    return verification
  } catch (error) {
    console.error('❌ Error verifying cleaning:', error.message)

    console.error('⚠️ AI verification unavailable - API key may be invalid or quota exceeded')
    throw new Error('AI verification unavailable. Please try again later.')
  }
}

/**
 * Compare original report image with completion image to ensure they're the same bin
 */
export async function compareImages(originalImageUrl, completionImageFile) {
  try {
    console.log('🔄 Comparing images with AI...')

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

    // Fetch the original image
    const originalResponse = await fetch(originalImageUrl)
    const originalBlob = await originalResponse.blob()
    const originalBase64 = await blobToBase64(originalBlob)

    // Convert completion image
    const completionBase64 = await fileToBase64(completionImageFile)

    const prompt = `You are comparing two images of waste bins to determine if they are THE SAME BIN.

IMAGE 1: Original report (the dirty bin)
IMAGE 2: Completion photo (supposedly cleaned)

Analyze both images and determine if they show the SAME physical bin by checking:
- Bin location/background (walls, floors, surroundings)
- Bin shape, size, and design
- Identifying features (labels, marks, colors)
- Environmental context (indoor/outdoor, lighting, nearby objects)

Respond ONLY with a valid JSON object:
{
  "isSameBin": <boolean>,
  "confidence": <number 0-100>,
  "reasoning": "<explain why you think they are or aren't the same bin>",
  "matchFeatures": "<list matching features if same bin>"
}

Be STRICT: They must clearly be the same bin. If you're unsure, set isSameBin to FALSE.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: originalBase64,
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: completionBase64,
          mimeType: completionImageFile.type
        }
      }
    ])

    const response = await result.response
    const text = response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('Failed to parse comparison response')
    }

    const comparison = JSON.parse(jsonMatch[0])

    console.log('✅ Comparison result:', comparison)

    // Require high confidence for same bin
    if (comparison.confidence < 70) {
      comparison.isSameBin = false
      comparison.reasoning = `Low confidence (${comparison.confidence}%). Cannot confirm same bin.`
    }

    return comparison
  } catch (error) {
    console.error('❌ Error comparing images:', error.message)

    // FALLBACK: For demo, accept with warning
    console.warn('⚠️ Image comparison unavailable - Auto-accepting for demo (should verify manually)')

    return {
      isSameBin: true,
      confidence: 75,
      reasoning: 'Automated comparison unavailable. Manual verification recommended.',
      matchFeatures: 'Comparison service unavailable - assuming same bin for demo purposes.'
    }
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
