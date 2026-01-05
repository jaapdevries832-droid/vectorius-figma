"use client"

import Image from "next/image"
import React, { useState } from "react"

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=="

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setDidError(true)
    props.onError?.(event)
  }

  const {
    src,
    alt,
    style,
    className,
    width,
    height,
    sizes,
    loading,
    decoding,
    crossOrigin,
    referrerPolicy,
    id,
    title,
    role,
    tabIndex,
    onClick,
    onLoad,
  } = props

  const resolvedSrc =
    typeof src === "string" && src.length > 0 ? src : ERROR_IMG_SRC
  const isFallback = didError || !src
  const resolvedAlt = isFallback ? "Error loading image" : alt ?? ""

  const numericWidth = typeof width === "number" ? width : undefined
  const numericHeight = typeof height === "number" ? height : undefined
  const shouldFill = !numericWidth || !numericHeight

  const baseProps = {
    id,
    title,
    role,
    tabIndex,
    className,
    style,
    sizes,
    loading,
    decoding,
    crossOrigin,
    referrerPolicy,
    onClick,
    onLoad,
  }

  const wrapperStyle: React.CSSProperties = {
    display: style?.display ?? "inline-block",
    position: style?.position ?? "relative",
    ...style,
  }

  if (isFallback) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          {shouldFill ? (
            <div style={wrapperStyle} className={className}>
              <Image
                {...baseProps}
                src={ERROR_IMG_SRC}
                alt={resolvedAlt}
                fill
                data-original-url={src}
              />
            </div>
          ) : (
            <Image
              {...baseProps}
              src={ERROR_IMG_SRC}
              alt={resolvedAlt}
              width={numericWidth}
              height={numericHeight}
              data-original-url={src}
            />
          )}
        </div>
      </div>
    )
  }

  if (shouldFill) {
    return (
      <div style={wrapperStyle} className={className}>
        <Image
          {...baseProps}
          src={resolvedSrc}
          alt={resolvedAlt}
          fill
          onError={handleError}
        />
      </div>
    )
  }

  return (
    <Image
      {...baseProps}
      src={resolvedSrc}
      alt={resolvedAlt}
      width={numericWidth}
      height={numericHeight}
      onError={handleError}
    />
  )
}
