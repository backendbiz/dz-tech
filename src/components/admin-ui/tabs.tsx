'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'group/tabs adm:flex adm:gap-2 data-[orientation=horizontal]:adm:flex-col',
        className,
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  'adm:inline-flex adm:w-fit adm:items-center adm:justify-center adm:gap-2 group/tabs-list',
  {
    variants: {
      variant: {
        default: 'adm:bg-transparent',
        line: 'adm:bg-transparent adm:rounded-none adm:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'adm:inline-flex adm:relative adm:items-center adm:justify-center adm:whitespace-nowrap adm:rounded-lg adm:px-6 adm:py-2.5 adm:text-sm adm:font-medium adm:transition-all adm:border adm:border-transparent focus-visible:adm:outline-none focus-visible:adm:ring-2 focus-visible:adm:ring-(--adm-accent) disabled:adm:pointer-events-none disabled:adm:opacity-50 adm:cursor-pointer',

        // Inactive State: Transparent background with light gray text
        'adm:bg-transparent adm:text-(--adm-muted) hover:adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)',

        // Active State: Card color scheme with blue color integration
        'data-[state=active]:adm:bg-[var(--adm-surface)] data-[state=active]:adm:border-[var(--adm-border)] data-[state=active]:adm:text-[var(--adm-blue)] data-[state=active]:adm:shadow-sm data-[state=active]:adm:font-semibold',

        // Line variant specifics
        'group-data-[variant=line]/tabs-list:adm:rounded-none group-data-[variant=line]/tabs-list:data-[state=active]:adm:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:adm:border-transparent group-data-[variant=line]/tabs-list:data-[state=active]:adm:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:adm:text-foreground group-data-[variant=line]/tabs-list:adm:text-muted-foreground',
        'after:adm:absolute after:adm:bottom-[-5px] after:adm:left-0 after:adm:h-[2px] after:adm:w-full after:adm:bg-foreground after:adm:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:adm:opacity-100',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('adm:flex-1 adm:outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
