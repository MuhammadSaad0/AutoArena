export interface VehicleSpecs {
  engine: string;
  horsepower: string;
  torque: string;
  transmission: string;
  drivetrain: string;
  zeroToSixty: string;
  mpg: string;
  weight: string;
  dimensions: string;
  cargoSpace: string;
}

export interface MarketData {
  resaleValuePrediction: string; // e.g. "Retains 60% after 3 years"
  marketSentiment: string; // "High demand", "Oversaturated", etc.
  targetAudience: string;
  averagePriceUsed: string;
  averagePriceNew: string;
}

export interface FinancialInfo {
  estimatedInsuranceCost: string;
  typicalBankRate: string; // e.g., "5.5% - 7.0%"
  monthlyPaymentEstimate: string; // Based on average terms
  listingsSample: Array<{
    title: string;
    price: string;
    source: string;
    url?: string; // Optional link to listing
    isBestDeal?: boolean; // New: Highlights value
  }>;
}

export interface VehicleData {
  name: string;
  imageUrl?: string; // Loaded in phase 2 usually
  specs: VehicleSpecs;
  market?: MarketData; // Loaded in phase 2
  financials?: FinancialInfo; // Loaded in phase 2
  ratings?: {
    safetyRating: string;
    reliabilityScore: string;
  }; // Loaded in phase 2
  pros: string[];
  cons: string[];
  newsHeadlines?: Array<{
    title: string;
    snippet: string;
    source: string;
  }>; // Loaded in phase 2
}

export interface ComparisonResult {
  vehicleA: VehicleData;
  vehicleB: VehicleData;
  verdict: string;
}

export enum ComparisonState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}