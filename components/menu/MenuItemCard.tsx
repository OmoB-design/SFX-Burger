"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MenuItemDialog } from "@/components/menu/MenuItemDialog";
import { deleteMenuItemAction, toggleMenuItemAction } from "@/lib/actions/menu";
import { formatTL } from "@/lib/format";
import type { MenuItem } from "@/types/domain";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    await toggleMenuItemAction(item.id, checked);
    setToggling(false);
    toast.success(checked ? "Item activated" : "Item deactivated");
  }

  async function handleDelete() {
    await deleteMenuItemAction(item.id);
    setDeleteOpen(false);
    toast.success("Item deleted");
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-3">
        {/* Left: name + price */}
        <div className="min-w-0 flex-1">
          <p
            className={
              item.is_active
                ? "text-sm font-medium text-foreground truncate"
                : "text-sm font-medium text-muted-foreground line-through truncate"
            }
          >
            {item.name}
          </p>
          <p className="text-xs font-mono text-sfx-amber mt-0.5">
            {formatTL(item.price)}
          </p>
        </div>

        {/* Right: toggle + edit + delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={item.is_active}
            onCheckedChange={handleToggle}
            disabled={toggling}
            aria-label={item.is_active ? "Deactivate item" : "Activate item"}
          />
          <MenuItemDialog
            item={item}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{item.name}</span> will be permanently removed from the menu. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
              <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
