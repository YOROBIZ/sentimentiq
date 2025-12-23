-- SEED DATA for InsightAI Pro V2

-- 1. Insert Feedbacks
INSERT INTO feedbacks (id, hotel_id, customer_name, raw_content, source) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'HTL-PARIS-01', 'Sophie Martin', 'Le service était impeccable, mais la chambre un peu bruyante.', 'web_form'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'HTL-PARIS-01', 'Jean Dupont', 'Petit déjeuner incroyable ! Je reviendrai.', 'mobile_app'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'HTL-PARIS-01', 'Alice Cooper', 'Attente interminable au check-in, inacceptable.', 'email'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'HTL-NICE-04', 'Marc Lavoine', 'Vue magnifique sur la mer. Personnel charmant.', 'web_form'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'HTL-NICE-04', 'Julie Zenatti', 'La climatisation ne marchait pas.', 'tripadvisor');
  -- (Adding 5 representative rows for brevity in this artifact, imagine 15 more similar ones)

-- 2. Insert Analysis Results (Linked to Feedbacks)
-- Running 'textblob_v1' model
INSERT INTO analysis_results (feedback_id, model_provider, model_version, sentiment, score, confidence, keywords) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'textblob_lite', 'v1.0.0', 'NEUTRAL', 0.15, 0.80, ARRAY['service', 'chambre', 'bruit']),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'textblob_lite', 'v1.0.0', 'POSITIVE', 0.90, 0.95, ARRAY['petit déjeuner', 'retour']),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'textblob_lite', 'v1.0.0', 'NEGATIVE', -0.85, 0.90, ARRAY['check-in', 'attente']),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'textblob_lite', 'v1.0.0', 'POSITIVE', 0.80, 0.75, ARRAY['vue', 'mer', 'personnel']),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'textblob_lite', 'v1.0.0', 'NEGATIVE', -0.60, 0.99, ARRAY['climatisation', 'panne']);

-- 3. Simulate a "Re-run" with a better model (GPT-4) on the same data
INSERT INTO analysis_results (feedback_id, model_provider, model_version, sentiment, score, confidence, keywords) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4-turbo', '2024-04-01', 'POSITIVE', 0.30, 0.95, ARRAY['service:excellent', 'chambre:bruyante']);
