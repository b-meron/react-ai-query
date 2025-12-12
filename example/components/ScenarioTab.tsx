import { Scenario } from "../scenarios";

interface ScenarioTabProps {
  scenario: Scenario;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const ScenarioTab = ({ scenario, active, onClick, disabled }: ScenarioTabProps) => {
  const baseClasses = "flex items-center gap-2 rounded-lg px-4 py-3 text-left transition-all";
  const stateClasses = disabled
    ? "bg-slate-900/40 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60"
    : active
      ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-300"
      : "bg-slate-900/50 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${stateClasses}`}
    >
      <span className="text-xl">{scenario.icon}</span>
      <div>
        <p className="font-medium text-sm">{scenario.title}</p>
        <p className="text-xs opacity-70 hidden sm:block">{scenario.description}</p>
      </div>
    </button>
  );
};

