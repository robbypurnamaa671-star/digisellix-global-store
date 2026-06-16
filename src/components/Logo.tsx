import logoAsset from "@/assets/digisellix-logo.webp.asset.json";

interface LogoProps {
  className?: string;
  height?: number;
  priority?: boolean;
}

export function Logo({ className = "h-8 w-auto", height = 32, priority = false }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="Digisellix — Global Digital Product Marketplace"
      height={height}
      width={height * 3}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}

export default Logo;
