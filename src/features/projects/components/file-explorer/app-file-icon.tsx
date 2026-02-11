import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { MaterialFileIcon, MaterialFolderIcon } from "./material-file-icon";
import { useIconStyle } from "./icon-context";

export const AppFileIcon = ({
  fileName,
  className,
}: {
  fileName: string;
  autoAssign?: boolean;
  className?: string;
}) => {
  const useMaterial = useIconStyle();

  if (useMaterial) {
    return <MaterialFileIcon fileName={fileName} className={className} />;
  }

  return <FileIcon fileName={fileName} autoAssign className={className} />;
};

export const AppFolderIcon = ({
  folderName,
  isOpen,
  className,
}: {
  folderName?: string;
  isOpen?: boolean;
  className?: string;
}) => {
  const useMaterial = useIconStyle();

  if (useMaterial) {
    return (
      <MaterialFolderIcon
        folderName={folderName}
        isOpen={isOpen}
        className={className}
      />
    );
  }

  return <FolderIcon folderName={folderName ?? ""} className={className} />;
};
