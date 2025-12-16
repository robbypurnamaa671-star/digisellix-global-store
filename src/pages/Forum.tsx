import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, Clock, User, ChevronRight } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";

const Forum = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: topics, isLoading } = useQuery({
    queryKey: ["forum-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(full_name, avatar_url),
          comments:forum_comments(count)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["forum-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("forum_topics")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Community Forum | Digisellix - Digital Marketplace Discussions"
        description="Join the Digisellix community forum. Discuss digital products, share tips, ask questions, and connect with other buyers and sellers."
        canonicalUrl="https://digisellix.com/forum"
      />
      <Navigation />

      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">{t('forum.title')}</h1>
              <p className="text-muted-foreground">{t('forum.subtitle')}</p>
            </div>
            {user && (
              <Button onClick={() => navigate("/forum/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('forum.newTopic')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Topics List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topics && topics.length > 0 ? (
            <div className="space-y-4">
              {topics.map((topic) => (
                <Link key={topic.id} to={`/forum/${topic.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                            {topic.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                            {topic.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{topic.author?.full_name || "Anonymous"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{topic.comments?.[0]?.count || 0} {t('forum.comments')}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('forum.noTopics')}</h3>
                <p className="text-muted-foreground mb-4">{t('forum.beFirst')}</p>
                {user ? (
                  <Button onClick={() => navigate("/forum/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('forum.createTopic')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/auth")}>
                    {t('forum.signInToPost')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!user && topics && topics.length > 0 && (
            <Card className="mt-6 bg-secondary/50">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-3">{t('forum.joinDiscussion')}</p>
                <Button onClick={() => navigate("/auth")} variant="outline">
                  {t('forum.signInToPost')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default Forum;
