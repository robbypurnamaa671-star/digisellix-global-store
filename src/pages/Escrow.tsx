import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Users,
  CreditCard,
  FileCheck,
  Gavel
} from "lucide-react";

const Escrow = () => {
  const { t } = useLanguage();

  const escrowSteps = [
    {
      icon: CreditCard,
      step: "01",
      title: t('escrow.steps.payment.title'),
      desc: t('escrow.steps.payment.desc'),
    },
    {
      icon: Lock,
      step: "02",
      title: t('escrow.steps.held.title'),
      desc: t('escrow.steps.held.desc'),
    },
    {
      icon: FileCheck,
      step: "03",
      title: t('escrow.steps.delivery.title'),
      desc: t('escrow.steps.delivery.desc'),
    },
    {
      icon: CheckCircle,
      step: "04",
      title: t('escrow.steps.release.title'),
      desc: t('escrow.steps.release.desc'),
    },
  ];

  const buyerProtections = [
    { icon: Shield, text: t('escrow.buyer.protection1') },
    { icon: Clock, text: t('escrow.buyer.protection2') },
    { icon: AlertTriangle, text: t('escrow.buyer.protection3') },
    { icon: Gavel, text: t('escrow.buyer.protection4') },
  ];

  const sellerProtections = [
    { icon: Shield, text: t('escrow.seller.protection1') },
    { icon: Clock, text: t('escrow.seller.protection2') },
    { icon: CheckCircle, text: t('escrow.seller.protection3') },
    { icon: Gavel, text: t('escrow.seller.protection4') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('escrow.seo.title')}
        description={t('escrow.seo.description')}
        canonicalUrl="https://digisellix.com/escrow"
        keywords="escrow, rekber, secure payment, buyer protection, seller protection, digital marketplace"
      />
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">{t('escrow.badge')}</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              {t('escrow.hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('escrow.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button variant="hero" size="lg">
                  {t('escrow.hero.useService')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  {t('escrow.hero.contactUs')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What is Escrow/Rekber */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold">{t('escrow.what.title')}</h2>
              <p className="text-lg text-muted-foreground">
                {t('escrow.what.description')}
              </p>
            </div>
            <Card className="p-8 bg-card/50 backdrop-blur">
              <CardContent className="p-0 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{t('escrow.what.trusted.title')}</h3>
                    <p className="text-muted-foreground">{t('escrow.what.trusted.desc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{t('escrow.what.secure.title')}</h3>
                    <p className="text-muted-foreground">{t('escrow.what.secure.desc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold">{t('escrow.howItWorks.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('escrow.howItWorks.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {escrowSteps.map((item, idx) => (
              <Card key={idx} className="relative overflow-hidden hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold text-primary/10 mb-4">{item.step}</div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fees Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold">{t('escrow.fees.title')}</h2>
              <p className="text-lg text-muted-foreground">
                {t('escrow.fees.subtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-primary/20">
                <CardContent className="p-0 text-center space-y-4">
                  <div className="text-5xl font-bold text-primary">5%</div>
                  <h3 className="text-xl font-semibold">{t('escrow.fees.platform.title')}</h3>
                  <p className="text-muted-foreground">{t('escrow.fees.platform.desc')}</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-0 space-y-4">
                  <h3 className="text-xl font-semibold">{t('escrow.fees.whoPays.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <span className="font-medium">{t('escrow.fees.whoPays.buyer')}</span>
                        <p className="text-sm text-muted-foreground">{t('escrow.fees.whoPays.buyerDesc')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <span className="font-medium">{t('escrow.fees.whoPays.seller')}</span>
                        <p className="text-sm text-muted-foreground">{t('escrow.fees.whoPays.sellerDesc')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Buyer Protection */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Buyer Protection */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{t('escrow.buyer.badge')}</span>
                </div>
                <h2 className="text-3xl font-bold">{t('escrow.buyer.title')}</h2>
                <p className="text-muted-foreground">{t('escrow.buyer.description')}</p>
                <div className="space-y-4">
                  {buyerProtections.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                      <div className="p-2 rounded-full bg-blue-500/10">
                        <item.icon className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller Protection */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">{t('escrow.seller.badge')}</span>
                </div>
                <h2 className="text-3xl font-bold">{t('escrow.seller.title')}</h2>
                <p className="text-muted-foreground">{t('escrow.seller.description')}</p>
                <div className="space-y-4">
                  {sellerProtections.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <item.icon className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dispute Resolution */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full">
              <Gavel className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">{t('escrow.dispute.badge')}</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold">{t('escrow.dispute.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('escrow.dispute.description')}
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              <Card className="p-6">
                <CardContent className="p-0 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold">{t('escrow.dispute.step1.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('escrow.dispute.step1.desc')}</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-0 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold">{t('escrow.dispute.step2.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('escrow.dispute.step2.desc')}</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-0 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Gavel className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold">{t('escrow.dispute.step3.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('escrow.dispute.step3.desc')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">{t('escrow.cta.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('escrow.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button variant="hero" size="lg">
                  {t('escrow.cta.useService')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  {t('escrow.cta.contact')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Digisellix. {t('footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Escrow;
