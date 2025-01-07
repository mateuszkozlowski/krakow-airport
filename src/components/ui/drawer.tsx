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
    <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/40" />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[10px] border-t border-slate-700",
        "h-[85vh] bg-slate-900",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-1.5 w-[100px] rounded-full bg-slate-700" />
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
>(({ ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className="text-lg font-semibold text-slate-50"
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