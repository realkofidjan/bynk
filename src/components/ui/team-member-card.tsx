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
      className={cn('relative my-4 md:my-8 flex flex-col justify-center w-full', className)}
    >
      <div className={cn(
        'flex flex-col md:flex-row items-center md:items-center justify-center md:justify-end w-full gap-6 md:gap-0',
        isPositionRight && 'md:flex-row-reverse'
      )}>
        {/* Portrait image with reveal animation - Enlarged */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative h-[360px] w-full max-w-[320px] sm:h-[480px] sm:max-w-[400px] md:h-[680px] md:w-[500px] md:max-w-none lg:h-[740px] lg:w-[540px] shrink-0 overflow-hidden bg-foreground/[0.04] rounded-lg md:rounded-none',
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
              'h-full w-full object-cover duration-500 ease-[0.22,1,0.36,1] hover:scale-105 transition-opacity',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </motion.div>

        {/* Info block — overlaps image via negative margin, enlarged */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative left-0 md:-left-12 z-2 flex w-full md:w-[calc(100%-460px)] flex-col gap-6 md:gap-16',
            isPositionRight && 'md:left-12 items-start md:items-end'
          )}
        >
          {/* Display name — enlarged editorial type with serif italics mixture */}
          <div>
            <p className='font-serif text-4xl sm:text-6xl md:text-8xl lg:text-[7rem] leading-[1.02] tracking-tight text-foreground'>
              <span className='italic font-light'>{firstName}</span>
              <br />
              <span className='font-normal'>{lastName}</span>
            </p>
          </div>

          {/* Details row — toggle + bio */}
          <div className={cn('flex items-center gap-5 sm:gap-8 md:gap-12', isPositionRight && 'md:justify-end')}>
            {/* Circular CTA with hover pulse */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'group flex h-14 w-14 sm:h-16 sm:w-16 md:h-24 md:w-24 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/30 transition-all duration-300 hover:border-foreground hover:bg-foreground dark:hover:bg-white dark:hover:border-white',
                isPositionRight && 'order-1'
              )}
            >
              <ArrowRight
                size={22}
                className={cn(
                  'text-foreground transition-all duration-300 group-hover:-rotate-45 group-hover:text-background dark:group-hover:text-black md:w-6 md:h-6',
                  isPositionRight && 'rotate-180 group-hover:rotate-225'
                )}
              />
            </motion.div>

            {/* Bio copy — enlarged body text */}
            <div className='w-full sm:w-[80%] md:w-[50%]'>
              <p
                className={cn(
                  'text-xs sm:text-sm md:text-base lg:text-lg leading-[1.7] md:leading-[1.8] text-foreground/60 font-light',
                  isPositionRight && 'text-left md:text-right'
                )}
              >
                {description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
