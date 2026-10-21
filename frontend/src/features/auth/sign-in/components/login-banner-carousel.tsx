import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ShieldCheck,
} from 'lucide-react'
import { bannerService } from '@/services/banner-service'
import { cn } from '@/lib/utils'
import type { Banner } from '@/types/banner'

const BANNERS_STORAGE_KEY = 'manris_public_login_banners'

/**
 * Synchronously retrieves cached banners from localStorage to eliminate any flicker.
 */
function getCachedBanners(): Banner[] {
  try {
    const raw = localStorage.getItem(BANNERS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Banner[]
      }
    }
  } catch {
    // Ignore cache parse errors
  }
  return []
}

/**
 * Prestigious Government Fallback Hero Panel when no banners are uploaded.
 * Completely replaces legacy template screenshot with official government branding.
 */
function GovernmentHeroFallback() {
  return (
    <div className='relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white max-lg:hidden select-none flex flex-col justify-between p-12 shadow-2xl'>
      {/* Subtle decorative background circles */}
      <div className='absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none' />
      <div className='absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none' />

      {/* Top Header Badge */}
      <div className='relative z-10 flex items-center gap-2.5'>
        <div className='flex size-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-sm'>
          <ShieldCheck className='size-5 text-emerald-400' />
        </div>
        <div>
          <span className='text-xs font-semibold uppercase tracking-wider text-white/80'>
            Sistem Informasi Manajemen Risiko
          </span>
          <p className='text-[11px] text-white/50'>Pemerintah Daerah Terintegrasi</p>
        </div>
      </div>

      {/* Center Content / Hero Statement */}
      <div className='relative z-10 max-w-lg space-y-4 my-auto'>
        <div className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md border border-white/15'>
          <CheckCircle2 className='size-3.5' />
          <span>Kepatuhan SPBE & SPIP Terintegrasi</span>
        </div>

        <h2 className='text-3xl font-extrabold tracking-tight leading-snug drop-shadow-sm text-white'>
          Tata Kelola Pemerintahan yang Akuntabel, Transparan & Berorientasi Risiko.
        </h2>

        <p className='text-sm text-slate-300 leading-relaxed font-normal'>
          Platform kolaboratif OPD dan APIP Inspektorat untuk perumusan konteks strategis, penilaian risiko operasional, hingga rencana tindak pengendalian secara terstruktur dan terukur.
        </p>

        <div className='flex items-center gap-6 pt-3 text-xs text-white/70'>
          <div className='flex items-center gap-1.5'>
            <Building2 className='size-4 text-emerald-400' />
            <span>Seluruh Perangkat Daerah</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <ShieldCheck className='size-4 text-blue-400' />
            <span>Pengawasan Intern APIP</span>
          </div>
        </div>
      </div>

      {/* Bottom Security Note */}
      <div className='relative z-10 text-[11px] text-white/40'>
        © {new Date().getFullYear()} Pemerintah Daerah. Hak Cipta Dilindungi Undang-Undang.
      </div>
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
      <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none' />

      {/* Caption if title or description present */}
      {(banner.title || banner.description) && (
        <div
          className={cn(
            'absolute bottom-16 left-8 right-8 z-10 text-white space-y-2 transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          {banner.title && (
            <h3 className='text-2xl font-bold tracking-tight drop-shadow-md text-white'>
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
  const initialBanners = getCachedBanners()

  // Fetch active login banners from public API with synchronous initialData from cache
  const { data: banners = initialBanners } = useQuery({
    queryKey: ['public-banners', 'login'],
    queryFn: async () => {
      const liveData = await bannerService.getPublicBanners('login')
      try {
        if (liveData && liveData.length > 0) {
          localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(liveData))
        }
      } catch {
        // Ignore quota errors
      }
      return liveData
    },
    initialData: initialBanners,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
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

  // When no custom banners exist, render official government hero panel
  if (banners.length === 0) {
    return <GovernmentHeroFallback />
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
