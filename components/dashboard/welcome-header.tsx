type WelcomeHeaderProps = {
  name: string;
  /** No clients, proposals or invoices yet: welcome them instead of a greeting. */
  isNewUser?: boolean;
  /** Short status shown after the date, e.g. "Nothing needs you right now." */
  status?: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeHeader({
  name,
  isNewUser = false,
  status,
}: WelcomeHeaderProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-space text-2xl font-medium">
        {isNewUser
          ? `Welcome to Clentric, ${name}`
          : `${getGreeting()}, ${name}`}
      </h1>
      <p className="text-muted-foreground text-sm">
        {today}
        {status && ` · ${status}`}
      </p>
    </div>
  );
}
