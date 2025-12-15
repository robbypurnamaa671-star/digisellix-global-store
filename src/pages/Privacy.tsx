import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SEOHead, generateBreadcrumbSchema } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  const { t } = useLanguage();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://digisellix.com/" },
    { name: "Privacy Policy", url: "https://digisellix.com/privacy" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy | Digisellix - Digital Product Marketplace"
        description="Read Digisellix's Privacy Policy. Learn how we collect, use, and protect your personal information on our digital product marketplace."
        canonicalUrl="https://digisellix.com/privacy"
        noIndex={false}
        structuredData={breadcrumbSchema}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          {t("privacy.backHome") || "Back to Home"}
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t("privacy.title") || "Privacy Policy"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("privacy.lastUpdated") || "Last updated: December 2024"}
        </p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              At Digisellix ("we," "our," or "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our digital product marketplace platform. Please read this policy carefully to understand our practices regarding your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">
              We collect information you provide directly to us:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li><strong>Account Information:</strong> Name, email address, password, and profile details</li>
              <li><strong>Payment Information:</strong> Payment method details processed through our secure payment partners</li>
              <li><strong>Transaction Data:</strong> Purchase history, products bought or sold, and transaction amounts</li>
              <li><strong>Communication Data:</strong> Messages between buyers and sellers, support inquiries</li>
              <li><strong>Seller Content:</strong> Product listings, descriptions, and uploaded files</li>
            </ul>
            <p className="text-muted-foreground mb-3">
              We automatically collect certain information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, clicks, and navigation patterns</li>
              <li><strong>Location Data:</strong> IP address-based location for language preferences and fraud prevention</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide, maintain, and improve our platform services</li>
              <li>Process transactions and send related notifications</li>
              <li>Enable communication between buyers and sellers</li>
              <li>Send important updates about your account and our services</li>
              <li>Detect and prevent fraud, abuse, and security issues</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Information Sharing</h2>
            <p className="text-muted-foreground mb-2">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Other Users:</strong> Seller names are visible on product listings; buyer information is shared with sellers to fulfill orders</li>
              <li><strong>Payment Processors:</strong> To process transactions securely</li>
              <li><strong>Service Providers:</strong> Third parties who help us operate our platform</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect your personal information. These include encryption for data in transit, secure payment processing through trusted partners, and access controls for our systems. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, except where we need to retain it for legal or business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground mb-2">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, please contact us through our support channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to enhance your experience on our platform. These help us remember your preferences, understand how you use our services, and improve our offerings. You can control cookie settings through your browser preferences, though some features may not function properly without cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Our platform may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our platform is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your own. By using our platform, you consent to such transfers. We ensure appropriate safeguards are in place to protect your data when it is transferred internationally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our platform with a new "Last Updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our data practices, please contact us via WhatsApp at +62 838 2219 9640 or through our support channels. We are committed to resolving any concerns you may have about your privacy.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("privacy.backHome") || "Back to Home"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
