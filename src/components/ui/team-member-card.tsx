'use client'

/**
 * @author: @emerald-ui
 * @description: Editorial-style team member card with overlapping layers and motion
 * @version: 2.0.0
 * @date: 2026-02-19
 * @license: MIT
 * @website: https://emerald-ui.com
 *
 */
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) { return twMerge(clsx(inputs)) }

interface TeamMemberCardProps {
  position?: 'left' | 'right'
  jobPosition?: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  description?: string
  className?: string
}

/**
 * Editorial-style team member card with overlapping portrait, large display
 * typography, circular CTA toggle, and staggered entrance animations.
 */
export default function TeamMemberCard({
  position = 'left',
  firstName = 'Jennie',
  lastName = 'Garcia',
  imageUrl = 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?fm=jpg&q=60',
  description = 'Jennie is a skilled developer with expertise in modern web technologies and a passion for creating seamless user experiences.',
  className,
}: TeamMemberCardProps) {
  const fullName = `${firstName} ${lastName}`
  const isPositionRight = position === 'right'

  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative my-0 flex flex-col justify-center w-full', className)}
    >
      <div className={cn(
        'flex flex-col lg:flex-row items-center lg:items-center justify-center lg:justify-end w-full gap-3 lg:gap-0',
        isPositionRight && 'lg:flex-row-reverse'
      )}>
        {/* Portrait image with reveal animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative h-[40vh] max-h-[46vh] w-[calc(40vh*0.75)] min-w-[220px] lg:h-[70vh] xl:h-[74vh] lg:max-h-[680px] xl:max-h-[740px] lg:w-[460px] xl:w-[520px] lg:min-w-0 shrink-0 overflow-hidden bg-foreground/[0.04] rounded-none',
            isPositionRight && 'order-1'
          )}
        >
          {!imgLoaded && <div className='absolute inset-0 shimmer z-0' />}
          {/* Subtle grain overlay for texture */}
          <div className='pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/20 via-transparent to-transparent' />
          <img
            src={imageUrl}
            alt={fullName}
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'h-full w-full object-cover duration-500 ease-[0.22,1,0.36,1] transition-opacity',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </motion.div>

        {/* Info block — overlaps image via negative margin */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative left-0 lg:-left-12 z-2 flex w-[calc(40vh*0.75)] min-w-[220px] lg:min-w-0 lg:max-w-none lg:w-[calc(100%-440px)] flex-col gap-4 lg:gap-12',
            isPositionRight && 'lg:left-12 items-start lg:items-end'
          )}
        >
          {/* Display name — editorial type with serif italics mixture */}
          <div>
            <p className='font-serif text-4xl sm:text-6xl md:text-7xl lg:text-[6.5rem] xl:text-[7.5rem] leading-[1.0] tracking-tight text-foreground whitespace-nowrap'>
              <span className='italic font-light'>{firstName}</span>
              <br />
              <span className='font-normal'>{lastName}</span>
            </p>
          </div>

          {/* Details row — toggle + bio */}
          <div className={cn('flex items-center justify-between w-full gap-4 sm:gap-6 lg:gap-8 lg:pl-20', isPositionRight && 'lg:justify-end')}>
            {/* Bio copy */}
            <div className='flex-1 sm:w-[80%] md:w-[50%]'>
              <p
                className={cn(
                  'text-xs sm:text-sm md:text-base lg:text-base leading-[1.6] text-foreground/70 font-light whitespace-pre-line',
                  isPositionRight && 'text-left lg:text-right'
                )}
              >
                {description}
              </p>
            </div>

            {/* Circular CTA with hover pulse */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'group flex h-12 w-12 sm:h-14 sm:w-14 lg:h-20 lg:w-20 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/30 transition-all duration-300 hover:border-foreground hover:bg-foreground dark:hover:bg-white dark:hover:border-white',
                isPositionRight && 'order-1'
              )}
            >
              <ArrowRight
                size={20}
                className={cn(
                  'text-foreground transition-all duration-300 group-hover:-rotate-45 group-hover:text-background dark:group-hover:text-black lg:w-5 lg:h-5',
                  isPositionRight && 'rotate-180 group-hover:rotate-225'
                )}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
