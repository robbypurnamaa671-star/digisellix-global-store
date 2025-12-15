import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SEOHead, generateBreadcrumbSchema } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const { t } = useLanguage();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://digisellix.com/" },
    { name: "Terms of Service", url: "https://digisellix.com/terms" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms of Service | Digisellix - Digital Product Marketplace"
        description="Read Digisellix's Terms of Service. Understand your rights and responsibilities when using our digital product marketplace platform."
        canonicalUrl="https://digisellix.com/terms"
        noIndex={false}
        structuredData={breadcrumbSchema}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          {t("terms.backHome") || "Back to Home"}
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t("terms.title") || "Terms of Service"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("terms.lastUpdated") || "Last updated: December 2024"}
        </p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Digisellix ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all users of the Platform, including buyers, sellers, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Digisellix is a digital marketplace that connects sellers of digital products (including but not limited to design templates, e-books, software, music, and other digital assets) with buyers. We provide the platform infrastructure for transactions but are not directly involved in the creation or quality of products sold by third-party sellers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground mb-2">
              To access certain features of the Platform, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Seller Responsibilities</h2>
            <p className="text-muted-foreground mb-2">
              As a seller on Digisellix, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Own or have proper rights to all products you sell</li>
              <li>Provide accurate descriptions of your products</li>
              <li>Deliver products as described after purchase</li>
              <li>Respond to customer inquiries in a timely manner</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Buyer Responsibilities</h2>
            <p className="text-muted-foreground mb-2">
              As a buyer on Digisellix, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use purchased products only as permitted by the seller's license</li>
              <li>Not redistribute, resell, or share purchased products unless authorized</li>
              <li>Provide accurate payment information</li>
              <li>Contact sellers through proper channels for support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Payments and Refunds</h2>
            <p className="text-muted-foreground">
              All payments are processed through our secure payment partners. Due to the digital nature of products sold on our platform, refunds are generally not available once a product has been downloaded. However, buyers may request refunds in cases of technical issues or products that significantly differ from their descriptions. Refund requests are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              Sellers retain ownership of their digital products. Buyers receive a license to use purchased products according to the terms specified by the seller. Digisellix respects intellectual property rights and will respond to valid infringement notices in accordance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Prohibited Activities</h2>
            <p className="text-muted-foreground mb-2">
              Users may not:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Sell counterfeit, stolen, or illegally obtained products</li>
              <li>Infringe on others' intellectual property rights</li>
              <li>Engage in fraudulent activities</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to manipulate reviews or ratings</li>
              <li>Use the platform for illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Digisellix provides the platform "as is" and makes no warranties regarding the quality, accuracy, or reliability of products sold by third-party sellers. We are not liable for any damages arising from the use of products purchased through our platform or disputes between buyers and sellers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms of Service at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. We encourage users to review this page periodically for updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us through our support channels or via WhatsApp at +62 838 2219 9640.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("terms.backHome") || "Back to Home"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Terms;
