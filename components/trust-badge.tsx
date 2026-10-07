import Image from "next/image";

type TrustBadgeProps = {
  avatarUrls: string[];
  count: number;
  label?: string;
};

export function TrustBadge({
  avatarUrls,
  count,
  label = "independent freelancers",
}: TrustBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {avatarUrls.map((url, idx) => (
          <Image
            key={idx}
            src={url}
            alt=""
            className="border-background size-8 rounded-full border-2 object-cover"
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs leading-snug">
        Trusted by{" "}
        <span className="text-foreground font-semibold">
          {count.toLocaleString()}+
        </span>{" "}
        {label}
      </p>
    </div>
  );
}
