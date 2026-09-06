CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`loanApplicationId` int,
	`actorId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`reason` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(20) NOT NULL,
	`authorityLimit` decimal(12,2) NOT NULL DEFAULT '10000.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`nationalId` varchar(60),
	`occupation` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loanApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`clientId` int NOT NULL,
	`createdBy` int NOT NULL,
	`product` enum('business','individual','group','salary') NOT NULL,
	`principal` decimal(12,2) NOT NULL,
	`termMonths` int NOT NULL,
	`status` enum('submitted','under_review','approved','rejected','disbursed','active','completed') NOT NULL DEFAULT 'submitted',
	`securityType` enum('none','guarantor','collateral') NOT NULL DEFAULT 'none',
	`securityVerified` int NOT NULL DEFAULT 0,
	`decisionReason` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`disbursedAt` timestamp,
	`totalInterest` decimal(12,2),
	`totalRepayable` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loanApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanApplicationId` int NOT NULL,
	`branchId` int NOT NULL,
	`recordedBy` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidAt` timestamp NOT NULL,
	`reference` varchar(80) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `repayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','loan_officer','credit_committee','branch_manager','finance_collections','compliance','general_manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `branchId` int;