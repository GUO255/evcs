ALTER TABLE `site_exploration_site`
  ADD KEY `idx_site_exploration_date_id` (`exploration_date`, `id`),
  ADD KEY `idx_site_exploration_status_date_id` (`status`, `exploration_date`, `id`),
  ADD KEY `idx_site_exploration_team_date_id` (`exploration_team`, `exploration_date`, `id`),
  ADD KEY `idx_site_exploration_city_date_id` (`province_city`, `exploration_date`, `id`);
