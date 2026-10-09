import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { bannerService } from '@/services/banner-service'
import { cn } from '@/lib/utils'
import dashboardDark from '../assets/dashboard-dark.png'
import dashboardLight from '../assets/dashboard-light.png'

export function LoginBannerCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Fetch active login banners from public API
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['public-banners', 'login'],
    queryFn: () => bannerService.getPublicBanners('login'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Initialize Embla with Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 30 },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    onSelect()
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index)
    },
    [emblaApi]
  )

  // FALLBACK: When loading or when no custom banners uploaded
  if (isLoading || banners.length === 0) {
    return (
      <div
        className={cn(
          'relative h-full overflow-hidden bg-muted max-lg:hidden',
          '[&>img]:absolute [&>img]:top-[15%] [&>img]:left-20 [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-top-left [&>img]:select-none'
        )}
      >
        <img
          src={dashboardLight}
          className='dark:hidden'
          width={1024}
          height={1151}
          alt='Portal PEMDA'
        />
        <img
          src={dashboardDark}
          className='hidden dark:block'
          width={1024}
          height={1138}
          alt='Portal PEMDA'
        />
      </div>
    )
  }

  // DYNAMIC CAROUSEL: When active banners exist
  return (
    <div className='relative h-full w-full overflow-hidden bg-muted select-none group max-lg:hidden'>
      {/* Embla Viewport */}
      <div className='h-full w-full overflow-hidden' ref={emblaRef}>
        <div className='flex h-full'>
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className='relative min-w-full h-full flex-[0_0_100%] overflow-hidden'
            >
              <img
                src={banner.image_url}
                alt={banner.title || `Banner ${index + 1}`}
                className='h-full w-full object-cover object-center'
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Dark subtle gradient overlay at bottom for readability */}
              <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none' />

              {/* Caption if title or description present */}
              {(banner.title || banner.description) && (
                <div className='absolute bottom-16 left-8 right-8 z-10 text-white space-y-1.5'>
                  {banner.title && (
                    <h3 className='text-2xl font-bold tracking-tight drop-shadow-md'>
                      {banner.title}
                    </h3>
                  )}
                  {banner.description && (
                    <p className='text-sm text-neutral-200 line-clamp-2 max-w-xl drop-shadow'>
                      {banner.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manual Navigation Arrows (visible on hover) */}
      {banners.length > 1 && (
        <>
          <button
            type='button'
            onClick={scrollPrev}
            className='absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-90 hover:bg-black/70 transition-all cursor-pointer'
            aria-label='Banner sebelumnya'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>
          <button
            type='button'
            onClick={scrollNext}
            className='absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-90 hover:bg-black/70 transition-all cursor-pointer'
            aria-label='Banner selanjutnya'
          >
            <ChevronRight className='h-5 w-5' />
          </button>

          {/* Pagination Indicators (Dots) */}
          <div className='absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2'>
            {banners.map((_, idx) => (
              <button
                key={idx}
                type='button'
                onClick={() => scrollTo(idx)}
                className={cn(
                  'h-2 rounded-full transition-all cursor-pointer',
                  selectedIndex === idx
                    ? 'w-7 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                )}
                aria-label={`Pindah ke banner ke-${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
