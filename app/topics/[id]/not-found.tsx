import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/product/copy";

export default function TopicNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="editorial-pipe text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">
        {PRODUCT_NAME}
      </p>
      <h1 className="mt-3 font-heading text-[32px] font-bold text-text-primary">Topic not found</h1>
      <p className="mt-3 max-w-md text-[14px] text-text-secondary">
        This topic is not in today&apos;s published rankings, or the link is from demo data.
        Detail pages are only available for live ranked topics.
      </p>
      <Link
        href="/"
        className="mt-6 text-[14px] font-semibold text-heat hover:text-heat-hover"
      >
        ← Back to {PRODUCT_NAME}
      </Link>
    </div>
  );
}
