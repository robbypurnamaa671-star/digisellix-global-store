import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { SEOHead, generateBreadcrumbSchema } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShoppingBag, Users, Shield, Globe, Heart, ArrowRight } from "lucide-react";

const About = () => {
  const { t } = useLanguage();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://digisellix.com/" },
    { name: "About", url: "https://digisellix.com/about" },
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Digisellix",
    "url": "https://digisellix.com",
    "logo": "https://digisellix.com/favicon.ico",
    "description": "Global marketplace for buying and selling digital products including design bundles, templates, software, and creative assets.",
    "foundingDate": "2024",
    "founders": [
      {
        "@type": "Person",
        "name": "Digisellix Team"
      }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "availableLanguage": ["English", "Indonesian"]
    }
  };

  const values = [
    {
      icon: Users,
      title: t("about.values.community.title") || "Creator Community",
      description: t("about.values.community.desc") || "We empower digital creators worldwide to monetize their skills and reach a global audience.",
    },
    {
      icon: Shield,
      title: t("about.values.trust.title") || "Trust & Security",
      description: t("about.values.trust.desc") || "Secure payments and verified transactions protect both buyers and sellers on our platform.",
    },
    {
      icon: Globe,
      title: t("about.values.global.title") || "Global Reach",
      description: t("about.values.global.desc") || "Connect with customers and creators from around the world with multi-currency support.",
    },
    {
      icon: Heart,
      title: t("about.values.quality.title") || "Quality First",
      description: t("about.values.quality.desc") || "We curate and feature high-quality digital products that meet our community standards.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About Digisellix | Our Mission & Story - Digital Product Marketplace"
        description="Learn about Digisellix, the trusted global marketplace for digital products. Discover our mission to empower creators and connect them with buyers worldwide."
        canonicalUrl="https://digisellix.com/about"
        keywords="about digisellix, digital marketplace company, creator platform, sell digital products"
        structuredData={{ ...breadcrumbSchema, ...organizationSchema }}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <ShoppingBag className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digisellix
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t("about.title") || "Empowering Digital Creators Worldwide"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t("about.subtitle") || "We're building the go-to marketplace for digital products, connecting talented creators with buyers who value quality digital assets."}
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
              {t("about.mission.title") || "Our Mission"}
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-center">
              <p className="text-muted-foreground text-lg">
                {t("about.mission.text") || "At Digisellix, we believe that talented creators deserve a platform to share their work with the world. Our mission is to democratize the digital economy by providing a secure, user-friendly marketplace where creators can sell their digital products—from design templates and e-books to software tools and creative assets—while buyers can discover high-quality resources to fuel their projects."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-center">
            {t("about.values.title") || "Our Values"}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
              {t("about.story.title") || "Our Story"}
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-muted-foreground mb-4">
                {t("about.story.p1") || "Digisellix was founded with a simple idea: make it easy for anyone to sell digital products online. We saw creators struggling with complicated platforms, high fees, and limited reach. We knew there had to be a better way."}
              </p>
              <p className="text-muted-foreground mb-4">
                {t("about.story.p2") || "Today, Digisellix serves creators and buyers from around the globe. Our platform supports multiple currencies, instant digital delivery, and secure payment processing—all designed to provide the best experience for our community."}
              </p>
              <p className="text-muted-foreground">
                {t("about.story.p3") || "We're committed to continuous improvement, listening to our users, and building features that matter. Whether you're a designer selling templates, a developer offering tools, or a buyer looking for quality resources, Digisellix is here to help you succeed."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            {t("about.cta.title") || "Ready to Join Our Community?"}
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {t("about.cta.subtitle") || "Start selling your digital products or discover amazing resources from creators worldwide."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Browse Products
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                Start Selling
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
