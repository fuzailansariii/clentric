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
          // next/image would need every avatar host listed in
          // images.remotePatterns, and these URLs come in as props from
          // wherever the caller sourced them. A plain <img> is the honest
          // choice until the avatar source is fixed and configurable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={idx}
            src={url}
            alt=""
            className="size-8 rounded-full border-2 border-background object-cover"
          />
        ))}
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        Trusted by{" "}
        <span className="font-semibold text-foreground">
          {count.toLocaleString()}+
        </span>{" "}
        {label}
      </p>
    </div>
  );
}
