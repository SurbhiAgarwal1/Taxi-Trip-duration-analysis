import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, TrafficLayer } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '2.5rem'
};

const center = {
  lat: 40.758,
  lng: -73.985
};

export default function LiveTraffic() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "" // We will use an empty API key or user needs to provide one
  });

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
      },
    ]
  }), []);

  return (
    <div className="space-y-8 pb-10 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-[#001C44] tracking-tight brand-font">Live Traffic Map</h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Google Maps Layer Active</p>
             </div>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Real-time congestion metrics</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight brand-font uppercase">Traffic Console</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Cross-referencing live congestion via Google Maps Traffic API.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-4 relative">
            <div className="rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl shadow-slate-200 ring-1 ring-slate-200">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={center}
                  zoom={12}
                  options={mapOptions}
                >
                  <TrafficLayer />
                </GoogleMap>
              ) : (
                <div className="bg-slate-50 border border-slate-100 text-slate-400 h-[600px] flex flex-col items-center justify-center rounded-[2.5rem]">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <span className="font-bold text-sm tracking-widest uppercase">Loading Map Engine...</span>
                </div>
              )}
            </div>
            
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/50 flex flex-col gap-2">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#4CAF50]"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Fast</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FFEB3B]"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Moderate</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F44336]"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Slow</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8B0000]"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Severe</span>
               </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col pt-2">
            <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
               <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">API Key Notice</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Currently running without billing account (for development purposes only). To remove watermarks, insert a valid Google Maps API Key in <code className="bg-slate-200 px-1 py-0.5 rounded">LiveTraffic.jsx</code>.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
