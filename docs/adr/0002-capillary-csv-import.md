# Capillary CSV import only

Glowcose can ingest a myDiabby CSV as Readings. Only capillary glucose rows are admitted; CGM, insulin, and other exports are refused. Duplicate live Readings (same Carnet, `takenAt`, `valueMgDl`) are skipped so a second import does not double the log. A Reading is a fingerstick observation — treating a Libre stream as Readings would make today, the chart, and colour bands unreadable.
