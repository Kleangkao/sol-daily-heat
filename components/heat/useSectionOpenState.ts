"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type DashboardSectionDomId,
  defaultSectionOpenState,
  loadSectionOpenState,
  parseSectionHash,
  saveSectionOpenState,
} from "@/lib/heat/section-collapse";

export function useSectionOpenState() {
  const [open, setOpen] = useState(defaultSectionOpenState);

  useEffect(() => {
    const loaded = loadSectionOpenState();
    const hashId = parseSectionHash(window.location.hash);
    if (hashId) {
      loaded[hashId] = true;
      saveSectionOpenState(loaded);
    }
    setOpen(loaded);
    if (hashId) {
      requestAnimationFrame(() => {
        document.getElementById(hashId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hashId = parseSectionHash(window.location.hash);
      if (!hashId) return;
      setOpen((prev) => {
        const next = prev[hashId] ? prev : { ...prev, [hashId]: true };
        if (next !== prev) saveSectionOpenState(next);
        return next;
      });
      requestAnimationFrame(() => {
        document.getElementById(hashId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setSectionOpen = useCallback((id: DashboardSectionDomId, value: boolean) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: value };
      saveSectionOpenState(next);
      return next;
    });
  }, []);

  const toggleSection = useCallback((id: DashboardSectionDomId) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveSectionOpenState(next);
      return next;
    });
  }, []);

  const openSection = useCallback((id: DashboardSectionDomId) => {
    setSectionOpen(id, true);
  }, [setSectionOpen]);

  const navigateToSection = useCallback((id: DashboardSectionDomId) => {
    setSectionOpen(id, true);
    window.history.replaceState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [setSectionOpen]);

  const navigateToSections = useCallback(
    (ids: DashboardSectionDomId[], scrollToId?: DashboardSectionDomId) => {
      setOpen((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = true;
        saveSectionOpenState(next);
        return next;
      });
      const scrollId = scrollToId ?? ids[0];
      window.history.replaceState(null, "", `#${scrollId}`);
      requestAnimationFrame(() => {
        document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    []
  );

  return { open, toggleSection, openSection, navigateToSection, navigateToSections };
}
