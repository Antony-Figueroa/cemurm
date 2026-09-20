-- Seed the scale_catalog with all scales and modes needed for music theory (Hito 4).
-- Uses ON CONFLICT DO NOTHING so re-running is safe.

-- ── Root scales ──────────────────────────────────────────────────────────────

INSERT INTO scale_catalog (id, name, aliases, intervals, parent_scale_id, rotation, cardinality) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Major',          ARRAY['Ionian'],                     ARRAY[0,2,4,5,7,9,11],   NULL, NULL, 7),
  ('a0000000-0000-0000-0000-000000000002', 'Natural Minor',  ARRAY['Aeolian'],                    ARRAY[0,2,3,5,7,8,10],   NULL, NULL, 7),
  ('a0000000-0000-0000-0000-000000000003', 'Harmonic Minor', ARRAY[]::text[],                             ARRAY[0,2,3,5,7,8,11],   NULL, NULL, 7),
  ('a0000000-0000-0000-0000-000000000004', 'Melodic Minor',  ARRAY['Jazz Minor'],                 ARRAY[0,2,3,5,7,9,11],   NULL, NULL, 7),
  ('a0000000-0000-0000-0000-000000000005', 'Pentatonic Major', ARRAY['Major Pentatonic'],          ARRAY[0,2,4,7,9],        NULL, NULL, 5),
  ('a0000000-0000-0000-0000-000000000006', 'Pentatonic Minor', ARRAY['Minor Pentatonic','Blues Pentatonic'], ARRAY[0,3,5,7,10], NULL, NULL, 5),
  ('a0000000-0000-0000-0000-000000000007', 'Chromatic',       ARRAY[]::text[],                             ARRAY[0,1,2,3,4,5,6,7,8,9,10,11], NULL, NULL, 12)
ON CONFLICT (id) DO NOTHING;

-- ── Modes of Major (Ionian rotations) ────────────────────────────────────────

INSERT INTO scale_catalog (id, name, aliases, intervals, parent_scale_id, rotation, cardinality) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Dorian',         ARRAY[]::text[],  ARRAY[0,2,3,5,7,9,10],  'a0000000-0000-0000-0000-000000000001', 1, 7),
  ('b0000000-0000-0000-0000-000000000002', 'Phrygian',       ARRAY[]::text[],  ARRAY[0,1,3,5,7,8,10],  'a0000000-0000-0000-0000-000000000001', 2, 7),
  ('b0000000-0000-0000-0000-000000000003', 'Lydian',         ARRAY[]::text[],  ARRAY[0,2,4,6,7,9,11],  'a0000000-0000-0000-0000-000000000001', 3, 7),
  ('b0000000-0000-0000-0000-000000000004', 'Mixolydian',     ARRAY[]::text[],  ARRAY[0,2,4,5,7,9,10],  'a0000000-0000-0000-0000-000000000001', 4, 7),
  ('b0000000-0000-0000-0000-000000000005', 'Locrian',        ARRAY[]::text[],  ARRAY[0,1,3,5,6,8,10],  'a0000000-0000-0000-0000-000000000001', 6, 7)
ON CONFLICT (id) DO NOTHING;

-- ── Modes of Harmonic Minor ──────────────────────────────────────────────────

INSERT INTO scale_catalog (id, name, aliases, intervals, parent_scale_id, rotation, cardinality) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Locrian #6',              ARRAY[]::text[],  ARRAY[0,1,3,5,6,8,11],  'a0000000-0000-0000-0000-000000000003', 0, 7),
  ('c0000000-0000-0000-0000-000000000002', 'Ultralocrian',            ARRAY['Super Locrian bb7'], ARRAY[0,1,3,4,6,8,10], 'a0000000-0000-0000-0000-000000000003', 1, 7),
  ('c0000000-0000-0000-0000-000000000003', 'Ionian Augmented',        ARRAY[]::text[],  ARRAY[0,2,4,6,8,9,11],  'a0000000-0000-0000-0000-000000000003', 2, 7),
  ('c0000000-0000-0000-0000-000000000004', 'Dorian #4',              ARRAY['Dorian #11'],        ARRAY[0,2,3,6,7,9,10],  'a0000000-0000-0000-0000-000000000003', 3, 7),
  ('c0000000-0000-0000-0000-000000000005', 'Phrygian Dominant',      ARRAY['Spanish','Hijaz','Freygish','Española'], ARRAY[0,1,4,5,7,8,10], 'a0000000-0000-0000-0000-000000000003', 4, 7),
  ('c0000000-0000-0000-0000-000000000006', 'Lydian #2',              ARRAY['Lydian Augmented #2'], ARRAY[0,3,4,6,7,9,11], 'a0000000-0000-0000-0000-000000000003', 5, 7),
  ('c0000000-0000-0000-0000-000000000007', 'Ultraphrygian',          ARRAY[]::text[],  ARRAY[0,1,3,4,6,8,9],   'a0000000-0000-0000-0000-000000000003', 6, 7)
ON CONFLICT (id) DO NOTHING;

-- ── Modes of Melodic Minor (ascending) ───────────────────────────────────────

INSERT INTO scale_catalog (id, name, aliases, intervals, parent_scale_id, rotation, cardinality) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Melodic Minor (ascending)', ARRAY['Jazzy Minor'], ARRAY[0,2,3,5,7,9,11], 'a0000000-0000-0000-0000-000000000004', 0, 7),
  ('d0000000-0000-0000-0000-000000000002', 'Dorian b2',               ARRAY['Phrygian #6','Dorian b9'], ARRAY[0,1,3,5,7,9,10], 'a0000000-0000-0000-0000-000000000004', 1, 7),
  ('d0000000-0000-0000-0000-000000000003', 'Lydian Augmented',        ARRAY['Lydian #5'],     ARRAY[0,2,4,6,8,9,11],  'a0000000-0000-0000-0000-000000000004', 2, 7),
  ('d0000000-0000-0000-0000-000000000004', 'Lydian Dominant',         ARRAY['Lydian b7','Overtone'], ARRAY[0,2,4,6,7,9,10], 'a0000000-0000-0000-0000-000000000004', 3, 7),
  ('d0000000-0000-0000-0000-000000000005', 'Mixolydian b6',          ARRAY['Hindu','Aeolian Dominant'], ARRAY[0,2,4,5,7,8,10], 'a0000000-0000-0000-0000-000000000004', 4, 7),
  ('d0000000-0000-0000-0000-000000000006', 'Locrian #2',             ARRAY['Half-diminished'], ARRAY[0,2,3,5,6,8,10],  'a0000000-0000-0000-0000-000000000004', 5, 7),
  ('d0000000-0000-0000-0000-000000000007', 'Altered',                ARRAY['Altered Dominant','Super Locrian'], ARRAY[0,1,3,4,6,8,10], 'a0000000-0000-0000-0000-000000000004', 6, 7)
ON CONFLICT (id) DO NOTHING;
