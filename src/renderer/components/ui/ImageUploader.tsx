import {
  ImagePlus,
  X,
} from "lucide-react";

type Props = {
  image?: string;
  onChange: (
    file: File | null,
  ) => void;
};

export default function ImageUploader({
  image,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      {image ? (
        <div className="relative w-44">
          <img
            src={image}
            className="aspect-square w-full rounded border object-cover"
          />

          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex aspect-square w-44 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]">
          <ImagePlus size={34} />

          <span className="mt-3 text-sm">
            رفع صورة
          </span>

          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(e) =>
              onChange(
                e.target.files?.[0] ??
                  null,
              )
            }
          />
        </label>
      )}
    </div>
  );
}