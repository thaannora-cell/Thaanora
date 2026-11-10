// The prototype's round switch. role="switch" so screen readers announce on/off.
export default function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-[42px] shrink-0 rounded-full transition-colors motion-reduce:transition-none ${on ? "bg-emerald" : "bg-[#CDD5D0]"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute start-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform motion-reduce:transition-none ${
          on ? "translate-x-[18px] rtl:-translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}
