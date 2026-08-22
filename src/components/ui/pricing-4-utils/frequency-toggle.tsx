"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React from "react";

export type FREQUENCY = "monthly" | "yearly";

type FrequencyToggleProps = {
  frequency: FREQUENCY;
  setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function FrequencyToggle({
  frequency,
  setFrequency,
}: FrequencyToggleProps) {
  return (
    <div className="relative flex items-center rounded-full border bg-muted/30 p-1">
      {(["monthly", "yearly"] as const).map((option) => (
        <button
          key={option}
          onClick={() => setFrequency(option)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
            frequency === option
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {option === "monthly" ? "Monthly" : "Yearly"}
          {frequency === option && (
            <motion.div
              layoutId="frequency-toggle-active"
              className="absolute inset-0 rounded-full bg-background shadow-sm border"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
