export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && Boolean(v.trim()));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is string => typeof v === "string" && Boolean(v.trim())
        );
      }
    } catch {
      return [value.trim()];
    }
  }
  return [];
}

export function normalizeCarImages(opts: {
  imageUrl?: string | null;
  images?: unknown;
  uploadedPaths?: string[];
  existingImages?: unknown;
  keepExisting?: boolean;
}): { imageUrl: string; images: string[] } {
  const list: string[] = [];

  if (opts.keepExisting) {
    list.push(...asStringArray(opts.existingImages));
  }

  list.push(...asStringArray(opts.images));

  if (opts.uploadedPaths?.length) {
    list.push(...opts.uploadedPaths);
  }

  const url = opts.imageUrl?.trim();
  if (url) {
    if (!list.includes(url)) list.unshift(url);
  }

  const unique = [...new Set(list.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    8
  );

  if (!unique.length) {
    return { imageUrl: "", images: [] };
  }

  return {
    imageUrl: unique[0],
    images: unique,
  };
}

export function carImagesFromRecord(car: {
  imageUrl: string;
  images?: unknown;
}): string[] {
  const fromJson = asStringArray(car.images);
  if (fromJson.length) return fromJson;
  return car.imageUrl ? [car.imageUrl] : [];
}
