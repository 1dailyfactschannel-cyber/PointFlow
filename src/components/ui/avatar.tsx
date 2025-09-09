
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import type { Status } from "@/lib/data"


const statusColorMap: Record<Status, string> = {
  online: "border-green-500",
  offline: "border-gray-500",
  sick: "border-yellow-500",
  vacation: "border-blue-500",
};

const statusBgColorMap: Record<Status, string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  sick: "bg-yellow-500",
  vacation: "bg-blue-500",
};


const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { status?: Status }
>(({ className, status, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      status && "border-2",
      status && statusColorMap[status],
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

const AvatarStatusIndicator = ({ status, className }: { status: Status, className?: string }) => {
  return (
    <span className={cn(
        "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-background",
        statusBgColorMap[status],
        className
    )} />
  );
}
AvatarStatusIndicator.displayName = "AvatarStatusIndicator";


export { Avatar, AvatarImage, AvatarFallback, AvatarStatusIndicator }
