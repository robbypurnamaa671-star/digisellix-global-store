import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, User, Save, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SellerVerificationForm from "@/components/seller/SellerVerificationForm";

const SellerSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set initial values when profile loads
  useState(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDescription((profile as any).description || "");
    }
  });

  // Update form when profile data changes
  if (profile && !fullName && profile.full_name) {
    setFullName(profile.full_name);
  }
  if (profile && !description && (profile as any).description) {
    setDescription((profile as any).description);
  }

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      let avatarUrl = (profile as any)?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        // Delete old avatar if exists
        if (avatarUrl) {
          const oldPath = avatarUrl.split('/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
        setUploading(false);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          description: description,
          avatar_url: avatarUrl,
        } as any)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      toast.success(t('sellerSettings.saveSuccess'));
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error(t('sellerSettings.saveError'));
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('sellerSettings.invalidFileType'));
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error(t('sellerSettings.fileTooLarge'));
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentAvatarUrl = avatarPreview || (profile as any)?.avatar_url;

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/seller')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('sellerSettings.backToDashboard')}
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('sellerSettings.profileTab')}
              </TabsTrigger>
              <TabsTrigger value="verification" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t('sellerSettings.verificationTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('sellerSettings.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('sellerSettings.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* Avatar Section */}
                      <div className="space-y-4">
                        <Label>{t('sellerSettings.shopAvatar')}</Label>
                        <div className="flex items-center gap-6">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={currentAvatarUrl} alt={fullName} />
                            <AvatarFallback className="text-2xl">
                              {getInitials(fullName || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {t('sellerSettings.avatarHint')}
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".png,.jpg,.jpeg"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {t('sellerSettings.uploadAvatar')}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Shop Name */}
                      <div className="space-y-2">
                        <Label htmlFor="fullName">{t('sellerSettings.shopName')}</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t('sellerSettings.shopNamePlaceholder')}
                          maxLength={100}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description">{t('sellerSettings.shopDescription')}</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={t('sellerSettings.shopDescriptionPlaceholder')}
                          rows={4}
                          maxLength={500}
                        />
                        <p className="text-sm text-muted-foreground">
                          {description.length}/500 {t('sellerSettings.characters')}
                        </p>
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={() => updateProfileMutation.mutate()}
                        disabled={updateProfileMutation.isPending || uploading}
                        className="w-full"
                      >
                        {(updateProfileMutation.isPending || uploading) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {t('sellerSettings.saveChanges')}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification">
              <SellerVerificationForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SellerSettings;
