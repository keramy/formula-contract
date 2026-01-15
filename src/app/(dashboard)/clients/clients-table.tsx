"use client";

import Link from "next/link";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, PencilIcon, TrashIcon, BuildingIcon, MailIcon, PhoneIcon, UserIcon } from "lucide-react";
import { GlassCard, EmptyState, GradientAvatar } from "@/components/ui/ui-helpers";

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={<BuildingIcon className="size-8" />}
          title="No clients found"
          description="Get started by adding your first client to manage relationships."
          action={
            <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
              <Link href="/clients/new">Add Client</Link>
            </Button>
          }
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-gray-100">
            <TableHead className="py-4">Company</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client, index) => (
            <TableRow
              key={client.id}
              className="group hover:bg-gray-50/50 border-b border-gray-50 last:border-0"
            >
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <GradientAvatar name={client.company_name} size="sm" colorIndex={(index + 2) % 8} />
                  <span className="font-medium">{client.company_name}</span>
                </div>
              </TableCell>
              <TableCell>
                {client.contact_person ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="size-4" />
                    {client.contact_person}
                  </div>
                ) : (
                  <span className="text-gray-400 italic">No contact</span>
                )}
              </TableCell>
              <TableCell>
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-teal-600 transition-colors"
                  >
                    <MailIcon className="size-4" />
                    {client.email}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">No email</span>
                )}
              </TableCell>
              <TableCell>
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-teal-600 transition-colors"
                  >
                    <PhoneIcon className="size-4" />
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">No phone</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${client.id}/edit`} className="cursor-pointer">
                        <PencilIcon className="size-4 mr-2" />
                        Edit Client
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                      <TrashIcon className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GlassCard>
  );
}
