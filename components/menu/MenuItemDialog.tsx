"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveMenuItemAction } from "@/lib/actions/menu";
import { CATEGORY_META } from "@/types/domain";
import type { MenuItem } from "@/types/domain";

// ── Submit button uses useFormStatus inside the form ──────────────────
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-sfx-red hover:bg-sfx-red/90 text-white"
      disabled={pending}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Saving…" : label}
    </Button>
  );
}

// ── Inner form — remounted via key to reset state on re-open ──────────
function MenuItemForm({
  item,
  onSuccess,
}: {
  item?: MenuItem;
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState(saveMenuItemAction, { error: null });

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} className="space-y-4 pt-2">
      {/* Hidden id for edit mode */}
      {item && <input type="hidden" name="id" value={item.id} />}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="item-name">Name</Label>
        <Input
          id="item-name"
          name="name"
          placeholder="e.g. Classic Burger"
          defaultValue={item?.name ?? ""}
          autoFocus
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="item-category">Category</Label>
        <Select name="category" defaultValue={item?.category ?? "burgers"}>
          <SelectTrigger id="item-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(CATEGORY_META) as [string, { label: string; emoji: string }][]).map(
              ([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.emoji} {meta.label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="item-price">Price (TL)</Label>
        <div className="relative">
          <Input
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            defaultValue={item?.price ?? ""}
            className="pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
            TL
          </span>
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <SubmitButton label={item ? "Save changes" : "Add item"} />
    </form>
  );
}

// ── Public dialog component ───────────────────────────────────────────
interface MenuItemDialogProps {
  item?: MenuItem;
  trigger: React.ReactNode;
}

export function MenuItemDialog({ item, trigger }: MenuItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) setFormKey((k) => k + 1); // remount form → reset state
  }

  function handleSuccess() {
    setOpen(false);
    toast.success(item ? "Item updated" : "Item added to menu");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add menu item"}</DialogTitle>
        </DialogHeader>
        <MenuItemForm key={formKey} item={item} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
