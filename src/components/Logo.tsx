import logoAsset from "@/assets/logo-digisellix.png";

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Official Digisellix wordmark (icon + name), used everywhere the brand appears.
 */
export function Logo({ className = "h-8 w-auto", alt = "Digisellix" }: LogoProps) {
  return (
    <img
      src={logoAsset}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
