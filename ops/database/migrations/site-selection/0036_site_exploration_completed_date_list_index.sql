ALTER TABLE `site_exploration_site`
  DROP KEY `idx_site_exploration_date_updated`,
  ADD KEY `idx_site_exploration_date_status_updated` (`exploration_date`, `status`, `updated_at`, `id`);
