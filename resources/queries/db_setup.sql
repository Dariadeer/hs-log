CREATE DATABASE IF NOT EXISTS hs_log;

use hs_log;

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

ALTER TABLE `participation` ADD FOREIGN KEY (`ssid`) REFERENCES `stars` (`ssid`);

ALTER TABLE `participation` ADD FOREIGN KEY (`pid`) REFERENCES `players` (`pid`);
