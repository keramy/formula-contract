-- ============================================================================
-- Migration 050: CRM Seed Data
--
-- Pre-loads 37 brands, 12 architecture firms, brand-firm links,
-- and 5 initial opportunities from market research.
-- Uses DO block with UUID variables for cross-table references.
-- ============================================================================

DO $$
DECLARE
  -- Brand UUIDs (luxury tier)
  v_lv UUID; v_chanel UUID; v_dior UUID; v_gucci UUID; v_hermes UUID;
  v_prada UUID; v_saint_laurent UUID; v_fendi UUID; v_bottega UUID;
  v_bulgari UUID; v_tiffany UUID; v_cartier UUID; v_burberry UUID;
  v_valentino UUID; v_givenchy UUID; v_celine UUID; v_loewe UUID;
  v_miu_miu UUID; v_balenciaga UUID; v_tom_ford UUID;
  -- Brand UUIDs (mid-luxury tier)
  v_skims UUID; v_vuori UUID; v_alo UUID; v_lululemon UUID;
  v_massimo UUID; v_cos UUID; v_mango UUID; v_other_stories UUID;
  v_sandro UUID; v_maje UUID; v_coach UUID; v_tory UUID;
  v_mk UUID; v_hugo UUID; v_ralph UUID; v_kate UUID; v_stuart UUID;
  -- Firm UUIDs
  v_peter_marino UUID; v_househam UUID; v_carbondale UUID; v_rdai UUID;
  v_cigue UUID; v_yabu UUID; v_chipperfield UUID; v_curiosity UUID;
  v_fobert UUID; v_vudafieri UUID; v_sofield UUID; v_universal UUID;
