-- =============================================
-- HISTORICAL DATA: 5 DAYS OF WASTE REPORTS & CLEANING TASKS
-- Run this in Supabase SQL Editor
-- =============================================

-- STEP 1: Get bin IDs into variables (we'll use subqueries)
-- This script creates realistic waste patterns over 5 days

-- Clear any old reports and tasks (for clean demo)
DELETE FROM cleaning_tasks;
DELETE FROM waste_reports;
DELETE FROM waste_predictions;

-- Reset all bins to current state
UPDATE bins SET current_fill_percentage = 0, current_severity = 'low', last_cleaned_at = NULL, last_reported_at = NULL;

-- =============================================
-- DAY 1: 4 days ago - Morning patterns
-- =============================================

-- Morning reports (7 AM - 10 AM) - Cafeteria & Hostel bins fill up first
INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  75, 'high', 'Food Waste', 88, b.latitude, b.longitude,
  'Morning cafeteria waste - breakfast leftovers',
  NOW() - INTERVAL '4 days' + INTERVAL '7 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  68, 'medium', 'Mixed Waste', 85, b.latitude, b.longitude,
  'Hostel common room morning waste',
  NOW() - INTERVAL '4 days' + INTERVAL '8 hours'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  82, 'high', 'Food Waste', 90, b.latitude, b.longitude,
  'Cafeteria outside area full after breakfast',
  NOW() - INTERVAL '4 days' + INTERVAL '9 hours'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-02';

-- Afternoon reports (12 PM - 3 PM) - CS, Library fill up
INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  71, 'high', 'Paper & Cardboard', 87, b.latitude, b.longitude,
  'CS lab full of paper cups and printouts',
  NOW() - INTERVAL '4 days' + INTERVAL '13 hours'
FROM bins b WHERE b.bin_code = 'BIN-CS-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  55, 'medium', 'Mixed Waste', 82, b.latitude, b.longitude,
  'Library ground floor moderately full',
  NOW() - INTERVAL '4 days' + INTERVAL '14 hours'
FROM bins b WHERE b.bin_code = 'BIN-LIB-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  90, 'high', 'Food Waste', 92, b.latitude, b.longitude,
  'Cafeteria overflowing after lunch rush',
  NOW() - INTERVAL '4 days' + INTERVAL '13 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-03';

-- Evening (5 PM - 7 PM) - Sports & Garden
INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  65, 'medium', 'Plastic Bottles', 86, b.latitude, b.longitude,
  'Sports complex water bottles after practice',
  NOW() - INTERVAL '4 days' + INTERVAL '17 hours'
FROM bins b WHERE b.bin_code = 'BIN-SPORTS-01';

-- Day 1 Cleaning tasks (completed)
INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  1,
  'Morning cleaning round',
  wr.created_at + INTERVAL '15 minutes',
  wr.created_at + INTERVAL '20 minutes',
  wr.created_at + INTERVAL '30 minutes',
  wr.created_at + INTERVAL '45 minutes',
  15
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '4 days 1 hour'
  AND wr.created_at < NOW() - INTERVAL '3 days 20 hours'
  AND wr.severity = 'high';

INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  2,
  'Afternoon cleaning round',
  wr.created_at + INTERVAL '30 minutes',
  wr.created_at + INTERVAL '35 minutes',
  wr.created_at + INTERVAL '45 minutes',
  wr.created_at + INTERVAL '60 minutes',
  15
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '3 days 12 hours'
  AND wr.created_at < NOW() - INTERVAL '3 days 6 hours'
  AND wr.fill_percentage > 60;

-- =============================================
-- DAY 2: 3 days ago - Similar patterns
-- =============================================

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  80, 'high', 'Food Waste', 89, b.latitude, b.longitude,
  'Cafeteria morning waste again',
  NOW() - INTERVAL '3 days' + INTERVAL '7 hours 45 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  72, 'high', 'Mixed Waste', 86, b.latitude, b.longitude,
  'Hostel bins filling up fast',
  NOW() - INTERVAL '3 days' + INTERVAL '8 hours 15 minutes'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-02';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  85, 'high', 'Food Waste', 91, b.latitude, b.longitude,
  'Lunch rush - cafeteria overloaded',
  NOW() - INTERVAL '3 days' + INTERVAL '13 hours'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  78, 'high', 'Paper & Cardboard', 88, b.latitude, b.longitude,
  'CS department printout waste',
  NOW() - INTERVAL '3 days' + INTERVAL '14 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CS-02';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  60, 'medium', 'Mixed Waste', 84, b.latitude, b.longitude,
  'Main gate area moderately full',
  NOW() - INTERVAL '3 days' + INTERVAL '16 hours'
FROM bins b WHERE b.bin_code = 'BIN-MAIN-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  70, 'medium', 'Plastic Bottles', 85, b.latitude, b.longitude,
  'Sports complex evening waste',
  NOW() - INTERVAL '3 days' + INTERVAL '17 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-SPORTS-02';

-- Day 2 Cleaning tasks
INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  1,
  'Routine morning cleaning',
  wr.created_at + INTERVAL '20 minutes',
  wr.created_at + INTERVAL '25 minutes',
  wr.created_at + INTERVAL '35 minutes',
  wr.created_at + INTERVAL '50 minutes',
  15
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '3 days 1 hour'
  AND wr.created_at < NOW() - INTERVAL '2 days 20 hours';

INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  1,
  'Afternoon cleaning',
  wr.created_at + INTERVAL '25 minutes',
  wr.created_at + INTERVAL '30 minutes',
  wr.created_at + INTERVAL '40 minutes',
  wr.created_at + INTERVAL '55 minutes',
  15
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '2 days 12 hours'
  AND wr.created_at < NOW() - INTERVAL '2 days 6 hours';

-- =============================================
-- DAY 3: 2 days ago
-- =============================================

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  77, 'high', 'Food Waste', 90, b.latitude, b.longitude,
  'Cafeteria breakfast waste filling up',
  NOW() - INTERVAL '2 days' + INTERVAL '8 hours'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  88, 'high', 'Food Waste', 92, b.latitude, b.longitude,
  'Cafeteria outside - overflowing',
  NOW() - INTERVAL '2 days' + INTERVAL '8 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-02';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  65, 'medium', 'Mixed Waste', 84, b.latitude, b.longitude,
  'Hostel girls common room',
  NOW() - INTERVAL '2 days' + INTERVAL '9 hours'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-03';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  92, 'high', 'Food Waste', 93, b.latitude, b.longitude,
  'Lunch rush peak - nearly overflowing',
  NOW() - INTERVAL '2 days' + INTERVAL '13 hours 15 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-03';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  74, 'high', 'Paper & Cardboard', 87, b.latitude, b.longitude,
  'CS lab after assignment deadline',
  NOW() - INTERVAL '2 days' + INTERVAL '15 hours'
FROM bins b WHERE b.bin_code = 'BIN-CS-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  58, 'medium', 'General Waste', 83, b.latitude, b.longitude,
  'Admin block bin filling up',
  NOW() - INTERVAL '2 days' + INTERVAL '15 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-ADMIN-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  68, 'medium', 'Plastic Bottles', 85, b.latitude, b.longitude,
  'Sports area evening waste',
  NOW() - INTERVAL '2 days' + INTERVAL '17 hours 45 minutes'
FROM bins b WHERE b.bin_code = 'BIN-SPORTS-01';

-- Day 3 Cleaning tasks
INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  CASE WHEN wr.severity = 'high' THEN 1 ELSE 2 END,
  'Scheduled cleaning round',
  wr.created_at + INTERVAL '15 minutes',
  wr.created_at + INTERVAL '20 minutes',
  wr.created_at + INTERVAL '30 minutes',
  wr.created_at + INTERVAL '50 minutes',
  20
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '2 days 1 hour'
  AND wr.created_at < NOW() - INTERVAL '1 day';

-- =============================================
-- DAY 4: Yesterday
-- =============================================

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  83, 'high', 'Food Waste', 91, b.latitude, b.longitude,
  'Breakfast waste accumulated overnight',
  NOW() - INTERVAL '1 day' + INTERVAL '7 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  76, 'high', 'Mixed Waste', 88, b.latitude, b.longitude,
  'Boys hostel morning waste',
  NOW() - INTERVAL '1 day' + INTERVAL '8 hours'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  62, 'medium', 'Paper & Cardboard', 84, b.latitude, b.longitude,
  'Library paper waste',
  NOW() - INTERVAL '1 day' + INTERVAL '10 hours'
FROM bins b WHERE b.bin_code = 'BIN-LIB-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  95, 'high', 'Food Waste', 94, b.latitude, b.longitude,
  'Cafeteria lunch peak - urgent cleaning needed',
  NOW() - INTERVAL '1 day' + INTERVAL '13 hours'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  87, 'high', 'Food Waste', 90, b.latitude, b.longitude,
  'Food court completely full',
  NOW() - INTERVAL '1 day' + INTERVAL '13 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-03';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  80, 'high', 'Mixed Waste', 89, b.latitude, b.longitude,
  'CS department busy day',
  NOW() - INTERVAL '1 day' + INTERVAL '14 hours'
FROM bins b WHERE b.bin_code = 'BIN-CS-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  55, 'medium', 'General Waste', 82, b.latitude, b.longitude,
  'Mech workshop waste',
  NOW() - INTERVAL '1 day' + INTERVAL '15 hours'
FROM bins b WHERE b.bin_code = 'BIN-MECH-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  73, 'high', 'Plastic Bottles', 87, b.latitude, b.longitude,
  'Sports area after evening practice',
  NOW() - INTERVAL '1 day' + INTERVAL '18 hours'
FROM bins b WHERE b.bin_code = 'BIN-SPORTS-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  69, 'medium', 'Mixed Waste', 85, b.latitude, b.longitude,
  'Hostel evening waste',
  NOW() - INTERVAL '1 day' + INTERVAL '19 hours'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-02';

-- Day 4 Cleaning tasks
INSERT INTO cleaning_tasks (bin_id, assigned_worker_id, report_id, status, priority, notes, created_at, assigned_at, started_at, completed_at, actual_duration_minutes)
SELECT
  wr.bin_id,
  (SELECT id FROM profiles WHERE role = 'worker' LIMIT 1),
  wr.id,
  'completed',
  CASE WHEN wr.severity = 'high' THEN 1 ELSE 2 END,
  CASE
    WHEN EXTRACT(HOUR FROM wr.created_at) < 10 THEN 'Morning cleaning slot'
    WHEN EXTRACT(HOUR FROM wr.created_at) < 15 THEN 'Afternoon cleaning slot'
    ELSE 'Evening cleaning slot'
  END,
  wr.created_at + INTERVAL '10 minutes',
  wr.created_at + INTERVAL '15 minutes',
  wr.created_at + INTERVAL '25 minutes',
  wr.created_at + INTERVAL '40 minutes',
  15
FROM waste_reports wr
WHERE wr.created_at > NOW() - INTERVAL '1 day 1 hour'
  AND wr.created_at < NOW();

-- =============================================
-- DAY 5: Today's early morning data
-- =============================================

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  45, 'medium', 'Food Waste', 85, b.latitude, b.longitude,
  'Early morning cafeteria - starting to fill',
  NOW() - INTERVAL '3 hours'
FROM bins b WHERE b.bin_code = 'BIN-CAFE-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  38, 'low', 'Mixed Waste', 83, b.latitude, b.longitude,
  'Hostel morning waste starting',
  NOW() - INTERVAL '2 hours 30 minutes'
FROM bins b WHERE b.bin_code = 'BIN-HOSTEL-01';

INSERT INTO waste_reports (bin_id, reporter_id, image_url, fill_percentage, severity, waste_type, ai_confidence, latitude, longitude, notes, created_at)
SELECT b.id, (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  'https://tvtbgtdntxkhdxjtltmc.supabase.co/storage/v1/object/public/waste-images/sample-report.jpg',
  30, 'low', 'Paper & Cardboard', 81, b.latitude, b.longitude,
  'CS department opening time',
  NOW() - INTERVAL '2 hours'
FROM bins b WHERE b.bin_code = 'BIN-CS-01';

-- Update bins to current fill levels (today's data)
UPDATE bins SET
  current_fill_percentage = 45,
  current_severity = 'medium',
  last_reported_at = NOW() - INTERVAL '3 hours'
WHERE bin_code = 'BIN-CAFE-01';

UPDATE bins SET
  current_fill_percentage = 38,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '2 hours 30 minutes'
WHERE bin_code = 'BIN-HOSTEL-01';

UPDATE bins SET
  current_fill_percentage = 30,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '2 hours'
WHERE bin_code = 'BIN-CS-01';

UPDATE bins SET
  current_fill_percentage = 25,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '4 hours'
WHERE bin_code = 'BIN-CAFE-02';

UPDATE bins SET
  current_fill_percentage = 35,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '3 hours'
WHERE bin_code = 'BIN-CAFE-03';

UPDATE bins SET
  current_fill_percentage = 20,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '5 hours'
WHERE bin_code = 'BIN-SPORTS-01';

UPDATE bins SET
  current_fill_percentage = 15,
  current_severity = 'low',
  last_reported_at = NOW() - INTERVAL '6 hours'
WHERE bin_code = 'BIN-HOSTEL-02';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Count all data
SELECT 'waste_reports' as table_name, COUNT(*) as total FROM waste_reports
UNION ALL
SELECT 'cleaning_tasks', COUNT(*) FROM cleaning_tasks
UNION ALL
SELECT 'bins with data', COUNT(*) FROM bins WHERE last_reported_at IS NOT NULL;

-- Show daily report summary
SELECT
  DATE(created_at) as report_date,
  COUNT(*) as total_reports,
  ROUND(AVG(fill_percentage)::numeric, 0) as avg_fill,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_count
FROM waste_reports
GROUP BY DATE(created_at)
ORDER BY report_date;
