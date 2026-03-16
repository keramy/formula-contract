"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateContact,
  useUpdateContact,
  useBrands,
  useFirms,
} from "@/lib/react-query/crm";
import { contactSchema } from "@/lib/validations/crm";
import type { ContactFormData } from "@/lib/validations/crm";
import { RELATIONSHIP_STATUSES } from "@/types/crm";
import type { CrmContactWithRelations, RelationshipStatus } from "@/types/crm";
import { Loader2Icon } from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const NONE_VALUE = "__none__";

const CONTACT_FORM_DEFAULTS: ContactFormData = {
  first_name: "",
  last_name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  linkedin_url: "",
  brand_id: null,
  architecture_firm_id: null,
  relationship_status: "identified",
  source: "",
  notes: "",
};

// ============================================================================
// Props
// ============================================================================

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: CrmContactWithRelations | null;
}

// ============================================================================
// Component
// ============================================================================

export function ContactSheet({
  open,
  onOpenChange,
  contact,
}: ContactSheetProps) {
  const isEditing = !!contact;
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: brands } = useBrands();
  const { data: firms } = useFirms();
  const isPending = createContact.isPending || updateContact.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: CONTACT_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (contact) {
      reset({
        first_name: contact.first_name,
        last_name: contact.last_name,
        title: contact.title ?? "",
        company: contact.company ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        linkedin_url: contact.linkedin_url ?? "",
        brand_id: contact.brand_id,
        architecture_firm_id: contact.architecture_firm_id,
        relationship_status: contact.relationship_status,
        source: contact.source ?? "",
        notes: contact.notes ?? "",
      });
    } else {
      reset(CONTACT_FORM_DEFAULTS);
    }
  }, [contact, reset]);

  function onSubmit(data: ContactFormData): void {
    const payload: Record<string, unknown> = {
      ...data,
      title: data.title || null,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      linkedin_url: data.linkedin_url || null,
      brand_id: data.brand_id || null,
      architecture_firm_id: data.architecture_firm_id || null,
      source: data.source || null,
      notes: data.notes || null,
    };

    if (isEditing) {
      updateContact.mutate(
        { id: contact.id, input: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createContact.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  const relationshipValue = watch("relationship_status");
  const brandIdValue = watch("brand_id");
  const firmIdValue = watch("architecture_firm_id");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Contact" : "New Contact"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update contact details below."
              : "Fill in the details to create a new contact."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4">
          {/* First Name + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first-name">First Name *</Label>
              <Input
                id="contact-first-name"
                placeholder="e.g. John"
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last-name">Last Name *</Label>
              <Input
                id="contact-last-name"
                placeholder="e.g. Smith"
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-title">Title</Label>
            <Input
              id="contact-title"
              placeholder="e.g. Design Director"
              {...register("title")}
            />
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-company">Company</Label>
            <Input
              id="contact-company"
              placeholder="e.g. Gensler"
              {...register("company")}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="john@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                placeholder="+1 555 123 4567"
                {...register("phone")}
              />
            </div>
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
            <Input
              id="contact-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/..."
              {...register("linkedin_url")}
            />
            {errors.linkedin_url && (
              <p className="text-xs text-destructive">
                {errors.linkedin_url.message}
              </p>
            )}
          </div>

          {/* Brand + Firm */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select
                value={brandIdValue ?? NONE_VALUE}
                onValueChange={(val) =>
                  setValue("brand_id", val === NONE_VALUE ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Architecture Firm</Label>
              <Select
                value={firmIdValue ?? NONE_VALUE}
                onValueChange={(val) =>
                  setValue(
                    "architecture_firm_id",
                    val === NONE_VALUE ? null : val
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select firm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {firms?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relationship Status */}
          <div className="space-y-1.5">
            <Label>Relationship Status</Label>
            <Select
              value={relationshipValue}
              onValueChange={(val) =>
                setValue("relationship_status", val as RelationshipStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-source">Source</Label>
            <Input
              id="contact-source"
              placeholder="e.g. LinkedIn, Referral, Trade Show"
              {...register("source")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea
              id="contact-notes"
              placeholder="Additional notes..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2Icon className="size-4 mr-1 animate-spin" />
              )}
              {isEditing ? "Update Contact" : "Create Contact"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
