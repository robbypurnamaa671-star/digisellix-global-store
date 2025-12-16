import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Info } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ForumNewTopic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t('forum.signInToPost'));
      navigate("/auth");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error(t('forum.fillAllFields'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("forum_topics").insert({
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        status: "pending",
      });

      if (error) throw error;

      toast.success(t('forum.topicSubmitted'));
      navigate("/forum");
    } catch (error: any) {
      toast.error(error.message || t('forum.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('forum.signInRequired')}</h2>
          <p className="text-muted-foreground mb-4">{t('forum.signInToCreateTopic')}</p>
          <Button onClick={() => navigate("/auth")}>{t('nav.login')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Create New Topic | Digisellix Forum"
        description="Start a new discussion topic in the Digisellix community forum."
        canonicalUrl="https://digisellix.com/forum/new"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('forum.backToForum')}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{t('forum.createNewTopic')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('forum.moderationNotice')}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t('forum.topicTitle')}</Label>
                <Input
                  id="title"
                  placeholder={t('forum.titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{t('forum.topicContent')}</Label>
                <Textarea
                  id="content"
                  placeholder={t('forum.contentPlaceholder')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/5000
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/forum")}
                >
                  {t('forum.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? t('forum.submitting') : t('forum.submitTopic')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForumNewTopic;
