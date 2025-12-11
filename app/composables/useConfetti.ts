/**
 * Confetti Composable
 * 
 * Triggers celebratory confetti explosions for special moments.
 * Uses canvas-confetti library for beautiful effects.
 * 
 * Usage:
 *   const confetti = useConfetti()
 *   confetti.celebrate()        // Standard celebration
 *   confetti.hire()             // Special hire celebration (gold + green)
 *   confetti.levelUp()          // Level up celebration (stars)
 */

import confetti from 'canvas-confetti'

export const useConfetti = () => {
  /**
   * Standard celebration burst
   */
  const celebrate = () => {
    const duration = 2000
    const end = Date.now() + duration

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }

  /**
   * Special "Hired!" celebration with company colors
   */
  const hire = () => {
    // First burst - center explosion
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4CAF50', '#81C784', '#FFD700', '#FFC107', '#FFFFFF']
    })

    // Second burst with delay - sides
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4CAF50', '#81C784', '#A5D6A7']
      })
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFC107', '#FFEB3B']
      })
    }, 200)

    // Third burst - big finale
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#4CAF50', '#FFD700', '#FFFFFF', '#81C784', '#FFC107']
      })
    }, 400)
  }

  /**
   * Level up celebration with star shapes
   */
  const levelUp = () => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#FFD700', '#FFC107', '#FFEB3B', '#FF9800']
    }

    const shoot = () => {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['star']
      })

      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ['circle']
      })
    }

    setTimeout(shoot, 0)
    setTimeout(shoot, 100)
    setTimeout(shoot, 200)
  }

  /**
   * Quick burst for minor achievements
   */
  const burst = (color = '#4CAF50') => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: [color, lightenColor(color)]
    })
  }

  /**
   * Helper to lighten a hex color
   */
  const lightenColor = (hex: string): string => {
    const num = parseInt(hex.slice(1), 16)
    const r = Math.min(255, (num >> 16) + 50)
    const g = Math.min(255, ((num >> 8) & 0x00FF) + 50)
    const b = Math.min(255, (num & 0x0000FF) + 50)
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
  }

  return {
    celebrate,
    hire,
    levelUp,
    burst
  }
}
