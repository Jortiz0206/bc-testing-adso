import logoC from "@/assets/logo-ClassKids.png";

interface LoadingScreenProps {
  label?: string;
}

const LoadingScreen = ({ label = "Cargando" }: LoadingScreenProps) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
    <div className="relative flex h-24 w-24 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping [animation-duration:1.8s]" />
      <span className="absolute inset-2 rounded-full bg-primary/10 animate-pulse-gentle" />
      <img
        src={logoC}
        alt="ClassKids"
        className="relative h-14 w-14 rounded-2xl shadow-lg shadow-primary/25 animate-fade-in"
      />
    </div>
    <div className="flex flex-col items-center gap-1 animate-fade-in [animation-delay:150ms]">
      <p className="font-display text-lg font-semibold tracking-tight text-foreground">ClassKids</p>
      <p className="text-xs text-muted-foreground">{label}…</p>
    </div>
    <div className="flex gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-gentle [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-gentle [animation-delay:200ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-gentle [animation-delay:400ms]" />
    </div>
  </div>
);

export default LoadingScreen;
