import { mergeFeatureOptions } from "../lib/carFeatures";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function FeatureCheckboxes({ value, onChange }: Props) {
  const options = mergeFeatureOptions(value);

  function toggle(feature: string) {
    if (value.includes(feature)) {
      onChange(value.filter((x) => x !== feature));
    } else {
      onChange([...value, feature]);
    }
  }

  return (
    <div className="feature-picker">
      <h4 className="feature-picker-title">Pajisjet / Features</h4>
      <div className="feature-picker-grid">
        {options.map((feature) => {
          const checked = value.includes(feature);
          return (
            <label
              key={feature}
              className={`feature-pick${checked ? " selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(feature)}
              />
              <span className="feature-pick-check" aria-hidden="true" />
              <span>{feature}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
