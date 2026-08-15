import { useT } from "../context/LocaleContext";

type Step = 1 | 2 | 3;

export default function BookingStepper({ step }: { step: Step }) {
  const t = useT();
  const items = [
    { n: 1 as const, label: t("checkout.stepDates") },
    { n: 2 as const, label: t("checkout.stepDetails") },
    { n: 3 as const, label: t("checkout.stepConfirm") },
  ];

  return (
    <ol className="booking-stepper" aria-label={t("checkout.steps")}>
      {items.map((item, i) => {
        const done = step > item.n;
        const active = step === item.n;
        return (
          <li
            key={item.n}
            className={`booking-step${done ? " done" : ""}${active ? " active" : ""}`}
          >
            <span className="booking-step-num" aria-hidden>
              {done ? "✓" : String(item.n).padStart(2, "0")}
            </span>
            <span className="booking-step-label">{item.label}</span>
            {i < items.length - 1 ? (
              <span className="booking-step-line" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
