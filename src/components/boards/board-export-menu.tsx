"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BoardExportMenuProps = {
  boardId: string;
  align?: "start" | "center" | "end";
};

export function BoardExportMenu({
  boardId,
  align = "end",
}: BoardExportMenuProps) {
  function triggerDownload(format: "csv" | "pdf") {
    window.location.assign(`/api/boards/${boardId}/export?format=${format}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="shrink-0">
          <Download className="size-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Exportar tablero</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            triggerDownload("csv");
          }}
        >
          <FileSpreadsheet className="size-4" />
          Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            triggerDownload("pdf");
          }}
        >
          <FileText className="size-4" />
          Descargar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
