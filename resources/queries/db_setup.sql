CREATE TABLE IF NOT EXISTS `stars` (
  `ssid` VARCHAR(64) PRIMARY KEY NOT NULL,
  `rs_level` INT NOT NULL,
  `drs` BOOLEAN NOT NULL,
  `rs_start` DATETIME NOT NULL,
  `rs_end` DATETIME,
  `rs_points` INT,
  `players` INT
);

CREATE TABLE IF NOT EXISTS `participation` (
  `pid` VARCHAR(64) NOT NULL,
  `ssid` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`pid`, `ssid`)
);

CREATE TABLE IF NOT EXISTS `players` (
  `pid` VARCHAR(64) PRIMARY KEY NOT NULL,
  `name` VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS `corporations` (
  `cid` VARCHAR(64) PRIMARY KEY NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `symbol` INT NOT NULL,
  `border` INT NOT NULL,
  `color_1` INT NOT NULL,
  `color_2` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `vars` (
  `key` VARCHAR(64),
  `value` VARCHAR(64),
  PRIMARY KEY (`key`)
);

CREATE TABLE IF NOT EXISTS `white_stars` (
  `ssid` VARCHAR(64) PRIMARY KEY NOT NULL,
  `ws_start` DATETIME NOT NULL,
  `our_id` VARCHAR(64) NOT NULL,
  `opponent_id` VARCHAR(64) NOT NULL,
  `slot` INT NOT NULL,
  `underdog` BOOLEAN NOT NULL,
  `xp_gained` INT,
  `our_score` INT,
  `opponent_score` INT
);

CREATE TABLE IF NOT EXISTS `ws_participation` (
  `pid` VARCHAR(64) NOT NULL,
  `ssid` VARCHAR(64) NOT NULL,
  `opponent` BOOLEAN NOT NULL,
  `index` INT NOT NULL,
  PRIMARY KEY (`pid`, `ssid`)
);

CREATE TABLE IF NOT EXISTS `ws_respawns` (
  `pid` VARCHAR(64) NOT NULL,
  `ship_type` ENUM('transport', 'battleship', 'miner'),
  `respawns_at` DATETIME NOT NULL,
  PRIMARY KEY (`pid`, `ship_type`)
);

ALTER TABLE `participation` ADD FOREIGN KEY (`ssid`) REFERENCES `stars` (`ssid`);

ALTER TABLE `participation` ADD FOREIGN KEY (`pid`) REFERENCES `players` (`pid`);

ALTER TABLE `ws_participation` ADD FOREIGN KEY (`ssid`) REFERENCES `white_stars` (`ssid`);

ALTER TABLE `ws_participation` ADD FOREIGN KEY (`pid`) REFERENCES `players` (`pid`);

ALTER TABLE `white_stars` ADD FOREIGN KEY (`opponent_id`) REFERENCES `corporations` (`cid`);

ALTER TABLE `white_stars` ADD FOREIGN KEY (`our_id`) REFERENCES `corporations` (`cid`);

