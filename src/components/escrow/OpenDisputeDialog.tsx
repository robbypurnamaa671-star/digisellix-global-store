import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: { id: string; buyer_id: string; seller_id: string } | null;
}

export const OpenDisputeDialog = ({ open, onOpenChange, order }: Props) => {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order");
      if (message.trim().length < 10)
        throw new Error("Please describe the issue (min 10 characters)");
      const { error } = await supabase.from("disputes").insert({
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        buyer_message: message.trim(),
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute opened. Our team will review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-disputes"] });
      setMessage("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to open dispute"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a dispute</DialogTitle>
          <DialogDescription>
            Tell us what went wrong with this order. Funds will stay held in
            escrow until our team resolves the dispute.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="dispute-msg">What happened?</Label>
          <Textarea
            id="dispute-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue with the product or delivery..."
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Submitting..." : "Submit dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
