import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl">💗</p>
      <div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Back home
      </Link>
    </div>
  );
}
