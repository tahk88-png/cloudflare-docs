'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const hasMultipleImages = images.length > 1

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const previous = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
        <Image
          src={images[currentIndex] || '/images/placeholder-tool.jpg'}
          alt={`${productName} - Image ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white"
              onClick={previous}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white"
              onClick={next}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultipleImages && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-accent ring-2 ring-accent/20'
                  : 'border-neutral-800 hover:border-neutral-600'
              }`}
            >
              <Image
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
