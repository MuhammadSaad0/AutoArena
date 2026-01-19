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
const enrichmentComparisonSchemaStructure = {
  vehicleA: {
    imageUrl: "URL_STRING (Any public image found online)",
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

// Helper to create empty/error state data so UI doesn't spin forever
const createFallbackEnrichment = (name: string) => ({
  imageUrl: "",
  market: {
    resaleValuePrediction: "Data unavailable",
    marketSentiment: "Data unavailable",
    targetAudience: "N/A",
    averagePriceUsed: "N/A",
    averagePriceNew: "N/A"
  },
  ratings: {
    safetyRating: "N/A",
    reliabilityScore: "N/A"
  },
  financials: {
    estimatedInsuranceCost: "N/A",
    typicalBankRate: "N/A",
    monthlyPaymentEstimate: "N/A",
    listingsSample: []
  },
  newsHeadlines: []
});

export const compareVehiclesStream = async (
  carA: string,
  carB: string,
  location: string,
  onUpdate: (data: ComparisonResult) => void
): Promise<void> => {
  // Use env var or default to 3-pro
  const model = process.env.MODEL_NAME || "gemini-3-pro-preview";

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
    You are an expert car buying assistant.
    CURRENT DATE: ${new Date().toLocaleDateString()}
    USER LOCATION: ${location}
    VEHICLES: "${carA}" and "${carB}"

    INSTRUCTIONS:
    1. **FIND LEGIT LISTINGS**:
       - Perform a Google Search for "used ${carA} for sale in ${location}" and "${carB} for sale".
       - **STRONGLY PREFER** returning URLs to the **SEARCH RESULTS PAGE** of major marketplaces (e.g., Autotrader, CarGurus, Cars.com, Mobile.de) rather than deep links to specific cars. 
       - Deep links to specific cars (e.g., "autotrader.com/cars/link/12345") often break or expire immediately. 
       - **A Search Result Page URL (e.g., "autotrader.com/cars-for-sale/honda/civic") is ALWAYS VALID and preferred.**
       - If you find a generic search page, title it "View all ${carA} listings".
       - If you do find a specific car, ensure the URL looks valid and is from a major trusted site.
       - Select 3 distinct sources per car.

    2. **FIND IMAGES**:
       - Find a valid public image URL for each vehicle.

    3. **ANALYZE MARKET & FINANCIALS**:
       - Get current Average Price (New & Used).
       - Find Safety Ratings (NHTSA/Euro NCAP).
       - Estimate Insurance costs & Bank Rates for ${location}.

    OUTPUT:
    Return ONLY a valid JSON object matching the structure below.
    CRITICAL:
    - Do NOT use Markdown blocks.
    - **Use standard JSON booleans (true/false), NOT Python style (True/False).**
    - Ensure all keys are double-quoted.
    - **Output ONLY the JSON object. Do not include any conversational text, introductory remarks, or explanations.**
    
    Structure:
    ${JSON.stringify(enrichmentComparisonSchemaStructure, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: enrichmentPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (response.text) {
      const text = response.text;
      
      // Robust JSON Extraction
      // Models sometimes return chatty intros like "Here is the data:" before the JSON.
      // We find the first '{' and the last '}' to isolate the JSON object.
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
         throw new Error("No valid JSON object found in response text.");
      }

      let jsonStr = text.substring(firstBrace, lastBrace + 1);
      
      // Fix potential Python boolean syntax (True -> true, False -> false), allowing for spaces
      jsonStr = jsonStr.replace(/: *True/g, ': true').replace(/: *False/g, ': false');

      try {
        const enrichmentData = JSON.parse(jsonStr);
        
        // Merge enrichment data into currentData
        currentData.vehicleA = { ...currentData.vehicleA, ...enrichmentData.vehicleA };
        currentData.vehicleB = { ...currentData.vehicleB, ...enrichmentData.vehicleB };
        
        onUpdate({ ...currentData }); // Trigger final update
      } catch (jsonError) {
        console.error("Failed to parse enrichment JSON", jsonError);
        console.error("Extracted text was:", jsonStr);
        throw jsonError; // Throw to trigger fallback in outer catch
      }
    } else {
       throw new Error("Empty response from enrichment model");
    }
  } catch (error) {
    console.error("Enrichment fetch failed:", error);
    
    // Fallback: Populate with empty/error data so UI spinners stop
    const fallbackA = createFallbackEnrichment(currentData.vehicleA.name);
    const fallbackB = createFallbackEnrichment(currentData.vehicleB.name);
    
    currentData.vehicleA = { ...currentData.vehicleA, ...fallbackA };
    currentData.vehicleB = { ...currentData.vehicleB, ...fallbackB };
    
    onUpdate({ ...currentData });
  }
};