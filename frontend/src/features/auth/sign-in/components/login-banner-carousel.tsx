import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { bannerService } from '@/services/banner-service'
import { cn } from '@/lib/utils'
import type { Banner } from '@/types/banner'
import dashboardDark from '../assets/dashboard-dark.png'
import dashboardLight from '../assets/dashboard-light.png'

/**
 * Fallback dashboard mockup illustration with skeleton placeholder and smooth fade-in.
 */
function DashboardMockupFallback() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-muted max-lg:hidden select-none',
        '[&>img]:absolute [&>img]:top-[15%] [&>img]:left-20 [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-top-left [&>img]:select-none'
      )}
    >
      {/* SKELETON PLACEHOLDER: Shimmer mockup while large dashboard image downloads */}
      {!isLoaded && (
        <div className='absolute inset-0 p-12 flex flex-col justify-center animate-pulse bg-muted/60'>
          <div className='w-full max-w-xl mx-auto space-y-6'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-xl bg-muted-foreground/15' />
              <div className='space-y-2 flex-1'>
                <div className='h-4 w-1/3 rounded bg-muted-foreground/15' />
                <div className='h-3 w-1/4 rounded bg-muted-foreground/10' />
              </div>
            </div>
            <div className='grid grid-cols-3 gap-3.5'>
              <div className='h-24 rounded-xl bg-muted-foreground/15' />
              <div className='h-24 rounded-xl bg-muted-foreground/15' />
              <div className='h-24 rounded-xl bg-muted-foreground/15' />
            </div>
            <div className='h-64 rounded-2xl bg-muted-foreground/15' />
          </div>
        </div>
      )}

      <img
        src={dashboardLight}
        className={cn(
          'dark:hidden transition-opacity duration-700 ease-out',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        width={1024}
        height={1151}
        alt='Portal PEMDA'
        onLoad={() => setIsLoaded(true)}
      />
      <img
        src={dashboardDark}
        className={cn(
          'hidden dark:block transition-opacity duration-700 ease-out',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        width={1024}
        height={1138}
        alt='Portal PEMDA'
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}

/**
 * Individual carousel banner slide item with dedicated image skeleton loading.
 */
function BannerSlideItem({ banner, index }: { banner: Banner; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className='relative min-w-full h-full flex-[0_0_100%] overflow-hidden bg-muted'>
      {/* Skeleton Shimmer while banner image is downloading */}
      {!isLoaded && (
        <div className='absolute inset-0 flex flex-col items-center justify-center animate-pulse bg-muted-foreground/10'>
          <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-muted-foreground/15 mb-2.5'>
            <ImageIcon className='h-6 w-6 text-muted-foreground/40' />
          </div>
          <span className='text-xs font-medium text-muted-foreground/60'>
            Memuat visual...
          </span>
        </div>
      )}

      <img
        src={banner.image_url}
        alt={banner.title || `Banner ${index + 1}`}
        className={cn(
          'h-full w-full object-cover object-center transition-opacity duration-500 ease-out',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        loading={index === 0 ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
      />

      {/* Dark subtle gradient overlay at bottom for readability */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none' />

      {/* Caption if title or description present */}
      {(banner.title || banner.description) && (
        <div
          className={cn(
            'absolute bottom-16 left-8 right-8 z-10 text-white space-y-1.5 transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
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
  )
}

export function LoginBannerCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Fetch active login banners from public API
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['public-banners', 'login'],
    queryFn: () => bannerService.getPublicBanners('login'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
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
    queueMicrotask(onSelect)
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

  // FALLBACK: When loading from server or when no custom banners uploaded
  if (isLoading || banners.length === 0) {
    return <DashboardMockupFallback />
  }

  // DYNAMIC CAROUSEL: When active banners exist
  return (
    <div className='relative h-full w-full overflow-hidden bg-muted select-none group max-lg:hidden'>
      {/* Embla Viewport */}
      <div className='h-full w-full overflow-hidden' ref={emblaRef}>
        <div className='flex h-full'>
          {banners.map((banner, index) => (
            <BannerSlideItem key={banner.id} banner={banner} index={index} />
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
