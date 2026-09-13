import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string;
  priority?: boolean;
};

function BrandContent({ priority }: Pick<Props, "priority">) {
  return (
    <>
      <span className="museum-brand-symbol" aria-hidden="true">
        <Image
          src="/brand/sojangso-sjs-frame.png"
          alt=""
          width={36}
          height={36}
          priority={priority}
        />
      </span>
      <span className="museum-brand-wordmark">SOJANGSO</span>
    </>
  );
}

export default function BrandMark({ href, priority }: Props) {
  if (href) {
    return (
      <Link href={href} className="museum-brand" aria-label="SOJANGSO 홈">
        <BrandContent priority={priority} />
      </Link>
    );
  }

  return (
    <div className="museum-brand">
      <BrandContent priority={priority} />
    </div>
  );
}
