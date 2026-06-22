import Image from "next/image";

/** Source asset: resource for pic/head - white.png (1765×397). */
const HEAD_WIDTH = 1765;
const HEAD_HEIGHT = 397;

export default function SolanaSpaceBrand() {
  return (
    <div>
      <p className="sr-only">Solana Space</p>
      <Image
        src="/brand/solana-space-head-white.png"
        alt=""
        width={HEAD_WIDTH}
        height={HEAD_HEIGHT}
        className="h-14 w-auto sm:h-16"
        priority
        aria-hidden
      />
    </div>
  );
}
