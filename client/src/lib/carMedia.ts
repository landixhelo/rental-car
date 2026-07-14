import { api } from "./api";

/** Resize/compress before upload so Vercel proxy (~4.5MB) does not reject the request. */
export function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.78
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.\w+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Foto e pavlefshme"));
    };
    img.src = url;
  });
}

/** Upload one image at a time (avoids large multipart through Vercel). */
export async function uploadCarImageFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 8)) {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("image", compressed);
    const { url } = await api.uploadCarImage(fd);
    urls.push(url);
  }
  return urls;
}

export function buildCarJsonPayload(
  form: {
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
    status: string;
    description: string;
    featuresText: string;
    imageUrl: string;
  },
  images: string[]
) {
  const features = form.featuresText
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const cover = form.imageUrl.trim() || images[0] || "";
  const allImages = [...images];
  if (form.imageUrl.trim() && !allImages.includes(form.imageUrl.trim())) {
    allImages.unshift(form.imageUrl.trim());
  }

  return {
    brand: form.brand,
    model: form.model,
    year: form.year,
    pricePerDay: form.pricePerDay,
    seats: form.seats,
    doors: form.doors,
    luggage: form.luggage,
    horsepower: form.horsepower || undefined,
    color: form.color || undefined,
    mileage: form.mileage || undefined,
    location: form.location || "Tiranë",
    fuel: form.fuel,
    transmission: form.transmission,
    type: form.type,
    status: form.status,
    description: form.description,
    features,
    imageUrl: cover,
    images: allImages.slice(0, 8),
    imageUrls: allImages.slice(0, 8),
  };
}
