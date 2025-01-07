"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & {
  shouldScaleBackground?: boolean
}) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerClose = DrawerPrimitive.Close

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPrimitive.Portal>
    <DrawerPrimitive.Overlay 
      className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
    />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[10px]",
        "bg-slate-900 border-t border-slate-800",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "duration-300 ease-in-out",
        "max-h-[96vh] min-h-[320px]",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-700/50" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPrimitive.Portal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className="grid gap-1.5 p-4 text-center sm:text-left"
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-slate-50", className)}
    {...props}
  />
))
DrawerTitle.displayName = "DrawerTitle"

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
} 