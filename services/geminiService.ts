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
const enrichmentVehicleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    imageUrl: { type: Type.STRING, description: "Direct URL to a real image (Wikimedia or Manufacturer)." },
    market: {
      type: Type.OBJECT,
      properties: {
        resaleValuePrediction: { type: Type.STRING },
        marketSentiment: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        averagePriceUsed: { type: Type.STRING },
        averagePriceNew: { type: Type.STRING },
      },
      required: ["marketSentiment", "averagePriceUsed"],
    },
    ratings: {
      type: Type.OBJECT,
      properties: {
        safetyRating: { type: Type.STRING, description: "e.g. '5-Star NHTSA' or '5-Star Euro NCAP'" },
        reliabilityScore: { type: Type.STRING, description: "e.g. '4.5/5 J.D. Power'" },
      },
      required: ["safetyRating", "reliabilityScore"],
    },
    financials: {
      type: Type.OBJECT,
      properties: {
        estimatedInsuranceCost: { type: Type.STRING },
        typicalBankRate: { type: Type.STRING },
        monthlyPaymentEstimate: { type: Type.STRING },
        listingsSample: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price: { type: Type.STRING },
              source: { type: Type.STRING },
              url: { type: Type.STRING },
              isBestDeal: { type: Type.BOOLEAN, description: "True if this is the best value among found listings." },
            },
            required: ["title", "price", "source", "url", "isBestDeal"],
          },
        },
      },
      required: ["typicalBankRate", "listingsSample"],
    },
    newsHeadlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          snippet: { type: Type.STRING },
          source: { type: Type.STRING },
        },
      },
    },
  },
  required: ["imageUrl", "market", "ratings", "financials", "newsHeadlines"],
};

const enrichmentComparisonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    vehicleA: enrichmentVehicleSchema,
    vehicleB: enrichmentVehicleSchema,
  },
  required: ["vehicleA", "vehicleB"],
};

export const compareVehiclesStream = async (
  carA: string,
  carB: string,
  location: string,
  onUpdate: (data: ComparisonResult) => void
): Promise<void> => {
  const model = "gemini-2.5-flash-lite-preview-02-05"; 

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
    
    Use Google Search. Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: enrichmentPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: enrichmentComparisonSchema,
      },
    });

    if (response.text) {
      const enrichmentData = JSON.parse(response.text);
      
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