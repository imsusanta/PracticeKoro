import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ExamSecurityConfig {
  onTabSwitch?: (violations: number) => void;
  onFullscreenExit?: (violations: number) => void;
  maxTabViolations?: number;
  maxFullscreenViolations?: number;
  onMaxViolations?: () => void;
}

export const useExamSecurity = (config: ExamSecurityConfig) => {
  const { toast } = useToast();
  const [tabViolations, setTabViolations] = useState(0);
  const [fullscreenViolations, setFullscreenViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tabViolationsRef = useRef(0);
  const fullscreenViolationsRef = useRef(0);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: "Action Blocked",
        description: "Right-click is disabled during the exam.",
        variant: "destructive",
      });
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: "Action Blocked",
        description: "Copy/Cut/Paste is disabled during the exam.",
        variant: "destructive",
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        toast({
          title: "Action Blocked",
          description: "Developer tools are disabled during the exam.",
          variant: "destructive",
        });
      }

      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabViolationsRef.current += 1;
        const newViolations = tabViolationsRef.current;
        setTabViolations(newViolations);
        const cfg = configRef.current;
        const maxTab = cfg.maxTabViolations || 3;
        cfg.onTabSwitch?.(newViolations);

        if (newViolations >= maxTab) {
          cfg.onMaxViolations?.();
          toast({
            title: "Test Auto-Submitted",
            description: "Maximum tab switching violations reached. Your test has been submitted.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Warning: Tab Switch Detected",
            description: `Violation ${newViolations}/${maxTab}. ${maxTab - newViolations} remaining before auto-submit.`,
            variant: "destructive",
          });
        }
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      const cfg = configRef.current;
      const maxFullscreen = cfg.maxFullscreenViolations || 3;

      if (!isCurrentlyFullscreen && fullscreenViolationsRef.current < maxFullscreen) {
        fullscreenViolationsRef.current += 1;
        const newViolations = fullscreenViolationsRef.current;
        setFullscreenViolations(newViolations);
        cfg.onFullscreenExit?.(newViolations);

        if (newViolations >= maxFullscreen) {
          cfg.onMaxViolations?.();
          toast({
            title: "Test Auto-Submitted",
            description: "Maximum fullscreen exit violations reached. Your test has been submitted.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Warning: Fullscreen Exited",
            description: `Violation ${newViolations}/${maxFullscreen}. Please return to fullscreen mode.`,
            variant: "destructive",
          });

          setTimeout(() => {
            document.documentElement.requestFullscreen().catch(() => undefined);
          }, 2000);
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [toast]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      toast({
        title: "Fullscreen Required",
        description: "Please enable fullscreen mode to start the exam.",
        variant: "destructive",
      });
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  };

  return {
    tabViolations,
    fullscreenViolations,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
};
