type WelcomeHeaderProps = {
  name: string;
};

export default function WelcomeHeader({
  name = "John Doe",
}: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col">
      <h1 className="font-space text-xl font-medium">Welcome, {name}</h1>
    </div>
  );
}
