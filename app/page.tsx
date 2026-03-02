"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { database } from "../config/firebase";
import { ref, onValue, update } from "firebase/database";

interface EnergyData {
  kWh: number;
  voltage: number;
  power: number;
  ampere: number;
  totalkWh: number;
}

interface TargetData {
  value: number;
  startDate: string;
  endDate: string;
}

export default function Page() {
  const [supply, setSupply] = useState(false);

  const [energyData, setEnergyData] = useState<EnergyData>({
    kWh: 0,
    voltage: 0,
    power: 0,
    ampere: 0,
    totalkWh: 0,
  });

  const [targetKWh, setTargetKWh] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savedTarget, setSavedTarget] = useState<{
    kWh: string;
    start: string;
    end: string;
  } | null>(null);
  const [targetError, setTargetError] = useState("");
  const [liveTarget, setLiveTarget] = useState<TargetData | null>(null);

  // Peso rate state
  const [pesoRate, setPesoRate] = useState("");
  const [savedPesoRate, setSavedPesoRate] = useState<number | null>(null);
  const [pesoRateError, setPesoRateError] = useState("");

  // Computed cost: totalkWh * pesoRate
  const estimatedCost = savedPesoRate !== null
    ? parseFloat((energyData.totalkWh * savedPesoRate).toFixed(2))
    : null;

  const prevKWhRef = useRef<number | null>(null);
  const isUpdatingRef = useRef(false);
  const displayTotalRef = useRef<number>(0); // persists latest computed total across callbacks

  useEffect(() => {
    const energyRef = ref(database, "monitoring");
    const unsubscribe = onValue(energyRef, (snapshot) => {
      const data = snapshot.val();
      console.log("🔥 Firebase data:", data);
      if (!data) return;

      const currentKWh = Number(data.kWh) || 0;
      const currentTotal = Number(data.totalkWh) || 0;

      if (
        prevKWhRef.current !== null &&
        currentKWh !== prevKWhRef.current &&
        !isUpdatingRef.current
      ) {
        const newTotal = parseFloat((currentTotal + currentKWh).toFixed(3));
        displayTotalRef.current = newTotal; // update ref immediately for live UI
        isUpdatingRef.current = true;
        update(ref(database, "monitoring"), { totalkWh: newTotal }).finally(() => {
          isUpdatingRef.current = false;
        });
      } else if (!isUpdatingRef.current) {
        // Sync ref with Firebase value when no active write
        displayTotalRef.current = currentTotal;
      }

      prevKWhRef.current = currentKWh;

      setEnergyData({
        kWh: currentKWh,
        voltage: Number(data.voltage) || 0,
        power: Number(data.power) || 0,
        ampere: Number(data.ampere) || 0,
        totalkWh: displayTotalRef.current, // always shows latest value
      });

      setLiveTarget({
        value: Number(data.targetkWh) || 0,
        startDate: data.startDate ?? "",
        endDate: data.endDate ?? "",
      });

      setSupply(data.supply === true || data.supply === 1);
    });
    return () => unsubscribe();
  }, []);

  const handlePowerToggle = () => {
    const newSupply = !supply;
    setSupply(newSupply);
    update(ref(database, "monitoring"), { supply: newSupply });
  };

  const handleTargetSubmit = () => {
    setTargetError("");

    if (!targetKWh || isNaN(Number(targetKWh)) || Number(targetKWh) <= 0) {
      setTargetError("Please enter a valid target kWh value.");
      return;
    }
    if (!startDate || !endDate) {
      setTargetError("Please select both start and end dates.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setTargetError("End date must be after start date.");
      return;
    }

    setSavedTarget({ kWh: targetKWh, start: startDate, end: endDate });

    update(ref(database, "monitoring"), {
      targetkWh: Number(targetKWh),
      startDate,
      endDate,
    });
  };

  const energyCards = [
    {
      label: "Energy Consumed",
      value: energyData.kWh.toFixed(3),
      unit: "kWh",
      icon: "⚡",
      color: "from-yellow-500/20 to-yellow-600/5",
      border: "border-yellow-500/30",
      accent: "text-yellow-400",
    },
    {
      label: "Voltage",
      value: energyData.voltage.toFixed(1),
      unit: "V",
      icon: "🔌",
      color: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/30",
      accent: "text-blue-400",
    },
    {
      label: "Power",
      value: energyData.power.toFixed(2),
      unit: "W",
      icon: "💡",
      color: "from-green-500/20 to-green-600/5",
      border: "border-green-500/30",
      accent: "text-green-400",
    },
    {
      label: "Current",
      value: energyData.ampere.toFixed(3),
      unit: "A",
      icon: "🔋",
      color: "from-purple-500/20 to-purple-600/5",
      border: "border-purple-500/30",
      accent: "text-purple-400",
    },
  ];

  const progressPct =
    liveTarget && liveTarget.value > 0
      ? Math.min((energyData.totalkWh / liveTarget.value) * 100, 100)
      : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden px-4 py-12 flex items-center justify-center">

      {/* GRID BACKGROUND */}
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
        )}
      />

      {/* RADIAL FADE */}
      <div className="pointer-events-none absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative z-20 flex flex-col items-center gap-10 w-full max-w-4xl">

        {/* POWER TOGGLE */}
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">
            Power {supply ? "ON" : "OFF"}
          </span>
          <button
            onClick={handlePowerToggle}
            className={cn(
              "relative w-14 h-7 rounded-full transition",
              supply ? "bg-green-500" : "bg-neutral-600"
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform",
                supply && "translate-x-7"
              )}
            />
          </button>
        </div>

        {/* FAN */}
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              "relative h-32 w-32 rounded-full border border-neutral-700 flex items-center justify-center",
              supply && "animate-spin-slow"
            )}
          >
            <div className="absolute h-20 w-2 bg-white rounded-full" />
            <div className="absolute h-20 w-2 bg-white rounded-full rotate-90" />
            <div className="absolute h-20 w-2 bg-white rounded-full rotate-45" />
            <div className="absolute h-20 w-2 bg-white rounded-full -rotate-45" />
            <div className="absolute h-4 w-4 rounded-full bg-white" />
          </div>
        </div>

        {/* ENERGY MONITORING CARDS */}
        <div className="w-full">
          <h2 className="text-white text-lg font-semibold mb-4 tracking-wide">
            ⚡ Energy Monitoring
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {energyCards.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-2xl border p-5 backdrop-blur bg-gradient-to-br",
                  card.color,
                  card.border
                )}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">
                  {card.label}
                </p>
                <div className="flex items-end gap-1">
                  <span className={cn("text-2xl font-bold", card.accent)}>
                    {card.value}
                  </span>
                  <span className="text-neutral-500 text-sm mb-0.5">{card.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TARGET SUMMARY CARDS */}
        <div className="w-full">
          <h2 className="text-white text-lg font-semibold mb-4 tracking-wide">
            🎯 Target Overview
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Current Total kWh */}
            <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-orange-600/5 p-5 backdrop-blur">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">
                Current Total kWh
              </p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-orange-400">
                  {energyData.totalkWh.toFixed(3)}
                </span>
                <span className="text-neutral-500 text-sm mb-0.5">kWh</span>
              </div>
            </div>

            {/* Estimated Cost in Pesos */}
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/20 to-rose-600/5 p-5 backdrop-blur">
              <div className="text-2xl mb-2">🪙</div>
              <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">
                Est. Cost
              </p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-rose-400">
                  {estimatedCost !== null ? estimatedCost.toFixed(2) : "—"}
                </span>
                <span className="text-neutral-500 text-sm mb-0.5">₱</span>
              </div>
              {savedPesoRate !== null && (
                <p className="text-neutral-500 text-xs mt-1">@ ₱{savedPesoRate.toFixed(2)}/kWh</p>
              )}
            </div>

            {/* Target kWh */}
            <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/20 to-teal-600/5 p-5 backdrop-blur">
              <div className="text-2xl mb-2">🏁</div>
              <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">
                Target kWh
              </p>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-2xl font-bold text-teal-400">
                  {liveTarget && liveTarget.value > 0
                    ? liveTarget.value.toFixed(3)
                    : "—"}
                </span>
                {liveTarget && liveTarget.value > 0 && (
                  <span className="text-neutral-500 text-sm mb-0.5">kWh</span>
                )}
              </div>
              {liveTarget && liveTarget.value > 0 && (
                <div className="w-full">
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Progress</span>
                    <span>{progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-800">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        progressPct >= 100 ? "bg-red-500" : "bg-teal-400"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 p-5 backdrop-blur">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-neutral-400 text-xs uppercase tracking-widest mb-3">
                Date Range
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 text-xs">Start</span>
                  <span className="text-indigo-300 text-sm font-medium">
                    {liveTarget ? formatDate(liveTarget.startDate) : "—"}
                  </span>
                </div>
                <div className="h-px bg-neutral-700/50" />
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 text-xs">End</span>
                  <span className="text-indigo-300 text-sm font-medium">
                    {liveTarget ? formatDate(liveTarget.endDate) : "—"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SET TARGET kWh */}
        <div className="w-full rounded-2xl border border-neutral-700 bg-white/5 backdrop-blur p-6">
          <h2 className="text-white text-lg font-semibold mb-5 tracking-wide">
            ✏️ Set Target kWh
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 text-xs uppercase tracking-widest">
                Target kWh
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="e.g. 5.000"
                value={targetKWh}
                onChange={(e) => setTargetKWh(e.target.value)}
                className="rounded-xl bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition placeholder:text-neutral-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 text-xs uppercase tracking-widest">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition [color-scheme:dark]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 text-xs uppercase tracking-widest">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {targetError && (
            <p className="mt-3 text-red-400 text-sm">{targetError}</p>
          )}

          <button
            onClick={handleTargetSubmit}
            className="mt-5 w-full sm:w-auto px-8 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-all"
          >
            Set Target
          </button>

          {savedTarget && (
            <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              ✅ Target set: <strong>{savedTarget.kWh} kWh</strong> from{" "}
              <strong>{formatDate(savedTarget.start)}</strong> to{" "}
              <strong>{formatDate(savedTarget.end)}</strong>
            </div>
          )}
        </div>

        {/* SET PESO RATE */}
        <div className="w-full rounded-2xl border border-neutral-700 bg-white/5 backdrop-blur p-6">
          <h2 className="text-white text-lg font-semibold mb-5 tracking-wide">
            🪙 Set Electricity Rate
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-neutral-400 text-xs uppercase tracking-widest">
                Rate per kWh (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 11.50"
                value={pesoRate}
                onChange={(e) => setPesoRate(e.target.value)}
                className="rounded-xl bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500 transition placeholder:text-neutral-600"
              />
            </div>
            <button
              onClick={() => {
                setPesoRateError("");
                if (!pesoRate || isNaN(Number(pesoRate)) || Number(pesoRate) <= 0) {
                  setPesoRateError("Please enter a valid rate.");
                  return;
                }
                setSavedPesoRate(Number(pesoRate));
              }}
              className="px-8 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-sm transition-all"
            >
              Set Rate
            </button>
          </div>
          {pesoRateError && (
            <p className="mt-3 text-red-400 text-sm">{pesoRateError}</p>
          )}
          {savedPesoRate !== null && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              ✅ Rate set: <strong>₱{savedPesoRate.toFixed(2)} per kWh</strong> — Current cost: <strong>₱{estimatedCost?.toFixed(2) ?? "0.00"}</strong>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}