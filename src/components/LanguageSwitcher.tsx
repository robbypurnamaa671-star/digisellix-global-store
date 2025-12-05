import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <Globe className="h-5 w-5 text-muted-foreground" />
      <div className="flex rounded-full border border-border overflow-hidden">
        <Button
          variant={language === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('en')}
          className={`rounded-none w-24 ${language === 'en' ? '' : 'hover:bg-muted'}`}
        >
          {t('language.english')}
        </Button>
        <Button
          variant={language === 'id' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('id')}
          className={`rounded-none w-24 ${language === 'id' ? '' : 'hover:bg-muted'}`}
        >
          {t('language.indonesian')}
        </Button>
      </div>
    </div>
  );
}
