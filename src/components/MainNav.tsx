"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

export function MainNav() {
  return (
    <div className="flex items-center justify-between w-full gap-2 px-2 sm:px-0">
      <Link href="/" className="flex items-center gap-1 sm:gap-2">
        <Image
          src="/logo.svg"
          alt="KRK.flights logo"
          width={16}
          height={16}
          className="h-3 w-auto sm:h-4"
        />
        <span className="text-lg sm:text-xl font-semibold text-white">KRK.flights</span>
      </Link>
      <nav>

      </nav>
    </div>
  )
} 