BEGIN
  -- ========================================================================
  -- LUXURY BRANDS (20)
  -- ========================================================================
  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Louis Vuitton', 'LVMH', 'luxury', 'Fashion', 550, '10-15/yr', false, 'Paris, France', 'high')
  RETURNING id INTO v_lv;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Chanel', 'Independent', 'luxury', 'Fashion', 600, '8-10/yr', true, 'Paris, France', 'high')
  RETURNING id INTO v_chanel;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Dior', 'LVMH', 'luxury', 'Fashion', 550, '12-15/yr', false, 'Paris, France', 'medium')
  RETURNING id INTO v_dior;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Gucci', 'Kering', 'luxury', 'Fashion', 500, '8-12/yr', true, 'Florence, Italy', 'medium')
  RETURNING id INTO v_gucci;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Hermès', 'Independent', 'luxury', 'Fashion/Leather', 300, '5-8/yr', false, 'Paris, France', 'medium')
  RETURNING id INTO v_hermes;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Prada', 'Prada Group', 'luxury', 'Fashion', 635, '10-12/yr', false, 'Milan, Italy', 'medium')
  RETURNING id INTO v_prada;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Saint Laurent', 'Kering', 'luxury', 'Fashion', 270, '8-10/yr', false, 'Paris, France', 'medium')
  RETURNING id INTO v_saint_laurent;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Fendi', 'LVMH', 'luxury', 'Fashion', 215, '8-10/yr', true, 'Rome, Italy', 'medium')
  RETURNING id INTO v_fendi;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Bottega Veneta', 'Kering', 'luxury', 'Fashion/Leather', 290, '6-8/yr', true, 'Vicenza, Italy', 'medium')
  RETURNING id INTO v_bottega;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Bulgari', 'LVMH', 'luxury', 'Jewelry', 350, '10-15/yr', false, 'Rome, Italy', 'low')
  RETURNING id INTO v_bulgari;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Tiffany & Co.', 'LVMH', 'luxury', 'Jewelry', 300, '8-10/yr', false, 'New York, USA', 'low')
  RETURNING id INTO v_tiffany;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Cartier', 'Richemont', 'luxury', 'Jewelry', 280, '8-10/yr', false, 'Paris, France', 'low')
  RETURNING id INTO v_cartier;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Burberry', 'Independent', 'luxury', 'Fashion', 400, '5-8/yr', true, 'London, UK', 'low')
  RETURNING id INTO v_burberry;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Valentino', 'Kering', 'luxury', 'Fashion', 225, '5-8/yr', true, 'Rome, Italy', 'low')
  RETURNING id INTO v_valentino;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Givenchy', 'LVMH', 'luxury', 'Fashion', 90, '5-8/yr', true, 'Paris, France', 'low')
  RETURNING id INTO v_givenchy;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Celine', 'LVMH', 'luxury', 'Fashion', 230, '8-10/yr', false, 'Paris, France', 'medium')
  RETURNING id INTO v_celine;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Loewe', 'LVMH', 'luxury', 'Fashion', 200, '10-15/yr', false, 'Madrid, Spain', 'medium')
  RETURNING id INTO v_loewe;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Miu Miu', 'Prada Group', 'luxury', 'Fashion', 180, '8-10/yr', false, 'Milan, Italy', 'low')
  RETURNING id INTO v_miu_miu;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Balenciaga', 'Kering', 'luxury', 'Fashion', 220, '5-8/yr', false, 'Paris, France', 'low')
  RETURNING id INTO v_balenciaga;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, cd_changed_recently, headquarters, priority)
  VALUES ('Tom Ford', 'Estée Lauder', 'luxury', 'Fashion', 130, '5-8/yr', true, 'New York, USA', 'low')
  RETURNING id INTO v_tom_ford;

  -- ========================================================================
  -- MID-LUXURY BRANDS (17)
  -- ========================================================================
  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('SKIMS', 'Independent', 'mid_luxury', 'DTC/Fast-Growing', 22, '16+/yr', 'Los Angeles, USA', 'high')
  RETURNING id INTO v_skims;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Vuori', 'Independent', 'mid_luxury', 'DTC/Fast-Growing', 85, '25/yr', 'Encinitas, USA', 'high')
  RETURNING id INTO v_vuori;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Alo Yoga', 'Independent', 'mid_luxury', 'DTC/Fast-Growing', 66, '15-20/yr', 'Los Angeles, USA', 'medium')
  RETURNING id INTO v_alo;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Lululemon', 'Independent', 'mid_luxury', 'DTC/Fast-Growing', 700, '40-45/yr', 'Vancouver, Canada', 'medium')
  RETURNING id INTO v_lululemon;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Massimo Dutti', 'Inditex', 'mid_luxury', 'Premium Fashion', 700, '10-15/yr', 'Barcelona, Spain', 'high')
  RETURNING id INTO v_massimo;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('COS', 'H&M Group', 'mid_luxury', 'Premium Fashion', 300, '15-20/yr', 'London, UK', 'medium')
  RETURNING id INTO v_cos;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Mango', 'Independent', 'mid_luxury', 'Premium Fashion', 2700, '30-40/yr', 'Barcelona, Spain', 'medium')
  RETURNING id INTO v_mango;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('& Other Stories', 'H&M Group', 'mid_luxury', 'Premium Fashion', 80, '8-10/yr', 'Stockholm, Sweden', 'low')
  RETURNING id INTO v_other_stories;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Sandro', 'SMCP', 'mid_luxury', 'Premium Fashion', 400, '10-15/yr', 'Paris, France', 'low')
  RETURNING id INTO v_sandro;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Maje', 'SMCP', 'mid_luxury', 'Premium Fashion', 400, '10-15/yr', 'Paris, France', 'low')
  RETURNING id INTO v_maje;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Coach', 'Tapestry', 'bridge', 'Bridge Luxury', 900, '15-20/yr', 'New York, USA', 'high')
  RETURNING id INTO v_coach;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Tory Burch', 'Independent', 'bridge', 'Bridge Luxury', 300, '8-10/yr', 'New York, USA', 'medium')
  RETURNING id INTO v_tory;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Michael Kors', 'Capri Holdings', 'bridge', 'Bridge Luxury', 800, '5-10/yr', 'New York, USA', 'low')
  RETURNING id INTO v_mk;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Hugo Boss', 'Independent', 'bridge', 'Bridge Luxury', 1200, '10-15/yr', 'Metzingen, Germany', 'medium')
  RETURNING id INTO v_hugo;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Ralph Lauren', 'Independent', 'bridge', 'Bridge Luxury', 500, '8-10/yr', 'New York, USA', 'high')
  RETURNING id INTO v_ralph;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Kate Spade', 'Tapestry', 'bridge', 'Bridge Luxury', 400, '8-10/yr', 'New York, USA', 'low')
  RETURNING id INTO v_kate;

  INSERT INTO crm_brands (name, parent_group, tier, segment, store_count, expansion_rate, headquarters, priority)
  VALUES ('Stuart Weitzman', 'Tapestry', 'bridge', 'Bridge Luxury', 100, '3-5/yr', 'New York, USA', 'low')
  RETURNING id INTO v_stuart;

  -- ========================================================================
  -- ARCHITECTURE FIRMS (12)
  -- ========================================================================
  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Peter Marino Architect', 'New York, NY', 'Luxury retail, flagship stores', 'Chanel, LV, Dior, Fendi, Bulgari, Zegna', 'none', 'high')
  RETURNING id INTO v_peter_marino;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Househam Henderson', 'London, UK', 'Luxury retail interiors', 'Ralph Lauren, Hermès', 'warm', 'high')
  RETURNING id INTO v_househam;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Carbondale', 'Paris, France', 'Luxury retail architecture', 'LV, Celine, Dolce & Gabbana', 'none', 'high')
  RETURNING id INTO v_carbondale;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('RDAI (Rena Dumas)', 'Paris, France', 'Hermès exclusive architect', 'Hermès (exclusive)', 'none', 'medium')
  RETURNING id INTO v_rdai;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Ciguë', 'Paris, France', 'Contemporary luxury retail', 'Saint Laurent, Celine, Jacquemus', 'none', 'medium')
  RETURNING id INTO v_cigue;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Yabu Pushelberg', 'Toronto / New York', 'Luxury retail and hospitality', 'Tiffany, Lane Crawford, Edition Hotels', 'none', 'medium')
  RETURNING id INTO v_yabu;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('David Chipperfield Architects', 'London / Berlin', 'High-end retail and cultural', 'Valentino, Bally', 'none', 'medium')
  RETURNING id INTO v_chipperfield;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Gwenael Nicolas (Curiosity)', 'Tokyo, Japan', 'Asian luxury retail', 'LV Japan, TAG Heuer, Fendi', 'none', 'low')
  RETURNING id INTO v_curiosity;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Jamie Fobert Architects', 'London, UK', 'UK luxury retail', 'Selfridges, Mulberry', 'none', 'low')
  RETURNING id INTO v_fobert;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Vudafieri-Saverino Partners', 'Milan, Italy', 'Italian luxury retail', 'Dolce & Gabbana, Coccinelle', 'none', 'low')
  RETURNING id INTO v_vudafieri;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Studio Sofield', 'New York, NY', 'American luxury retail', 'Tom Ford, Bottega Veneta, Gucci', 'none', 'medium')
  RETURNING id INTO v_sofield;

  INSERT INTO crm_architecture_firms (name, location, specialty, key_clients, connection_strength, priority)
  VALUES ('Universal Design Studio', 'London, UK', 'Modern retail and hospitality', 'COS, Ace Hotel, Mulberry', 'none', 'low')
  RETURNING id INTO v_universal;

  -- ========================================================================
  -- BRAND-FIRM LINKS
  -- ========================================================================
  INSERT INTO crm_brand_firm_links (brand_id, architecture_firm_id, relationship_type) VALUES
    (v_chanel, v_peter_marino, 'Primary architect'),
    (v_lv, v_peter_marino, 'Primary architect'),
    (v_dior, v_peter_marino, 'Primary architect'),
    (v_fendi, v_peter_marino, 'Primary architect'),
    (v_bulgari, v_peter_marino, 'Primary architect'),
    (v_ralph, v_househam, 'Primary architect'),
    (v_hermes, v_househam, 'Secondary architect'),
    (v_lv, v_carbondale, 'Secondary architect'),
    (v_celine, v_carbondale, 'Primary architect'),
    (v_hermes, v_rdai, 'Exclusive architect'),
    (v_saint_laurent, v_cigue, 'Primary architect'),
    (v_celine, v_cigue, 'Secondary architect'),
    (v_tiffany, v_yabu, 'Primary architect'),
    (v_valentino, v_chipperfield, 'Primary architect'),
    (v_tom_ford, v_sofield, 'Primary architect'),
    (v_bottega, v_sofield, 'Secondary architect'),
    (v_gucci, v_sofield, 'Secondary architect'),
    (v_cos, v_universal, 'Primary architect');

  -- ========================================================================
  -- INITIAL OPPORTUNITIES (5)
  -- ========================================================================
  INSERT INTO crm_opportunities (title, description, brand_id, stage, estimated_value, currency, probability, priority, source) VALUES
    ('Florentia Village — Store Fit-outs', 'Multi-brand outlet village in Turkey. Potential for multiple store fit-outs across luxury brands.', NULL, 'researched', 500000.00, 'EUR', 15, 'high', 'Turkey Local'),
    ('Ralph Lauren — Relationship Expansion', 'Expand existing RL relationship into new store renovation cycle. Househam Henderson warm connection.', v_ralph, 'contacted', 300000.00, 'USD', 30, 'high', 'Existing Client'),
    ('SKIMS — New Store Rollout', 'SKIMS opening 16+ stores/year. Fast-growing DTC brand with high millwork needs.', v_skims, 'researched', 200000.00, 'USD', 10, 'high', 'Market Research'),
    ('Vuori — Global Expansion', 'Vuori expanding 25 stores/year globally. Premium athleisure with quality millwork needs.', v_vuori, 'researched', 150000.00, 'USD', 10, 'high', 'Market Research'),
    ('Coach — Store Renovation Cycle', 'Coach in active store renovation cycle. 900 stores, 15-20 new/renovated per year.', v_coach, 'researched', 250000.00, 'USD', 15, 'medium', 'Market Research');

END $$;
