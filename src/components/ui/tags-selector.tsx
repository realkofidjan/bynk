"use client" 

import * as React from "react"

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export type Tag = {
  id: string;
  label: string;
};

export type TagsSelectorProps = {
  tags: Tag[];
  selectedTags?: Tag[];
  onSelectedTagsChange?: (tags: Tag[]) => void;
};

export function TagsSelector({ tags, selectedTags: externalSelected, onSelectedTagsChange }: TagsSelectorProps) {
  const [internalSelectedTags, setInternalSelectedTags] = useState<Tag[]>([]);
  const selectedTags = externalSelected !== undefined ? externalSelected : internalSelectedTags;

  const selectedsContainerRef = useRef<HTMLDivElement>(null);

  const updateSelectedTags = (newSelected: Tag[]) => {
    if (externalSelected === undefined) {
      setInternalSelectedTags(newSelected);
    }
    onSelectedTagsChange?.(newSelected);
  };

  const removeSelectedTag = (id: string) => {
    updateSelectedTags(selectedTags.filter((tag) => tag.id !== id));
  };

  const addSelectedTag = (tag: Tag) => {
    updateSelectedTags([...selectedTags, tag]);
  };

  const clearAllTags = () => {
    updateSelectedTags([]);
  };

  useEffect(() => {
    if (selectedsContainerRef.current) {
      selectedsContainerRef.current.scrollTo({
        left: selectedsContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [selectedTags]);

  return (
    <div className="w-full flex flex-col">
      {selectedTags.length > 0 && (
        <div className="flex items-center justify-between px-0.5 mb-1">
          <span className="text-foreground/70 text-[9px] font-mono uppercase tracking-[0.15em] font-medium">
            Selected ({selectedTags.length})
          </span>
          <button
            type="button"
            onClick={clearAllTags}
            className="text-foreground/60 hover:text-foreground text-[9px] font-mono uppercase tracking-[0.15em] underline underline-offset-2 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
      <motion.div
        className="w-full flex items-center justify-start gap-1.5 bg-background border border-foreground/20 min-h-12 mt-0.5 mb-2 overflow-x-auto p-1.5 no-scrollbar rounded-none"
        ref={selectedsContainerRef}
        layout
      >
        {selectedTags.length === 0 && (
          <span className="text-foreground/40 text-[10px] font-mono uppercase tracking-[0.15em] px-2">
            No add-ons selected
          </span>
        )}
        {selectedTags.map((tag) => (
          <motion.div
            key={tag.id}
            className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-foreground/10 border border-foreground/20 shrink-0 rounded-none"
            layoutId={`tag-${tag.id}`}
          >
            <motion.span
              layoutId={`tag-${tag.id}-label`}
              className="text-foreground text-[10px] font-mono font-medium"
            >
              {tag.label}
            </motion.span>
            <button
              type="button"
              onClick={() => removeSelectedTag(tag.id)}
              className="p-0.5 rounded-none hover:bg-foreground/20 transition-colors cursor-pointer"
            >
              <X className="size-3 text-foreground/80" />
            </button>
          </motion.div>
        ))}
      </motion.div>
      {tags.length > selectedTags.length && (
        <motion.div
          className="bg-background p-2 border border-foreground/20 w-full rounded-none"
          layout
        >
          <motion.div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {tags
              .filter(
                (tag) =>
                  !selectedTags.some((selected) => selected.id === tag.id)
              )
              .map((tag) => (
                <motion.button
                  type="button"
                  key={tag.id}
                  layoutId={`tag-${tag.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-foreground/[0.04] hover:bg-foreground/[0.1] border border-foreground/15 rounded-none shrink-0 transition-colors text-left cursor-pointer"
                  onClick={() => addSelectedTag(tag)}
                >
                  <motion.span
                    layoutId={`tag-${tag.id}-label`}
                    className="text-foreground/90 text-[10px] font-mono tracking-wide"
                  >
                    {tag.label}
                  </motion.span>
                </motion.button>
              ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
