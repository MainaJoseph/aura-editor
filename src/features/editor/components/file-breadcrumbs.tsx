import React from "react";
import { AppFileIcon } from "@/features/projects/components/file-explorer/app-file-icon";
import { IconStyleProvider } from "@/features/projects/components/file-explorer/icon-context";
import { useMaterialIcons } from "@/features/projects/hooks/use-material-icons";

import { useFilePath } from "@/features/projects/hooks/use-files";
import { useEditorPane } from "@/features/editor/hooks/use-editor-pane";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Id } from "../../../../convex/_generated/dataModel";

export const FileBreadcrumbs = ({
  projectId,
  paneIndex,
}: {
  projectId: Id<"projects">;
  paneIndex: number;
}) => {
  const { activeTabId } = useEditorPane(projectId, paneIndex);
  const filePath = useFilePath(activeTabId);
  const materialIcons = useMaterialIcons(projectId);

  if (filePath === undefined || !activeTabId) {
    return (
      <div className="p-2 bg-background pl-4 border-b">
        <Breadcrumb>
          <BreadcrumbList className="sm:gap-0.5 gap-0.5">
            <BreadcrumbItem className="text-sm">
              <BreadcrumbPage>&nbsp;</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  return (
    <IconStyleProvider value={materialIcons}>
      <div className="p-2 bg-background pl-4 border-b">
        <Breadcrumb>
          <BreadcrumbList className="sm:gap-0.5 gap-0.5">
            {filePath.map((item, index) => {
              const isLast = index === filePath.length - 1;

              return (
                <React.Fragment key={item._id}>
                  <BreadcrumbItem className="text-sm">
                    {isLast ? (
                      <BreadcrumbPage className="flex items-center gap-1">
                        <AppFileIcon
                          fileName={item.name}
                          className="size-4"
                        />
                        {item.name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href="#">{item.name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </IconStyleProvider>
  );
};
