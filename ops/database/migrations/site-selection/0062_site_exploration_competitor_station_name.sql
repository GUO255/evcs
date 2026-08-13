UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[0].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 0;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[1].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 1;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[2].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 2;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[3].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 3;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[4].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 4;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[5].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 5;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[6].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 6;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[7].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 7;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[8].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 8;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[9].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 9;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[10].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 10;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[11].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 11;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[12].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 12;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[13].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 13;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[14].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 14;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[15].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 15;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[16].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 16;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[17].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 17;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[18].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 18;

UPDATE `site_exploration_site`
SET `competitors` = JSON_SET(`competitors`, '$[19].stationName', '')
WHERE JSON_LENGTH(`competitors`) > 19;
