-- Update the create_default_gantt_phases trigger to insert a Procurement phase
-- for new projects, rename Design/Shipping to their new display names, and
-- backfill existing projects with a Procurement phase item.
--
-- Display label conventions:
--   design       → "Design/Shopdrawing"
--   production   → "Production"
--   procurement  → "Procurement"
--   shipping     → "Shipment"
--   installation → "Installation"

CREATE OR REPLACE FUNCTION public.create_default_gantt_phases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gantt_items (project_id, name, item_type, phase_key, parent_id, sort_order, start_date, end_date, color)
  VALUES
    (NEW.id, 'Design/Shopdrawing', 'phase', 'design',       NULL, 1, CURRENT_DATE, CURRENT_DATE, '#0d9488'),
    (NEW.id, 'Production',         'phase', 'production',   NULL, 2, CURRENT_DATE, CURRENT_DATE, '#3b82f6'),
    (NEW.id, 'Procurement',        'phase', 'procurement',  NULL, 3, CURRENT_DATE, CURRENT_DATE, '#f97316'),
    (NEW.id, 'Shipment',           'phase', 'shipping',     NULL, 4, CURRENT_DATE, CURRENT_DATE, '#64748b'),
    (NEW.id, 'Installation',       'phase', 'installation', NULL, 5, CURRENT_DATE, CURRENT_DATE, '#16a34a');
  RETURN NEW;
END;
$$;

-- Rename existing phase items to new display labels
UPDATE public.gantt_items SET name = 'Design/Shopdrawing'
  WHERE item_type = 'phase' AND phase_key = 'design' AND name = 'Design';
UPDATE public.gantt_items SET name = 'Shipment'
  WHERE item_type = 'phase' AND phase_key = 'shipping' AND name = 'Shipping';

-- Shift sort_order to make room for Procurement at position 3
UPDATE public.gantt_items SET sort_order = 4
  WHERE item_type = 'phase' AND phase_key = 'shipping' AND sort_order = 3;
UPDATE public.gantt_items SET sort_order = 5
  WHERE item_type = 'phase' AND phase_key = 'installation' AND sort_order = 4;

-- Backfill Procurement for projects missing it
INSERT INTO public.gantt_items (project_id, name, item_type, phase_key, parent_id, sort_order, start_date, end_date, color)
SELECT p.id, 'Procurement', 'phase', 'procurement', NULL, 3, CURRENT_DATE, CURRENT_DATE, '#f97316'
FROM public.projects p
WHERE p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM public.gantt_items gi
    WHERE gi.project_id = p.id
      AND gi.item_type = 'phase'
      AND gi.phase_key = 'procurement'
  );

-- Canonicalize phase item colors to match the design system
UPDATE public.gantt_items SET color = '#0d9488' WHERE item_type = 'phase' AND phase_key = 'design';
UPDATE public.gantt_items SET color = '#3b82f6' WHERE item_type = 'phase' AND phase_key = 'production';
UPDATE public.gantt_items SET color = '#64748b' WHERE item_type = 'phase' AND phase_key = 'shipping';
UPDATE public.gantt_items SET color = '#16a34a' WHERE item_type = 'phase' AND phase_key = 'installation';
