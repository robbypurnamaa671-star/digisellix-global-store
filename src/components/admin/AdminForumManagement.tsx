import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Trash2, Clock, User, MessageSquare, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const AdminForumManagement = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  const { data: pendingTopics, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-forum-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(full_name, avatar_url)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: allTopics, isLoading: allLoading } = useQuery({
    queryKey: ["admin-forum-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(full_name, avatar_url),
          comments:forum_comments(count)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("forum_topics")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-forum-all"] });
      toast.success(status === "approved" ? t('forum.topicApproved') : t('forum.topicRejected'));
    },
    onError: () => {
      toast.error(t('forum.updateError'));
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("forum_topics")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-forum-all"] });
      toast.success(t('forum.topicDeleted'));
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500">{t('forum.approved')}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t('forum.rejected')}</Badge>;
      default:
        return <Badge variant="secondary">{t('forum.pending')}</Badge>;
    }
  };

  const TopicCard = ({ topic, showActions = false }: { topic: any; showActions?: boolean }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(topic.status)}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
              </span>
            </div>
            <h3 className="font-semibold mb-2 line-clamp-1">{topic.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {topic.content}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {topic.author?.full_name || "Unknown"}
              </span>
              {topic.comments && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {topic.comments[0]?.count || 0}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setSelectedTopic(topic)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{topic.title}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {topic.author?.full_name || "Unknown"}
                    <span>•</span>
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                  </div>
                  <p className="whitespace-pre-wrap">{topic.content}</p>
                </div>
              </DialogContent>
            </Dialog>
            
            {showActions && topic.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-green-500 hover:text-green-600"
                  onClick={() => updateStatusMutation.mutate({ id: topic.id, status: "approved" })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-orange-500 hover:text-orange-600"
                  onClick={() => updateStatusMutation.mutate({ id: topic.id, status: "rejected" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('forum.confirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('forum.deleteWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('forum.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteTopicMutation.mutate(topic.id)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {t('forum.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            {t('forum.pendingReview')}
            {pendingTopics && pendingTopics.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingTopics.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">{t('forum.allTopics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingTopics && pendingTopics.length > 0 ? (
            <div className="space-y-4">
              {pendingTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} showActions />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>{t('forum.noPendingTopics')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {allLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allTopics && allTopics.length > 0 ? (
            <div className="space-y-4">
              {allTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} showActions={topic.status === "pending"} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>{t('forum.noTopicsYet')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
