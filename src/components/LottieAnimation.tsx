import React, { useEffect, useState } from "react";
import { useLottie } from "lottie-react";

interface LottieAnimationProps {
  src?: string;
  animationData?: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const animationCache = new Map<string, any>();

const LottieViewer: React.FC<{
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ animationData, loop = true, autoplay = true, className, style }) => {
  const options = {
    animationData,
    loop,
    autoplay,
  };
  const { View } = useLottie(options, { className, style });
  return View;
};

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  animationData: directData,
  loop = true,
  autoplay = true,
  className = "w-full h-full",
  style,
}) => {
  const [data, setData] = useState<any>(directData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!directData && !!src);

  useEffect(() => {
    if (directData) {
      setData(directData);
      setIsLoading(false);
      return;
    }

    if (!src) return;

    if (animationCache.has(src)) {
      setData(animationCache.get(src));
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${src}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          animationCache.set(src, json);
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("LottieAnimation load failed:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [src, directData]);

  if (!data || isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50/50 rounded-2xl animate-pulse ${className}`}
        style={style}
      />
    );
  }

  return (
    <LottieViewer
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  );
};

export default LottieAnimation;
