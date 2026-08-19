import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Car } from "../lib/api";
import { useT } from "../context/LocaleContext";
import FeatureCheckboxes from "./FeatureCheckboxes";
import CarImagePicker from "./CarImagePicker";

export type FleetCarFormState = {
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  seats: number;
  doors: number;
  luggage: number;
  horsepower: string;
  color: string;
  mileage: string;
  location: string;
  fuel: string;
  transmission: string;
  type: string;
  status: Car["status"];
  description: string;
  features: string[];
  imageUrl: string;
};

type Props = {
  form: FleetCarFormState;
  setForm: Dispatch<SetStateAction<FleetCarFormState>>;
  existingImages: string[];
  onExistingChange: (urls: string[]) => void;
  imageFiles: File[];
  onFilesChange: (files: File[]) => void;
  saving: boolean;
  uploadProgress: string;
  isEdit: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
};

export default function FleetCarForm({
  form,
  setForm,
  existingImages,
  onExistingChange,
  imageFiles,
  onFilesChange,
  saving,
  uploadProgress,
  isEdit,
  onSubmit,
  onCancel,
}: Props) {
  const t = useT();

  return (
    <form className="fleet-car-form" onSubmit={onSubmit}>
      <div className="form-fields">
        <label className="field">
          <span>{t("carForm.brand")}</span>
          <input
            placeholder={t("carForm.brandPh")}
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            required
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>{t("carForm.model")}</span>
          <input
            placeholder={t("carForm.modelPh")}
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            required
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>{t("carForm.year")}</span>
          <input
            type="number"
            placeholder="2024"
            min={1990}
            max={2100}
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            required
          />
        </label>
        <label className="field">
          <span>{t("carForm.price")}</span>
          <input
            type="number"
            placeholder="50"
            min={1}
            value={form.pricePerDay}
            onChange={(e) =>
              setForm({ ...form, pricePerDay: Number(e.target.value) })
            }
            required
          />
        </label>
        <label className="field">
          <span>{t("carForm.seats")}</span>
          <input
            type="number"
            placeholder="5"
            min={1}
            max={20}
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.doors")}</span>
          <input
            type="number"
            placeholder="4"
            min={2}
            max={6}
            value={form.doors}
            onChange={(e) => setForm({ ...form, doors: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.luggage")}</span>
          <input
            type="number"
            placeholder="2"
            min={0}
            max={10}
            value={form.luggage}
            onChange={(e) =>
              setForm({ ...form, luggage: Number(e.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>{t("carForm.hp")}</span>
          <input
            placeholder={t("carForm.hpPh")}
            value={form.horsepower}
            onChange={(e) => setForm({ ...form, horsepower: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.color")}</span>
          <input
            placeholder={t("carForm.colorPh")}
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.mileage")}</span>
          <input
            placeholder={t("carForm.mileagePh")}
            value={form.mileage}
            onChange={(e) => setForm({ ...form, mileage: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.location")}</span>
          <input
            placeholder={t("carForm.locationPh")}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("carForm.fuel")}</span>
          <select
            value={form.fuel}
            onChange={(e) => setForm({ ...form, fuel: e.target.value })}
          >
            <option value="Petrol">{t("labels.fuel.Petrol")}</option>
            <option value="Diesel">{t("labels.fuel.Diesel")}</option>
            <option value="Hybrid">{t("labels.fuel.Hybrid")}</option>
            <option value="Electric">{t("labels.fuel.Electric")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("carForm.transmission")}</span>
          <select
            value={form.transmission}
            onChange={(e) => setForm({ ...form, transmission: e.target.value })}
          >
            <option value="Automatic">{t("labels.transmission.Automatic")}</option>
            <option value="Manual">{t("labels.transmission.Manual")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("carForm.type")}</span>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="Sedan">{t("labels.type.Sedan")}</option>
            <option value="SUV">{t("labels.type.SUV")}</option>
            <option value="Sports">{t("labels.type.Sports")}</option>
            <option value="Luxury">{t("labels.type.Luxury")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("carForm.status")}</span>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Car["status"] })
            }
          >
            <option value="AVAILABLE">{t("status.AVAILABLE")}</option>
            <option value="RESERVED">{t("status.RESERVED")}</option>
            <option value="MAINTENANCE">{t("status.MAINTENANCE")}</option>
          </select>
        </label>
      </div>

      <FeatureCheckboxes
        value={form.features}
        onChange={(features) => setForm({ ...form, features })}
      />

      <CarImagePicker
        existingImages={existingImages}
        onExistingChange={onExistingChange}
        files={imageFiles}
        onFilesChange={onFilesChange}
        imageUrl={form.imageUrl}
        onImageUrlChange={(url) => setForm({ ...form, imageUrl: url })}
      />

      <label className="field field-wide" style={{ display: "block" }}>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          {t("carForm.description")}
        </span>
        <textarea
          placeholder={t("carForm.descriptionPh")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </label>
      <div className="fleet-car-form-actions">
        <button className="btn" type="submit" disabled={saving}>
          {saving
            ? uploadProgress || t("carForm.uploading")
            : isEdit
              ? t("carForm.update")
              : t("carForm.add")}
        </button>
        {isEdit && onCancel ? (
          <button
            type="button"
            className="btn ghost"
            onClick={onCancel}
            disabled={saving}
          >
            {t("carForm.cancelEdit")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
