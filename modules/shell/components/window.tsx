"use client";



import { useI18n } from "@/i18n/use-i18n";
import {useNasDesktop} from '@/modules/shell/desktop-mode';
import { Maximize2, Minimize2, Minus, X } from "@/components/icons/platform-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallback, useEffect, useRef, useState } from "react";

type WindowProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onMinimize?: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  zIndex?: number;
  dockPosition?: "bottom" | "left" | "right";
  onFocus?: () => void;
  isClosing?: boolean;
  isMinimized?: boolean;
  animationsEnabled?: boolean;
};

const BOTTOM_DOCK_CLEARANCE = 88;
const SIDE_DOCK_CLEARANCE = 80;

export function Window({
  title,
  icon,
  children,
  onClose,
  onMinimize,
  defaultWidth = 900,
  defaultHeight = 580,
  zIndex = 100,
  dockPosition = "bottom",
  onFocus,
  isClosing = false,
  isMinimized = false,
  animationsEnabled = true,
}: WindowProps) {
  const intl = useI18n();
  const topClearance = useNasDesktop() ? 44 : 0;
  const [isMaximized, setIsMaximized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const preMaxState = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const resizeStart = useRef({x:0,y:0,w:0,h:0,mouseX:0,mouseY:0,direction:'se'});

  // Center on mount
  useEffect(() => {
    if (position.x === -1) {
      const w = Math.min(size.w, window.innerWidth - 24);
      const h = Math.min(size.h, window.innerHeight - BOTTOM_DOCK_CLEARANCE - 60);
      setSize({w, h});
      setPosition({x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(48, (window.innerHeight - BOTTOM_DOCK_CLEARANCE - h) / 2)});
    }
  }, [position.x, size.w, size.h]);

  useEffect(() => {
    if (!animationsEnabled) {
      setIsVisible(true);
      return;
    }
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [animationsEnabled]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      if ((e.target as HTMLElement).closest('button')) return;
      onFocus?.();
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isMaximized, position, onFocus],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, direction = 'se') => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      onFocus?.();
      setIsResizing(true);
      dragOffset.current = {
        x: e.clientX,
        y: e.clientY,
      };
      resizeStart.current = {...position,...size,mouseX:e.clientX,mouseY:e.clientY,direction};
    },
    [isMaximized, onFocus, position, size],
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: Math.max(0, e.clientY - dragOffset.current.y),
        });
      }
      if (isResizing) {
        const r=resizeStart.current;
        const dx=e.clientX-r.mouseX, dy=e.clientY-r.mouseY;
        const west=r.direction.includes('w'), north=r.direction.includes('n');
        const width=r.direction.match(/[ew]/)?Math.max(500,r.w+(west?-dx:dx)):r.w;
        const height=r.direction.match(/[ns]/)?Math.max(350,r.h+(north?-dy:dy)):r.h;
        setSize({w:width,h:height});
        setPosition({x:west?r.x+r.w-width:r.x,y:north?r.y+r.h-height:r.y});
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  function toggleMaximize() {
    if (isMaximized) {
      setPosition({ x: preMaxState.current.x, y: preMaxState.current.y });
      setSize({ w: preMaxState.current.w, h: preMaxState.current.h });
      setIsMaximized(false);
    } else {
      preMaxState.current = {
        x: position.x,
        y: position.y,
        w: size.w,
        h: size.h,
      };
      setIsMaximized(true);
    }
  }

  const maximizedStyle =
    dockPosition === "left"
      ? {
          top: topClearance,
          right: 0,
          bottom: 0,
          left: SIDE_DOCK_CLEARANCE,
          zIndex,
          width: "auto",
          height: "auto",
        }
      : dockPosition === "right"
        ? {
            top: topClearance,
            right: SIDE_DOCK_CLEARANCE,
            bottom: 0,
            left: 0,
            zIndex,
            width: "auto",
            height: "auto",
          }
        : {
            top: topClearance,
            right: 0,
            bottom: BOTTOM_DOCK_CLEARANCE,
            left: 0,
            zIndex,
            width: "auto",
            height: "auto",
          };

  if (isMinimized) return null;

  return (
    <div
      ref={windowRef}
      data-desktop-window
      className={`absolute flex flex-col overflow-hidden border border-glass-border ${
        isMaximized
          ? "rounded-[calc(var(--radius)+0.5rem)] shadow-[0_18px_42px_rgba(0,0,0,0.28)]"
          : "rounded-[calc(var(--radius)+0.375rem)] shadow-2xl shadow-black/50"
      } ${
        animationsEnabled
          ? "transition-[opacity,transform] duration-200 ease-out"
          : ""
      } ${
        !animationsEnabled || (isVisible && !isClosing)
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2"
      }`}
      style={
        isMaximized
          ? maximizedStyle
          : {
              left: position.x,
              top: position.y,
              width: size.w,
              height: size.h,
              zIndex,
            }
      }
      onMouseDown={() => onFocus?.()}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between h-11 px-4 bg-popover/80 backdrop-blur-2xl border-b border-glass-border select-none shrink-0"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? "grabbing" : isMaximized ? "default" : "grab",
        }}
      >
        <div className="desktop-window-label flex items-center gap-3">
          <span className="desktop-window-brand">HOMEIO</span>
          {icon}
          <span className="text-sm font-medium text-foreground">{intl.text(title)}</span>
        </div>
        <div className="desktop-window-controls flex items-center gap-1">
          <Tooltip><TooltipTrigger asChild><button type="button" onClick={onMinimize} aria-label={intl.t('ui.minimizeWindow')}><Minus className="size-4"/></button></TooltipTrigger><TooltipContent>{intl.t('ui.minimizeWindow')}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" onClick={toggleMaximize} aria-label={intl.text(isMaximized ? 'Restore window' : 'Maximize window')}>{isMaximized ? <Minimize2 className="size-4"/> : <Maximize2 className="size-4"/>}</button></TooltipTrigger><TooltipContent>{intl.text(isMaximized ? 'Restore window' : 'Maximize window')}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClose} aria-label={intl.t('ui.closeWindow')}><X className="size-4"/></button></TooltipTrigger><TooltipContent>{intl.t('ui.closeWindow')}</TooltipContent></Tooltip>
        </div>
      </div>

      {/* Window content */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-card/90 backdrop-blur-2xl">
        {children}
      </div>

      {/* Resize handle */}
      {!isMaximized && (
        <>
          {(['n','s','e','w','ne','nw','sw'] as const).map(direction=><div key={direction} aria-hidden="true" data-resize-edge={direction}
            className={`absolute z-30 ${direction==='n'?'inset-x-4 top-0 h-1.5 cursor-ns-resize':direction==='s'?'inset-x-4 bottom-0 h-1.5 cursor-ns-resize':direction==='e'?'inset-y-4 right-0 w-1.5 cursor-ew-resize':direction==='w'?'inset-y-4 left-0 w-1.5 cursor-ew-resize':direction==='ne'?'right-0 top-0 size-4 cursor-nesw-resize':direction==='nw'?'left-0 top-0 size-4 cursor-nwse-resize':'left-0 bottom-0 size-4 cursor-nesw-resize'}`}
            onMouseDown={event=>handleResizeMouseDown(event,direction)}/>)}
          <button aria-label={intl.t('ui.resizeWindow')} title={intl.t('ui.resizeWindow')}
            className="absolute bottom-0 right-0 z-30 flex size-6 cursor-nwse-resize items-end justify-end bg-card p-1 text-muted-foreground"
            onMouseDown={event=>handleResizeMouseDown(event,'se')}
            onKeyDown={event=>{const step=event.shiftKey?50:10;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setSize(previous=>({w:Math.max(500,previous.w+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)),h:Math.max(350,previous.h+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0))}));}}}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 12 12 3M7 12l5-5M11 12l1-1" stroke="currentColor"/></svg>
          </button>
        </>
      )}
    </div>
  );
}
