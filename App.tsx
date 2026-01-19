import React, { useState, useEffect } from 'react';
import { compareVehiclesStream } from './services/geminiService';
import { VehicleData, ComparisonResult, ComparisonState } from './types';
import { VehicleImage } from './components/VehicleImage';
import { ComparisonChart } from './components/ComparisonChart';

const App: React.FC = () => {
  const [carAInput, setCarAInput] = useState('');
  const [carBInput, setCarBInput] = useState('');
  const [location, setLocation] = useState<string>('Detecting...');
  const [state, setState] = useState<ComparisonState>(ComparisonState.IDLE);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
            setLocation(`Lat: ${position.coords.latitude.toFixed(2)}, Lon: ${position.coords.longitude.toFixed(2)}`);
        },
        () => {
          setLocation("USA (Default)");
        }
      );
    } else {
      setLocation("USA (Default)");
    }
  }, []);

  const handleCompare = async () => {
    if (!carAInput.trim() || !carBInput.trim()) return;

    setState(ComparisonState.LOADING);
    setError(null);
    setResult(null);

    try {
      await compareVehiclesStream(carAInput, carBInput, location, (partialData) => {
         setResult(partialData);
         setState(ComparisonState.SUCCESS); 
      });
    } catch (err: any) {
      setError(err.message || "Error processing request.");
      setState(ComparisonState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-[#cccccc] font-['Verdana'] text-[12px]">
      <div className="max-w-[960px] mx-auto bg-white border-l border-r border-[#888888] min-h-screen pb-10">
        
        {/* Classic Header */}
        <header>
          <div className="p-4 flex items-end gap-2 border-b border-[#999999]">
             <h1 className="text-5xl font-['Times_New_Roman'] font-bold tracking-tighter leading-none">
               <span className="text-[#0000cc]">Auto</span><span className="text-[#cc0000]">Arena</span>
             </h1>
             <span className="text-[16px] font-bold text-[#666666] mb-1">The World's Online Car Comparator™</span>
          </div>
        </header>

        {/* Search Area */}
        <div className="p-4 bg-[#eeeeee] border-b border-[#bbbbbb]">
           <table width="100%" cellPadding="0" cellSpacing="0">
             <tbody>
               <tr>
                 <td width="150" valign="top" className="font-bold text-[14px] text-black pt-2">
                   Find Vehicles
                 </td>
                 <td>
                   <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2">
                       <label className="w-24 text-right font-bold text-black text-[13px]">Vehicle 1:</label>
                       <input 
                         type="text" 
                         className="retro-input w-64" 
                         value={carAInput}
                         onChange={(e) => setCarAInput(e.target.value)}
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-24 text-right font-bold text-black text-[13px]">Vehicle 2:</label>
                       <input 
                         type="text" 
                         className="retro-input w-64" 
                         value={carBInput}
                         onChange={(e) => setCarBInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                       />
                     </div>
                     <div className="flex items-center gap-2 mt-2 ml-24">
                       <button onClick={handleCompare} disabled={state === ComparisonState.LOADING} className="retro-button px-6 py-1">
                         {state === ComparisonState.LOADING && !result ? 'Searching...' : 'Compare Items'}
                       </button>
                       <span className="text-[10px] text-[#666]">
                         {location.includes('Lat') ? 'Region: Auto-detected' : `Region: ${location}`}
                       </span>
                     </div>
                   </div>
                 </td>
               </tr>
             </tbody>
           </table>
           {error && <div className="text-red-600 font-bold mt-2 ml-24">{error}</div>}
        </div>

        {/* Content Area */}
        <div className="p-4">
          {result && (
            <div>
               {/* Breadcrumbs */}
               <div className="text-[10px] mb-2">
                 <a href="#" onClick={() => { setState(ComparisonState.IDLE); setResult(null); }}>Home</a> &gt; <span className="text-[#666]">Comparison Results</span> &gt; <span className="font-bold">Item #{Math.floor(Math.random() * 10000)} vs #{Math.floor(Math.random() * 10000)}</span>
               </div>

               {/* Title */}
               <h2 className="text-[18px] font-bold text-[#333333] border-b border-[#cccccc] pb-1 mb-4 font-['Arial']">
                 Side-by-Side Comparison: {result.vehicleA.name} vs. {result.vehicleB.name}
               </h2>

               {/* Verdict Box */}
               <div className="bg-[#ffffcc] border border-[#ffcc00] p-2 mb-4">
                 <strong className="text-black">Expert Verdict:</strong> {result.verdict}
               </div>

               {/* Comparison Table */}
               <table width="100%" border={0} cellSpacing="0" cellPadding="4" className="mb-6">
                 <tbody>
                   <tr>
                     <td width="50%" valign="top" className="border border-[#cccccc] p-2 bg-[#f9f9f9]">
                        <div className="text-center font-bold text-[14px] mb-2"><a href="#">{result.vehicleA.name}</a></div>
                        <div className="mb-2 flex justify-center">
                          <VehicleImage imageUrl={result.vehicleA.imageUrl} name={result.vehicleA.name} />
                        </div>
                        <div className="text-[11px] text-center">
                          <strong>Market Sentiment:</strong> {result.vehicleA.market?.marketSentiment || <span className="text-gray-400 italic">Analyzing...</span>}
                        </div>
                     </td>
                     <td width="50%" valign="top" className="border border-[#cccccc] p-2 bg-[#f9f9f9]">
                        <div className="text-center font-bold text-[14px] mb-2"><a href="#">{result.vehicleB.name}</a></div>
                        <div className="mb-2 flex justify-center">
                          <VehicleImage imageUrl={result.vehicleB.imageUrl} name={result.vehicleB.name} />
                        </div>
                        <div className="text-[11px] text-center">
                          <strong>Market Sentiment:</strong> {result.vehicleB.market?.marketSentiment || <span className="text-gray-400 italic">Analyzing...</span>}
                        </div>
                     </td>
                   </tr>
                 </tbody>
               </table>

               {/* Description / Specs */}
               <div className="mb-6">
                 <div className="bg-[#5e7fa2] text-white font-bold px-2 py-1 text-[13px] mb-0">Description / Specifications</div>
                 <table className="retro-data-table">
                    <tbody>
                      <tr className="bg-[#eeeeee]">
                        <th width="20%">Feature</th>
                        <th width="40%">{result.vehicleA.name}</th>
                        <th width="40%">{result.vehicleB.name}</th>
                      </tr>
                      {[
                        ['Engine', 'engine'],
                        ['Power', 'horsepower'],
                        ['Torque', 'torque'],
                        ['Transmission', 'transmission'],
                        ['0-100km/h / 0-60mph', 'zeroToSixty'],
                        ['Fuel / Range', 'mpg'],
                        ['Weight', 'weight'],
                        ['Dimensions', 'dimensions'],
                        ['Cargo', 'cargoSpace'],
                      ].map(([label, key], idx) => (
                        <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f4f4f4]'}>
                          <td className="font-bold">{label}</td>
                          {/* @ts-ignore */}
                          <td>{result.vehicleA.specs[key]}</td>
                          {/* @ts-ignore */}
                          <td>{result.vehicleB.specs[key]}</td>
                        </tr>
                      ))}
                      {/* Added Ratings Section directly in table for compactness */}
                       <tr className="bg-[#d0dbe9]">
                        <td colSpan={3} className="font-bold text-center">Safety & Reliability</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="font-bold">Safety Rating</td>
                        <td>{result.vehicleA.ratings?.safetyRating || 'Loading...'}</td>
                        <td>{result.vehicleB.ratings?.safetyRating || 'Loading...'}</td>
                      </tr>
                      <tr className="bg-[#f4f4f4]">
                        <td className="font-bold">Reliability</td>
                        <td>{result.vehicleA.ratings?.reliabilityScore || 'Loading...'}</td>
                        <td>{result.vehicleB.ratings?.reliabilityScore || 'Loading...'}</td>
                      </tr>
                    </tbody>
                 </table>
               </div>

               {/* Financials */}
               <div className="mb-6">
                 <div className="bg-[#5e7fa2] text-white font-bold px-2 py-1 text-[13px] mb-2">Pricing & Market Data</div>
                 <div className="flex gap-4">
                   <div className="w-1/2">
                      <ComparisonChart vehicleA={result.vehicleA} vehicleB={result.vehicleB} />
                   </div>
                   <div className="w-1/2">
                      <table className="retro-data-table">
                        <tbody>
                          <tr>
                            <th colSpan={3}>Estimated Costs</th>
                          </tr>
                          <tr>
                            <td></td>
                            <td><strong>{result.vehicleA.name}</strong></td>
                            <td><strong>{result.vehicleB.name}</strong></td>
                          </tr>
                          <tr>
                            <td>Insurance Est.</td>
                            <td>{result.vehicleA.financials?.estimatedInsuranceCost || '...'}</td>
                            <td>{result.vehicleB.financials?.estimatedInsuranceCost || '...'}</td>
                          </tr>
                          <tr>
                            <td>Bank Rate</td>
                            <td>{result.vehicleA.financials?.typicalBankRate || '...'}</td>
                            <td>{result.vehicleB.financials?.typicalBankRate || '...'}</td>
                          </tr>
                          <tr>
                            <td>Resale Outlook</td>
                            <td>{result.vehicleA.market?.resaleValuePrediction || '...'}</td>
                            <td>{result.vehicleB.market?.resaleValuePrediction || '...'}</td>
                          </tr>
                        </tbody>
                      </table>
                   </div>
                 </div>
               </div>

               {/* Listings */}
               <div className="mb-6">
                 <div className="bg-[#5e7fa2] text-white font-bold px-2 py-1 text-[13px] mb-2">Available Listings</div>
                 <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
                   <tbody>
                     <tr>
                        <td width="48%" valign="top">
                          <div className="border border-[#ccc] p-2 bg-[#fffff0] min-h-[100px]">
                             <div className="font-bold border-b border-[#ccc] mb-2">{result.vehicleA.name}</div>
                             {result.vehicleA.financials ? (
                               <ul className="list-none pl-0">
                                 {result.vehicleA.financials.listingsSample.map((l, i) => (
                                   <li key={i} className="mb-3 border-b border-dotted border-gray-300 pb-1">
                                     <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#0000cc]">{l.title}</a>
                                     {l.isBestDeal && (
                                       <span className="ml-2 bg-[#ff0] text-[#d00] border border-[#d00] px-1 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                          BEST DEAL
                                       </span>
                                     )}
                                     <br />
                                     <div className="flex justify-between items-end">
                                        <span className="text-[11px] font-bold text-[#333]">{l.price}</span>
                                        <span className="text-[10px] text-[#666] italic">via {l.source}</span>
                                     </div>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <div className="text-center text-gray-500 text-[10px] mt-4">Scanning dealer networks...</div>
                             )}
                          </div>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" valign="top">
                           <div className="border border-[#ccc] p-2 bg-[#fffff0] min-h-[100px]">
                             <div className="font-bold border-b border-[#ccc] mb-2">{result.vehicleB.name}</div>
                             {result.vehicleB.financials ? (
                               <ul className="list-none pl-0">
                                 {result.vehicleB.financials.listingsSample.map((l, i) => (
                                   <li key={i} className="mb-3 border-b border-dotted border-gray-300 pb-1">
                                     <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#0000cc]">{l.title}</a>
                                     {l.isBestDeal && (
                                       <span className="ml-2 bg-[#ff0] text-[#d00] border border-[#d00] px-1 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                          BEST DEAL
                                       </span>
                                     )}
                                     <br />
                                     <div className="flex justify-between items-end">
                                        <span className="text-[11px] font-bold text-[#333]">{l.price}</span>
                                        <span className="text-[10px] text-[#666] italic">via {l.source}</span>
                                     </div>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <div className="text-center text-gray-500 text-[10px] mt-4">Scanning dealer networks...</div>
                             )}
                          </div>
                        </td>
                     </tr>
                   </tbody>
                 </table>
               </div>

               {/* Footer for Results */}
               <div className="text-center text-[10px] text-[#666] border-t border-[#ccc] pt-2">
                 * Information is generated by AI and may contain errors. Please verify with dealer.
               </div>

            </div>
          )}

          {state === ComparisonState.LOADING && !result && (
             <div className="p-10 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#0000cc] border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-bold">Accessing Vehicle Database...</h3>
                <p>Please wait while we retrieve specifications.</p>
             </div>
          )}

          {state === ComparisonState.IDLE && (
            <div className="p-10 text-center">
              <h3 className="text-lg font-bold mb-2">Welcome to AutoArena</h3>
              <p>Please enter two vehicles above to begin your comparison.</p>
              <div className="mt-8 border border-[#ccc] bg-[#f9f9f9] p-4 inline-block text-left">
                <strong>Why use AutoArena?</strong>
                <ul className="list-disc pl-5 mt-2">
                  <li>Fast loading</li>
                  <li>Unbiased AI comparisons</li>
                  <li>Direct links to listings</li>
                  <li>No clutter</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="text-center py-4 bg-[#eeeeee] border-t border-[#999]">
          <div className="text-[10px]">Copyright © 1999-2025 AutoArena Inc. All Rights Reserved.</div>
        </div>

      </div>
    </div>
  );
};

export default App;