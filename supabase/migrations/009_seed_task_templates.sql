-- Seed task templates — system-wide defaults, no funeral_home_id

-- Full Burial (14 tasks)
INSERT INTO task_templates (service_type, sort_order, title, category, confirmation_hint, due_days_before) VALUES
  ('full-burial', 1,  'Casket ordered',                      'Merchandise',    'Vendor name & order number',             7),
  ('full-burial', 2,  'Vault ordered',                       'Merchandise',    'Vendor name & order number',             7),
  ('full-burial', 3,  'Cemetery contacted & burial scheduled','Cemetery',       'Contact name & confirmation date',       5),
  ('full-burial', 4,  'Flowers ordered',                     'Merchandise',    'Florist name & order number',            3),
  ('full-burial', 5,  'Programs designed',                   'Print',          'Designed by & family approval date',     4),
  ('full-burial', 6,  'Programs printed',                    'Print',          'Printer name & quantity received',       1),
  ('full-burial', 7,  'Obituary written',                    'Communication',  'Written by & family approval date',      4),
  ('full-burial', 8,  'Obituary submitted to newspaper',     'Communication',  'Publication name & run date',            3),
  ('full-burial', 9,  'Death certificates ordered',          'Legal',          'Quantity ordered & expected receipt date',5),
  ('full-burial', 10, 'Tent & chairs setup confirmed',       'Cemetery',       'Confirmed by & setup time',              2),
  ('full-burial', 11, 'Viewing room prepared',               'Facility',       'Prepared by & ready time',               1),
  ('full-burial', 12, 'Clergy / officiant confirmed',        'Arrangements',   'Name & contact number',                  3),
  ('full-burial', 13, 'Pallbearers confirmed',               'Arrangements',   'Count & names confirmed',                2),
  ('full-burial', 14, 'Family notified of service details',  'Communication',  'Notified by, method & date',             1);

-- Graveside Only (10 tasks)
INSERT INTO task_templates (service_type, sort_order, title, category, confirmation_hint, due_days_before) VALUES
  ('graveside', 1,  'Vault ordered',                         'Merchandise',    'Vendor name & order number',             7),
  ('graveside', 2,  'Cemetery contacted & burial scheduled', 'Cemetery',       'Contact name & confirmation date',       5),
  ('graveside', 3,  'Flowers ordered',                       'Merchandise',    'Florist name & order number',            3),
  ('graveside', 4,  'Tent & chairs setup confirmed',         'Cemetery',       'Confirmed by & setup time',              2),
  ('graveside', 5,  'Programs designed & printed',           'Print',          'Printer name & quantity received',       2),
  ('graveside', 6,  'Obituary written & submitted',          'Communication',  'Publication name & run date',            3),
  ('graveside', 7,  'Death certificates ordered',            'Legal',          'Quantity ordered & expected receipt date',5),
  ('graveside', 8,  'Clergy / officiant confirmed',          'Arrangements',   'Name & contact number',                  3),
  ('graveside', 9,  'Pallbearers confirmed',                 'Arrangements',   'Count & names confirmed',                2),
  ('graveside', 10, 'Family notified of service details',    'Communication',  'Notified by, method & date',             1);

-- Cremation (9 tasks)
INSERT INTO task_templates (service_type, sort_order, title, category, confirmation_hint, due_days_before) VALUES
  ('cremation', 1, 'Cremation authorization signed',          'Legal',          'Signed by (next of kin) & date',              7),
  ('cremation', 2, 'Crematory scheduled',                     'Arrangements',   'Crematory name & scheduled date / time',       5),
  ('cremation', 3, 'Urn selected',                            'Merchandise',    'Urn model, vendor & order number',             5),
  ('cremation', 4, 'Memorial flowers ordered',                'Merchandise',    'Florist name & order number',                  3),
  ('cremation', 5, 'Programs designed & printed',             'Print',          'Printer name & quantity received',             2),
  ('cremation', 6, 'Obituary written & submitted',            'Communication',  'Publication name & run date',                  3),
  ('cremation', 7, 'Death certificates ordered',              'Legal',          'Quantity ordered & expected receipt date',      5),
  ('cremation', 8, 'Cremation completed & remains received',  'Arrangements',   'Date received & confirmation reference',        3),
  ('cremation', 9, 'Family notified of final details',        'Communication',  'Notified by, method & date',                   1);

-- Military Honors (14 tasks)
INSERT INTO task_templates (service_type, sort_order, title, category, confirmation_hint, due_days_before) VALUES
  ('military', 1,  'Casket ordered',                          'Merchandise',    'Vendor name & order number',             7),
  ('military', 2,  'Vault ordered',                           'Merchandise',    'Vendor name & order number',             7),
  ('military', 3,  'VA burial benefits verified',             'Military',       'Benefits confirmed & VA reference number',7),
  ('military', 4,  'Honor guard requested & confirmed',       'Military',       'Unit contact name & confirmation number', 7),
  ('military', 5,  'Cemetery contacted & burial scheduled',   'Cemetery',       'Contact name & confirmation date',       5),
  ('military', 6,  'Flowers ordered',                         'Merchandise',    'Florist name & order number',            3),
  ('military', 7,  'Flag ceremony details confirmed',         'Military',       'Confirmed by & ceremony details',        3),
  ('military', 8,  'Programs designed & printed',             'Print',          'Printer name & quantity received',       2),
  ('military', 9,  'Obituary written & submitted',            'Communication',  'Publication name & run date',            3),
  ('military', 10, 'Death certificates ordered',              'Legal',          'Quantity ordered & expected receipt date',5),
  ('military', 11, 'Tent & chairs setup confirmed',           'Cemetery',       'Confirmed by & setup time',              2),
  ('military', 12, 'Clergy / officiant confirmed',            'Arrangements',   'Name & contact number',                  3),
  ('military', 13, 'Pallbearers confirmed',                   'Arrangements',   'Count & names confirmed',                2),
  ('military', 14, 'Family notified of service details',      'Communication',  'Notified by, method & date',             1);
