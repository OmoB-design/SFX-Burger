"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuItemDialog } from "@/components/menu/MenuItemDialog";
import { CATEGORY_META } from "@/types/domain";
import type { MenuItem, MenuCategory } from "@/types/domain";

interface MenuItemsClientProps {
  items: MenuItem[];
}

const CATEGORY_ORDER: MenuCategory[] = ["burgers", "shawarma", "soups", "rice", "other"];

export function MenuItemsClient({ items }: MenuItemsClientProps) {
  // Group items by category
  const byCategory = CATEGORY_ORDER.reduce<Record<MenuCategory, MenuItem[]>>(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.category === cat);
      return acc;
    },
    { burgers: [], shawarma: [], soups: [], rice: [], other: [] }
  );

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat];
        const catItems = byCategory[cat];

        return (
          <section key={cat}>
            {/* Category header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{meta.emoji}</span>
                <h2 className="text-base font-semibold text-foreground">
                  {meta.label}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  ({catItems.length})
                </span>
              </div>
              <MenuItemDialog
                trigger={
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                }
                item={undefined}
              />
            </div>

            {/* Items list */}
            {catItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No items in {meta.label.toLowerCase()} yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {catItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
