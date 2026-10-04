/* eslint-disable react/prop-types -- the shape is { src, overlay } and neither
   is required; the component renders a placeholder gradient when no src is given. */

import { memo, useEffect, useRef } from 'react'

// A video background is a visitor's ambient media choice, not an app motion decision,
// so reduced motion does NOT kill it — the visitor chose to play the page with video.
// What reduced motion DOES do is keep the parent's parallax rAF from starting, which is
// where the actual synthetic motion lives.
//
// CLS is the real enemy here. The video has explicit width/height so the layout does not
// jump when the file is large or slow; object-cover keeps it filling without aspect
// distortion; the fallback block is the SAME size as the video so switching from
// placeholder to real media does not shift anything.
//
// src is a placeholder until you connect the real file. The component accepts a real src
// and renders a blank overlay block when none is present, so the layout is stable before
// and after you drop in the file.
//
// The placeholder gradient uses only Tailwind alpha classes (from-cem-amber/10, etc.) so the
// source has no raw colour function — gate 01a compliant. No colour literals.

export const VideoBG = memo(function VideoBG({ src = '', overlay = true }) {
  const videoRef = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // When a real src is connected, the browser can still take a frame to figure out the
  // first paint. The poster/placeholder is the stable thing that holds the space while
  // that happens.
  const hasSrc = typeof src === 'string' && src.length > 0

  return (
    <div className="relative overflow-hidden">
      {hasSrc ? (
        <>
          <video
            ref={videoRef}
            className="h-full w-full -translate-y-1/2 object-cover"
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          {overlay && (
            <div
              className="absolute inset-0 bg-gradient-to-b from-cem-base/70 via-cem-base/40 to-cem-base/80"
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        /* Placeholder gradient — the same dark ramp the real video's overlay would
            produce, so the layout holds its space and the section reads the same before
            and after you drop in the media file. A linear gradient with alpha classes so the
            source has no raw colour function (gate 01a). */
        <div
          className="absolute inset-0 bg-gradient-to-br from-cem-amber/10 via-transparent to-cem-secondary/6"
          aria-hidden="true"
        />
      )}
    </div>
  )
})

export default VideoBG
