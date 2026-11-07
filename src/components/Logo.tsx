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
      src="/logo-digisellix.png"
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
