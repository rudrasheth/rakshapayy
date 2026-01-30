-- Allow anyone to insert into scam_reports (for Demo)
DROP POLICY IF EXISTS "Users can insert reports" ON scam_reports;
CREATE POLICY "Public insert reports" ON scam_reports FOR INSERT WITH CHECK (true);

-- Allow anyone to insert into transactions (for Demo)
CREATE POLICY "Public insert transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Allow reading transactions
CREATE POLICY "Public read transactions" ON transactions FOR SELECT USING (true);
