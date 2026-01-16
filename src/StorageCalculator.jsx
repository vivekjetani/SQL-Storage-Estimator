import React, { useState, useEffect } from 'react';
import { Database, Server, Clock, HardDrive, Calculator, Info, RotateCcw, Plus, Trash2, Settings, Calendar, Sun, Moon } from 'lucide-react';

const DATA_TYPES = {
  int: { label: 'Integer (INT)', size: 4, isVariable: false },
  bigint: { label: 'Big Integer (BIGINT)', size: 8, isVariable: false },
  float: { label: 'Float', size: 4, isVariable: false },
  double: { label: 'Double', size: 8, isVariable: false },
  uuid: { label: 'UUID', size: 16, isVariable: false },
  datetime: { label: 'DateTime', size: 8, isVariable: false },
  date: { label: 'Date', size: 3, isVariable: false },
  boolean: { label: 'Boolean', size: 1, isVariable: false },
  varchar: { label: 'String (VARCHAR)', size: 0, isVariable: true },
  text: { label: 'Text (TEXT)', size: 0, isVariable: true },
};

const StorageCalculator = () => {
  // State for user inputs
  const [numAgents, setNumAgents] = useState(100);
  const [repeatTime, setRepeatTime] = useState("00:01:00");
  
  // Work Hours State
  const [useWorkHours, setUseWorkHours] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");

  // Replaces numStringCols and avgStringLength
  const [columnCount, setColumnCount] = useState(6);
  const [columns, setColumns] = useState(
    Array(6).fill({ type: 'varchar', length: 50 })
  );
  
  // State for calculated results
  const [results, setResults] = useState({
    rowSize: 0,
    rowsPerDay: 0,
    dailySpace: 0,
    monthlySpace: 0,
    yearlySpace: 0,
    activeHoursPerDay: 24
  });

  const [error, setError] = useState("");

  // Helper to format bytes into readable units
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to parse HH:MM:SS to total seconds
  const parseTimeToSeconds = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);

    if (isNaN(h) || isNaN(m) || isNaN(s)) return 0;
    
    return (h * 3600) + (m * 60) + s;
  };

  // Handle number of columns change
  const handleColumnCountChange = (val) => {
    const newCount = Math.max(0, parseInt(val) || 0);
    setColumnCount(newCount);
    
    setColumns(prev => {
      if (newCount > prev.length) {
        // Add new columns with default varchar type
        return [...prev, ...Array(newCount - prev.length).fill({ type: 'varchar', length: 50 })];
      } else {
        // Remove columns from the end
        return prev.slice(0, newCount);
      }
    });
  };

  // Handle individual column updates
  const updateColumn = (index, field, value) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], [field]: value };
    setColumns(newCols);
  };

  // Main calculation effect
  useEffect(() => {
    const calculateStorage = () => {
      setError("");
      
      const seconds = parseTimeToSeconds(repeatTime);
      
      if (seconds <= 0) {
        setError("Time must be greater than 0 seconds.");
        setResults({ rowSize: 0, rowsPerDay: 0, dailySpace: 0, monthlySpace: 0, yearlySpace: 0, activeHoursPerDay: 0 });
        return;
      }

      // --- Calculate Row Size based on Columns ---
      let customColumnsSize = 0;
      
      columns.forEach(col => {
        const typeDef = DATA_TYPES[col.type];
        if (typeDef.isVariable) {
          // For variable types, use user specified length + 2 bytes overhead for length prefix
          customColumnsSize += (parseInt(col.length) || 0) + 2;
        } else {
          // For fixed types, use standard size
          customColumnsSize += typeDef.size;
        }
      });

      // Base Overhead: Primary Key (8) + Agent ID (4) + System Timestamp (8) = 20 bytes
      const baseOverhead = 20; 
      const singleRowSizeBytes = baseOverhead + customColumnsSize;

      // --- Frequency Calculations ---
      
      let activeSecondsPerDay = 86400; // Default 24 hours

      if (useWorkHours) {
        const [startH, startM] = workStartTime.split(':').map(Number);
        const [endH, endM] = workEndTime.split(':').map(Number);
        
        const startTotalMinutes = startH * 60 + startM;
        const endTotalMinutes = endH * 60 + endM;

        let diffMinutes = endTotalMinutes - startTotalMinutes;
        
        // Handle overnight shifts (e.g. 10 PM to 6 AM)
        if (diffMinutes < 0) {
           diffMinutes += 1440; // Add 24 hours in minutes
        }
        
        // If times are exactly the same, decide if it's 0 or 24 hours. 
        // Usually in a "Start-End" context, same time implies 24h cycle, but let's stick to calculated 0 if user wants strict logic.
        // However, usually 09:00 to 09:00 implies 24h.
        if (diffMinutes === 0 && startTotalMinutes !== undefined) {
            diffMinutes = 1440;
        }

        activeSecondsPerDay = diffMinutes * 60;
      }

      const triggersPerDayPerAgent = activeSecondsPerDay / seconds; 
      const totalRowsPerDay = triggersPerDayPerAgent * numAgents;

      const dailySizeBytes = totalRowsPerDay * singleRowSizeBytes;

      setResults({
        rowSize: singleRowSizeBytes,
        rowsPerDay: Math.floor(totalRowsPerDay),
        dailySpace: dailySizeBytes,
        monthlySpace: dailySizeBytes * 30,
        yearlySpace: dailySizeBytes * 365,
        activeHoursPerDay: activeSecondsPerDay / 3600
      });
    };

    calculateStorage();
  }, [numAgents, columns, repeatTime, useWorkHours, workStartTime, workEndTime]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">SQL Storage Estimator</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Calculate database growth based on agent activity and specific column data types.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-700">
                <Calculator className="w-5 h-5 text-blue-500" />
                Configuration
              </h2>

              {/* Number of Agents */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Number of Agents
                </label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    value={numAgents}
                    onChange={(e) => setNumAgents(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Repeat Time */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Repeat Time (HH:MM:SS)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={repeatTime}
                    onChange={(e) => setRepeatTime(e.target.value)}
                    placeholder="00:01:00"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 transition-all outline-none text-slate-700 font-medium ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`}
                  />
                </div>
                {error && <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>}
              </div>

               {/* Operational Hours Toggle */}
               <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Operational Hours
                  </label>
                  
                  <div 
                    onClick={() => setUseWorkHours(!useWorkHours)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${useWorkHours ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${useWorkHours ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {useWorkHours && (
                  <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Start
                      </label>
                      <input 
                        type="time" 
                        value={workStartTime}
                        onChange={(e) => setWorkStartTime(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Moon className="w-3 h-3" /> End
                      </label>
                      <input 
                        type="time" 
                        value={workEndTime}
                        onChange={(e) => setWorkEndTime(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                )}
                {!useWorkHours && (
                  <p className="text-xs text-slate-400">Agents are active 24 hours a day.</p>
                )}
              </div>

              {/* Column Configuration Header */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-slate-600">
                    Data Columns
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Count:</span>
                    <input 
                      type="number"
                      min="0"
                      value={columnCount}
                      onChange={(e) => handleColumnCountChange(e.target.value)}
                      className="w-16 px-2 py-1 text-sm text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Column List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {columns.map((col, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2 items-start animate-fadeIn">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-bold mt-2 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        {/* Type Selector */}
                        <select
                          value={col.type}
                          onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                          className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                        >
                          {Object.entries(DATA_TYPES).map(([key, info]) => (
                            <option key={key} value={key}>{info.label}</option>
                          ))}
                        </select>
                        
                        {/* Length Input (Conditional) */}
                        {DATA_TYPES[col.type].isVariable && (
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-slate-400 whitespace-nowrap">Avg Len:</span>
                             <input 
                               type="number"
                               min="1"
                               value={col.length}
                               onChange={(e) => updateColumn(idx, 'length', Math.max(0, parseInt(e.target.value) || 0))}
                               className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                               placeholder="Chars"
                             />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {columns.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No data columns defined.
                    </div>
                  )}
                </div>
              </div>

            </div>
            
            {/* Assumption Note */}
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Total size includes ~20 bytes base overhead (Primary Keys, IDs, Timestamps) plus the size of your configured columns. Variable string types include +2 bytes for length prefixes.
              </p>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Total Row Size</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-slate-800">
                    {results.rowSize} <span className="text-lg font-normal text-slate-500">bytes</span>
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    20 bytes system + {results.rowSize - 20} bytes data
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Rows Generated</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-slate-800">
                    {results.rowsPerDay.toLocaleString()}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Per day ({results.activeHoursPerDay.toFixed(1)} hrs active)</p>
                </div>
              </div>
            </div>

            {/* Detailed Forecast */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Storage Forecast</h3>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                   {columns.length} columns configured
                </span>
              </div>
              
              <div className="divide-y divide-slate-100">
                <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <span className="font-bold text-sm">1D</span>
                     </div>
                     <div>
                        <h4 className="text-base font-medium text-slate-700">Daily</h4>
                     </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800">{formatBytes(results.dailySpace)}</div>
                    <div className="text-xs text-slate-400">{results.dailySpace.toLocaleString()} bytes</div>
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors bg-blue-50/30">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="font-bold text-sm">1M</span>
                     </div>
                     <div>
                        <h4 className="text-base font-medium text-slate-700">Monthly</h4>
                     </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-700">{formatBytes(results.monthlySpace)}</div>
                    <div className="text-xs text-slate-400">{results.monthlySpace.toLocaleString()} bytes</div>
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <span className="font-bold text-sm">1Y</span>
                     </div>
                     <div>
                        <h4 className="text-base font-medium text-slate-700">Yearly</h4>
                     </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-indigo-600">{formatBytes(results.yearlySpace)}</div>
                    <div className="text-xs text-slate-400">{results.yearlySpace.toLocaleString()} bytes</div>
                  </div>
                </div>
              </div>
            </div>
            
             {/* Visual Bar Graph Approximation */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex justify-between text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wide">
                    <span>Yearly Accumulation</span>
                 </div>
                 <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div style={{width: '0.27%'}} className="h-full bg-blue-400 min-w-[2px]" title="Daily"></div>
                    <div style={{width: '8.2%'}} className="h-full bg-blue-600 border-l border-white/20" title="Monthly"></div>
                    <div className="flex-1 h-full bg-indigo-600 border-l border-white/20 relative" title="Yearly">
                       <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-80">
                          {formatBytes(results.yearlySpace)}
                       </span>
                    </div>
                 </div>
                 <div className="flex justify-center gap-6 mt-4 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Daily</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Monthly</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Yearly</span>
                 </div>
              </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageCalculator;