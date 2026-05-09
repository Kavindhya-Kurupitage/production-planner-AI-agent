import { useEffect, useState } from "react";

type BreakpointState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

const QUERY_MOBILE = "(max-width: 767px)";
const QUERY_TABLET = "(min-width: 768px) and (max-width: 1023px)";
const QUERY_DESKTOP = "(min-width: 1024px)";

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>({
    isMobile: typeof window !== "undefined" ? window.matchMedia(QUERY_MOBILE).matches : false,
    isTablet: typeof window !== "undefined" ? window.matchMedia(QUERY_TABLET).matches : false,
    isDesktop: typeof window !== "undefined" ? window.matchMedia(QUERY_DESKTOP).matches : false
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia(QUERY_MOBILE);
    const mqTablet = window.matchMedia(QUERY_TABLET);
    const mqDesktop = window.matchMedia(QUERY_DESKTOP);

    const update = () =>
      setState({
        isMobile: mqMobile.matches,
        isTablet: mqTablet.matches,
        isDesktop: mqDesktop.matches
      });

    update();

    mqMobile.addEventListener("change", update);
    mqTablet.addEventListener("change", update);
    mqDesktop.addEventListener("change", update);

    return () => {
      mqMobile.removeEventListener("change", update);
      mqTablet.removeEventListener("change", update);
      mqDesktop.removeEventListener("change", update);
    };
  }, []);

  return state;
}
