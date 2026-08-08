type WelcomeHeaderProps = {
  name: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeHeader({ name }: WelcomeHeaderProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-space text-2xl font-medium">
        {getGreeting()}, {name}
      </h1>
      <p className="text-muted-foreground text-sm">{today}</p>
    </div>
  );
}
