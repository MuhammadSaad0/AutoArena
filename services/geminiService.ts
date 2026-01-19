import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ComparisonResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SCHEMA 1: Fast Data (Specs, Pros, Verdict) ---
const fastVehicleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    specs: {
      type: Type.OBJECT,
      properties: {
        engine: { type: Type.STRING },
        horsepower: { type: Type.STRING },
        torque: { type: Type.STRING },
        transmission: { type: Type.STRING },
        drivetrain: { type: Type.STRING },
        zeroToSixty: { type: Type.STRING },
        mpg: { type: Type.STRING },
        weight: { type: Type.STRING },
        dimensions: { type: Type.STRING },
        cargoSpace: { type: Type.STRING },
      },
      required: ["engine", "horsepower", "torque", "transmission"],
    },
    pros: { type: Type.ARRAY, items: { type: Type.STRING } },
    cons: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["name", "specs", "pros", "cons"],
};

const fastComparisonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    vehicleA: fastVehicleSchema,
    vehicleB: fastVehicleSchema,
    verdict: { type: Type.STRING, description: "A balanced expert conclusion comparing both vehicles based on specs." },
  },
  required: ["vehicleA", "vehicleB", "verdict"],
};

// --- SCHEMA 2: Enrichment Data (Market, Listings, Images) ---
// Note: This schema is used for reference in the prompt.
const enrichmentComparisonSchemaStructure = {
  vehicleA: {
    imageUrl: "URL_STRING (Wikimedia or Manufacturer)",
    market: {
      resaleValuePrediction: "STRING",
      marketSentiment: "STRING",
      targetAudience: "STRING",
      averagePriceUsed: "STRING",
      averagePriceNew: "STRING"
    },
    ratings: {
      safetyRating: "STRING",
      reliabilityScore: "STRING"
    },
    financials: {
      estimatedInsuranceCost: "STRING",
      typicalBankRate: "STRING",
      monthlyPaymentEstimate: "STRING",
      listingsSample: [
        {
          title: "STRING",
          price: "STRING",
          source: "STRING",
          url: "STRING",
          isBestDeal: true // boolean
        }
      ]
    },
    newsHeadlines: [
      {
        title: "STRING",
        snippet: "STRING",
        source: "STRING"
      }
    ]
  },
  vehicleB: {
    // Same structure as vehicleA
  }
};

export const compareVehiclesStream = async (
  carA: string,
  carB: string,
  location: string,
  onUpdate: (data: ComparisonResult) => void
): Promise<void> => {
  // Explicitly requested model
  const model = "gemini-2.5-flash-lite"; 

  // --- Phase 1: Fast Specs (No Tools) ---
  const fastPrompt = `
    Compare "${carA}" and "${carB}".
    Context: User is located at: ${location}.
    Provide technical specifications, 3 pros, 3 cons, and a verdict.
    Do NOT search the web. Use your internal knowledge base.
    CRITICAL: Output all units (HP/kW, lb-ft/Nm, mph/kmh, mpg/l100km, lbs/kg) based on what is strictly commonly used in the user's location provided.
    Return JSON.
  `;

  let currentData: ComparisonResult;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: fastPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fastComparisonSchema,
      },
    });

    if (response.text) {
      currentData = JSON.parse(response.text) as ComparisonResult;
      onUpdate(currentData);
    } else {
      throw new Error("Failed to generate specs.");
    }
  } catch (error) {
    console.error("Fast fetch failed:", error);
    throw error; 
  }

  // --- Phase 2: Search Enrichment (Tools) ---
  const enrichmentPrompt = `
    For vehicles "${carA}" and "${carB}" in location: ${location}:
    1. FIND REAL IMAGES (Wikimedia preferred).
    2. FIND 3 ACTIVE LISTINGS with URLs. Mark the single best value listing as 'isBestDeal': true.
    3. ANALYZE MARKET prices (New vs Used) in the local currency.
    4. FIND Safety Ratings (NHTSA/IIHS or Euro NCAP depending on region) and Reliability Scores.
    5. GET FINANCIAL estimates in local currency.
    
    Use Google Search. 
    
    CRITICAL: Return ONLY a valid JSON object. Do not include any Markdown formatting (no \`\`\`json blocks).
    The JSON must strictly match this structure:
    ${JSON.stringify(enrichmentComparisonSchemaStructure, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: enrichmentPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType is OMITTED because it cannot be used with tools in this model version
      },
    });

    if (response.text) {
      let jsonStr = response.text.trim();
      
      // Clean up potential markdown formatting if the model adds it
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

      const enrichmentData = JSON.parse(jsonStr);
      
      // Merge enrichment data into currentData
      currentData.vehicleA = { ...currentData.vehicleA, ...enrichmentData.vehicleA };
      currentData.vehicleB = { ...currentData.vehicleB, ...enrichmentData.vehicleB };
      
      onUpdate({ ...currentData }); // Trigger final update
    }
  } catch (error) {
    console.error("Enrichment fetch failed:", error);
    // We don't throw here, to keep the specs visible even if search fails
  }
};