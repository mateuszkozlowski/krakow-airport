"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

export function MainNav() {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.svg"
          alt="KRK.flights logo"
          width={16}
          height={16}
          className="h-4 w-auto"
        />
        <span className="text-xl font-semibold">KRK.flights</span>
      </Link>
      <nav>
        <Link 
          href="/passengerrights" 
          className="inline-flex h-9 items-center justify-center rounded-md bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20"
        >
          Passenger Rights
        </Link>
      </nav>
    </div>
  )
} 