"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

type SnapPoint = "collapsed" | "half" | "full";

const SNAP_HEIGHTS = {
  collapsed: 80,
  half: 45,
  full: 90,
} as const;

export default function BottomSheet({ children }: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>("half");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const getHeight = useCallback(() => {
    if (typeof window === "undefined") return 300;
    if (snap === "collapsed") return SNAP_HEIGHTS.collapsed;
    return (window.innerHeight * SNAP_HEIGHTS[snap]) / 100;
  }, [snap]);

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      startY.current = clientY;
      startHeight.current = getHeight();
    },
    [getHeight]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      const diff = startY.current - clientY;
      setDragOffset(diff);
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const newHeight = startHeight.current + dragOffset;
    const vh = window.innerHeight;
    if (newHeight < vh * 0.2) setSnap("collapsed");
    else if (newHeight < vh * 0.65) setSnap("half");
    else setSnap("full");
    setDragOffset(0);
  }, [isDragging, dragOffset]);

  const onTouchStart = useCallback((e: React.TouchEvent) => handleDragStart(e.touches[0].clientY), [handleDragStart]);
  const onTouchMove = useCallback((e: React.TouchEvent) => handleDragMove(e.touches[0].clientY), [handleDragMove]);
  const onTouchEnd = useCallback(() => handleDragEnd(), [handleDragEnd]);
  const onMouseDown = useCallback((e: React.MouseEvent) => handleDragStart(e.clientY), [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const currentHeight = isDragging
    ? Math.max(SNAP_HEIGHTS.collapsed, Math.min(window.innerHeight * 0.95, startHeight.current + dragOffset))
    : getHeight();

  return (
    <div
      ref={sheetRef}
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-tn-bg rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.6)] z-50 flex flex-col"
      style={{
        height: `${currentHeight}px`,
        transition: isDragging ? "none" : "height 0.3s ease-out",
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
