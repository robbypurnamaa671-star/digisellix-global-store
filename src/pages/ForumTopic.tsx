import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Clock, User, Send, Trash2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const ForumTopic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ["forum-topic", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(full_name, avatar_url)
        `)
        .eq("id", id)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["forum-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_comments")
        .select(`
          *,
          author:profiles!forum_comments_author_id_fkey(full_name, avatar_url)
        `)
        .eq("topic_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("forum_comments").insert({
        topic_id: id,
        content,
        author_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["forum-comments", id] });
      toast.success(t('forum.commentAdded'));
    },
    onError: () => {
      toast.error(t('forum.commentError'));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-comments", id] });
      toast.success(t('forum.commentDeleted'));
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!user) {
      toast.error(t('forum.signInToComment'));
      navigate("/auth");
      return;
    }
    addCommentMutation.mutate(comment.trim());
  };

  if (topicLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-40 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('forum.topicNotFound')}</h2>
          <Button onClick={() => navigate("/forum")}>{t('forum.backToForum')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${topic.title} | Digisellix Forum`}
        description={topic.content.slice(0, 155)}
        canonicalUrl={`https://digisellix.com/forum/${topic.id}`}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('forum.backToForum')}
        </Link>

        {/* Topic */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{topic.title}</h1>
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <Avatar className="h-10 w-10">
                <AvatarImage src={topic.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {topic.author?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{topic.author?.full_name || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-foreground">
              <p className="whitespace-pre-wrap">{topic.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('forum.comments')} ({comments?.length || 0})
          </h2>

          {commentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-10 w-10 rounded-full mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.author?.avatar_url || undefined} />
                        <AvatarFallback>
                          {c.author?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {c.author?.full_name || "Anonymous"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </span>
                            {user?.id === c.author_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteCommentMutation.mutate(c.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('forum.noComments')}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Comment */}
        {user ? (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <Textarea
                  placeholder={t('forum.writeComment')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  type="submit" 
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {addCommentMutation.isPending ? t('forum.posting') : t('forum.postComment')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-secondary/50">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-3">{t('forum.signInToComment')}</p>
              <Button onClick={() => navigate("/auth")} variant="outline">
                {t('nav.login')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ForumTopic;
