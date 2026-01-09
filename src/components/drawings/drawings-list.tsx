"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { format } from "date-fns";

interface DrawingRevision {
  id: string;
  revision: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  cad_file_url: string | null;
  cad_file_name: string | null;
  notes: string | null;
  created_at: string;
  uploaded_by: {
    name: string;
  } | null;
}

interface DrawingsListProps {
  revisions: DrawingRevision[];
  currentRevision: string | null;
}

export function DrawingsList({ revisions, currentRevision }: DrawingsListProps) {
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Force download by fetching and creating blob
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  if (revisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
        <FileIcon className="size-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No drawings uploaded yet</p>
        <p className="text-sm text-muted-foreground">
          Upload PDF or image files to start the approval process
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rev</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revisions.map((revision) => (
            <TableRow key={revision.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={revision.revision === currentRevision ? "default" : "secondary"}
                    className="font-mono"
                  >
                    {revision.revision}
                  </Badge>
                  {revision.revision === currentRevision && (
                    <span className="text-xs text-muted-foreground">(Current)</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]" title={revision.file_name}>
                    {revision.file_name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatFileSize(revision.file_size)}
              </TableCell>
              <TableCell className="text-sm">
                {revision.uploaded_by?.name || "Unknown"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(revision.created_at), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                {revision.notes || "-"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => window.open(revision.file_url, "_blank")}
                    >
                      <ExternalLinkIcon className="size-4 mr-2" />
                      View in New Tab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownload(revision.file_url, revision.file_name)}
                    >
                      <DownloadIcon className="size-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    {revision.cad_file_url && revision.cad_file_name && (
                      <DropdownMenuItem
                        onClick={() => handleDownload(revision.cad_file_url!, revision.cad_file_name!)}
                      >
                        <DownloadIcon className="size-4 mr-2" />
                        Download CAD
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
