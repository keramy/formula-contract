"use client";

import { ReactNode, useEffect } from "react";
import { usePageHeader } from "./app-header";

interface PageHeaderSetterProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
}

/**
 * Client component that sets the page header content.
 * Place this at the top of your page to set the header title, icon, and description.
 *
 * Example:
 * <PageHeaderSetter
 *   icon={<GradientIcon icon={<FolderIcon />} color="primary" />}
 *   title="Projects"
 *   description="Manage your projects"
 * />
 */
export function PageHeaderSetter({ icon, title, description }: PageHeaderSetterProps) {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({ icon, title, description });
    return () => setContent({});
  }, [icon, title, description, setContent]);

  return null;
}
